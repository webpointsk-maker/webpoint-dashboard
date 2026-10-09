"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { fail, str, type ActionResult } from "@/lib/form";
import { deleteEvent, pushTaskToCalendar } from "@/lib/google/calendar";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { z } from "zod";
import { getClients, getPackages, getProfiles } from "@/lib/data";
import { DraftTaskSchema, MAX_INPUT_CHARS, planTasksWithAI, type DraftTask } from "@/lib/ai/task-planner";

export async function saveTask(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return fail("Názov tasku je povinný");

  const dueDate = str(formData, "due_date");
  const row = {
    title,
    description: str(formData, "description"),
    client_id: str(formData, "client_id"),
    status: (str(formData, "status") ?? "todo") as TaskStatus,
    priority: (str(formData, "priority") ?? "medium") as TaskPriority,
    due_date: dueDate,
    due_time: dueDate ? str(formData, "due_time") : null,
    assignee_id: str(formData, "assignee_id"),
  };

  const res = id
    ? await supabase.from("tasks").update(row).eq("id", id).select("id").single()
    : await supabase.from("tasks").insert(row).select("id").single();
  if (res.error) return fail(res.error);

  const taskId = res.data.id as string;
  after(() => pushTaskToCalendar(taskId));
  revalidatePath("/", "layout");
  return { ok: true, id: taskId };
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) return fail(error);
  after(() => pushTaskToCalendar(id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("tasks").select("google_event_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return fail(error);
  if (data?.google_event_id) {
    const eventId = data.google_event_id as string;
    after(() => deleteEvent(eventId));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// AI asistent
// ---------------------------------------------------------------------------

export async function planTasks(text: string, defaultClientId?: string | null) {
  await requireMember();
  const input = text.trim();
  if (!input) return { ok: false as const, error: "Napíš, čo treba urobiť." };
  if (input.length > MAX_INPUT_CHARS) return { ok: false as const, error: `Text je príliš dlhý (max ${MAX_INPUT_CHARS} znakov).` };
  const [clients, packages, profiles] = await Promise.all([getClients(), getPackages(), getProfiles()]);
  return planTasksWithAI(input, { clients, packages, profiles, defaultClientId });
}

export async function createTasks(drafts: DraftTask[]): Promise<ActionResult & { count?: number }> {
  const { supabase } = await requireMember();
  const parsed = z.array(DraftTaskSchema).min(1).max(50).safeParse(drafts);
  if (!parsed.success) return fail("Neplatné tasky");

  const rows = parsed.data.map((t) => ({
    title: t.title,
    description: t.description,
    client_id: t.client_id,
    due_date: t.due_date,
    due_time: t.due_date ? t.due_time : null,
    priority: t.priority,
    assignee_id: t.assignee_id,
  }));
  const { data, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error) return fail(error);

  const ids = (data ?? []).map((r) => r.id as string);
  after(async () => {
    for (const id of ids) await pushTaskToCalendar(id);
  });
  revalidatePath("/", "layout");
  return { ok: true, count: ids.length };
}
