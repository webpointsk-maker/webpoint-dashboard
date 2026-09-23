import { todayISO } from "@/lib/format";
import type { Client, Installment, Payment, PaymentStatus } from "@/lib/types";

/** Stav platby s ohľadom na dnešný dátum (aj keď cron ešte neoznačil po splatnosti). */
export function effectiveStatus(p: Pick<Payment, "status" | "due_date">): PaymentStatus {
  if (p.status === "pending" && p.due_date < todayISO()) return "overdue";
  return p.status;
}

/** Súhrnný stav viacerých platieb (splátok) za mesiac */
export function combinedStatus(payments: Pick<Payment, "status" | "due_date">[]): PaymentStatus | null {
  if (!payments.length) return null;
  const statuses = payments.map(effectiveStatus);
  if (statuses.includes("overdue")) return "overdue";
  if (statuses.includes("pending")) return "pending";
  return "paid";
}

/** Očakávané platby klienta za mesiac – podľa splátok alebo jedna platba */
export function expectedInstallments(client: Pick<Client, "payment_schedule" | "billing_day">, price: number): Installment[] {
  if (client.payment_schedule?.length) return client.payment_schedule;
  return price > 0 ? [{ day: client.billing_day, amount: price }] : [];
}

export function dueDateFor(period: string, day: number) {
  return `${period.slice(0, 8)}${String(Math.min(28, Math.max(1, day))).padStart(2, "0")}`;
}
