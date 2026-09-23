import { todayISO } from "@/lib/format";
import type { Payment, PaymentStatus } from "@/lib/types";

/** Stav platby s ohľadom na dnešný dátum (aj keď cron ešte neoznačil po splatnosti). */
export function effectiveStatus(p: Pick<Payment, "status" | "due_date">): PaymentStatus {
  if (p.status === "pending" && p.due_date < todayISO()) return "overdue";
  return p.status;
}
