"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { fail, list, num, str, type ActionResult } from "@/lib/form";
import { pullCalendarChanges } from "@/lib/google/calendar";
import { createAdminClient } from "@/lib/supabase/admin";

export async function savePackage(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!name) return fail("Názov balíka je povinný");
  const row = {
    name,
    monthly_price: num(formData, "monthly_price") ?? 0,
    description: str(formData, "description"),
    posts_per_month: num(formData, "posts_per_month"),
    platforms: list(formData, "platforms"),
    is_active: formData.get("is_active") !== "off",
  };
  const res = id ? await supabase.from("packages").update(row).eq("id", id) : await supabase.from("packages").insert(row);
  if (res.error) return fail(res.error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePackage(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("packages").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

async function requireAdmin() {
  const ctx = await requireMember();
  if (ctx.profile.role !== "admin") throw new Error("Len pre administrátora");
  return ctx;
}

export async function addTeamMember(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const email = str(formData, "email")?.toLowerCase();
    if (!email || !email.includes("@")) return fail("Zadaj platný email");
    const role = str(formData, "role") === "admin" ? "admin" : "member";
    const { error } = await supabase.from("allowed_emails").upsert({ email, role });
    if (error) return fail(error);
    revalidatePath("/nastavenia");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeTeamMember(email: string): Promise<ActionResult> {
  try {
    const { supabase, profile } = await requireAdmin();
    if (email.toLowerCase() === profile.email.toLowerCase()) return fail("Nemôžeš odstrániť sám seba");
    const { error } = await supabase.from("allowed_emails").delete().eq("email", email);
    if (error) return fail(error);
    // Profil odstránime cez admin klienta, aby stratil prístup okamžite
    await createAdminClient().from("profiles").delete().ilike("email", email);
    revalidatePath("/nastavenia");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function syncCalendarNow(): Promise<ActionResult & { message?: string }> {
  await requireMember();
  try {
    const stats = await pullCalendarChanges();
    if (!stats) return fail("Google Kalendár nie je pripojený");
    revalidatePath("/", "layout");
    return { ok: true, message: `Aktualizované: ${stats.updated}, nové: ${stats.created}, odpojené: ${stats.unlinked}` };
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectGoogle(): Promise<ActionResult> {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    await admin.from("google_connection").delete().eq("id", 1);
    await admin.from("tasks").update({ google_event_id: null }).not("google_event_id", "is", null);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
