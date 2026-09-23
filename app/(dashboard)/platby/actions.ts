"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { fail, num, str, type ActionResult } from "@/lib/form";
import { todayISO } from "@/lib/format";
import { clientPrice } from "@/lib/data";
import { dueDateFor, expectedInstallments } from "@/lib/payments";
import type { Client, Package, PaymentStatus } from "@/lib/types";

export async function generatePayments(period: string): Promise<ActionResult & { count?: number }> {
  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("generate_payments", { p_period: period });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, count: data as number };
}

/** Vytvorí očakávané platby (vrátane splátok) jedného klienta za daný mesiac */
export async function createExpectedPayments(clientId: string, period: string): Promise<ActionResult & { count?: number }> {
  const { supabase } = await requireMember();
  const [{ data: client }, { data: packages }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("packages").select("*"),
  ]);
  if (!client) return fail("Klient neexistuje");
  const c = client as Client;
  const rows = expectedInstallments(c, clientPrice(c, (packages ?? []) as Package[])).map((i, idx) => ({
    client_id: clientId,
    period,
    installment: idx + 1,
    amount: i.amount,
    due_date: dueDateFor(period, i.day),
  }));
  if (!rows.length) return fail("Klient nemá nastavenú cenu");
  const { error } = await supabase.from("payments").upsert(rows, { onConflict: "client_id,period,installment", ignoreDuplicates: true });
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return { ok: true, count: rows.length };
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

  let res;
  if (id) {
    res = await supabase.from("payments").update(row).eq("id", id);
  } else {
    const clientId = str(formData, "client_id");
    const month = str(formData, "period_month");
    const period = str(formData, "period") ?? (month ? `${month}-01` : null);
    if (!clientId || !period) return fail("Chýba klient alebo mesiac");
    const { data: existing } = await supabase.from("payments").select("installment").eq("client_id", clientId).eq("period", period);
    const installment = Math.max(0, ...(existing ?? []).map((p) => p.installment as number)) + 1;
    res = await supabase.from("payments").insert({ ...row, client_id: clientId, period, installment });
  }
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
