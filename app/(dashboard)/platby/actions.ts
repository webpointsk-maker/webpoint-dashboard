"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { fail, num, str, type ActionResult } from "@/lib/form";
import { todayISO } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";

export async function generatePayments(period: string): Promise<ActionResult & { count?: number }> {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("generate_payments", { p_period: period });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, count: data as number };
}

export async function setPaymentStatus(id: string, status: PaymentStatus): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase
    .from("payments")
    .update({ status, paid_at: status === "paid" ? todayISO() : null })
    .eq("id", id);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function savePayment(formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const id = str(formData, "id");
  const amount = num(formData, "amount");
  const dueDate = str(formData, "due_date");
  if (amount == null || !dueDate) return fail("Suma a splatnosť sú povinné");
  const status = (str(formData, "status") ?? "pending") as PaymentStatus;
  const row = {
    amount,
    due_date: dueDate,
    status,
    paid_at: status === "paid" ? (str(formData, "paid_at") ?? todayISO()) : null,
    note: str(formData, "note"),
  };

  const res = id
    ? await supabase.from("payments").update(row).eq("id", id)
    : await supabase.from("payments").insert({ ...row, client_id: str(formData, "client_id"), period: str(formData, "period") });
  if (res.error) return fail(res.error.code === "23505" ? "Platba za tento mesiac už existuje" : res.error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true };
}
