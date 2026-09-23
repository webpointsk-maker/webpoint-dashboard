"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { fail, str, type ActionResult } from "@/lib/form";
import { deleteEvent, pushTaskToCalendar } from "@/lib/google/calendar";
import type { TaskPriority, TaskStatus } from "@/lib/types";

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
