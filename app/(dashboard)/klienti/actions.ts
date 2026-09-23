"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { fail, list, num, str, type ActionResult } from "@/lib/form";
import type { ClientStatus } from "@/lib/types";

export async function saveClient(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return fail("Názov klienta je povinný");

  const schedule =
    formData.get("has_schedule") === "on"
      ? formData
          .getAll("schedule_day")
          .map((d, i) => ({ day: Number(d), amount: Number(String(formData.getAll("schedule_amount")[i] ?? "").replace(",", ".")) }))
          .filter((s) => s.day >= 1 && s.day <= 28 && s.amount > 0)
      : [];

  const row = {
    name,
    contact_person: str(formData, "contact_person"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    ico: str(formData, "ico"),
    website: str(formData, "website"),
    status: (str(formData, "status") ?? "active") as ClientStatus,
    package_id: str(formData, "package_id"),
    custom_price: schedule.length ? schedule.reduce((s, i) => s + i.amount, 0) : num(formData, "custom_price"),
    payment_schedule: schedule.length ? schedule : null,
    start_date: str(formData, "start_date"),
    billing_day: Math.min(28, Math.max(1, num(formData, "billing_day") ?? 15)),
    platforms: list(formData, "platforms"),
    assigned_to: str(formData, "assigned_to"),
    notes: str(formData, "notes"),
  };

  const res = id
    ? await supabase.from("clients").update(row).eq("id", id).select("id").single()
    : await supabase.from("clients").insert(row).select("id").single();
  if (res.error) return fail(res.error);

  revalidatePath("/", "layout");
  return { ok: true, id: res.data.id };
}

export async function updateClientNotes(id: string, notes: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("clients").update({ notes: notes.trim() || null }).eq("id", id);
  if (error) return fail(error);
  revalidatePath(`/klienti/${id}`);
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { data: tasks } = await supabase.from("tasks").select("google_event_id").eq("client_id", id).not("google_event_id", "is", null);
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return fail(error);
  if (tasks?.length) {
    const { deleteEvent } = await import("@/lib/google/calendar");
    await Promise.all(tasks.map((t) => deleteEvent(t.google_event_id!)));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
