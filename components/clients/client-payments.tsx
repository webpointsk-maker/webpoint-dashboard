"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { PaymentStatusMenu } from "@/components/payments/payment-status-menu";
import { createExpectedPayments } from "@/app/(dashboard)/platby/actions";
import { formatDate, formatEur, formatMonth, monthStartISO } from "@/lib/format";
import { dueDateFor } from "@/lib/payments";
import type { Payment } from "@/lib/types";

export function ClientPayments({
  clientId,
  clientName,
  payments,
  price,
  billingDay,
  hasSchedule,
}: {
  clientId: string;
  clientName: string;
  payments: Payment[];
  price: number;
  billingDay: number;
  hasSchedule: boolean;
}) {
  const [editing, setEditing] = useState<Payment | null>(null);
  const [manual, setManual] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = monthStartISO();
  const hasCurrent = payments.some((p) => p.period === current);

  function addCurrent() {
    if (price <= 0) return setManual(true);
    startTransition(async () => {
      const res = await createExpectedPayments(clientId, current);
      if (res.ok) toast.success("Platba vytvorená");
      else toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {!hasCurrent ? (
          <Button size="sm" onClick={addCurrent} disabled={pending}>
            <Plus /> Platba za {formatMonth(current)}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => setManual(true)}>
          <Plus /> Iná platba
        </Button>
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatiaľ žiadne platby.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">
                  {formatMonth(p.period)}
                  {hasSchedule || p.installment > 1 ? <span className="font-normal text-muted-foreground normal-case"> · {p.installment}. splátka</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatEur(p.amount, true)} · splatnosť {formatDate(p.due_date)}
                  {p.note ? ` · ${p.note}` : ""}
                </p>
              </div>
              <PaymentStatusMenu payment={p} onEdit={() => setEditing(p)} />
            </li>
          ))}
        </ul>
      )}
      {editing ? <PaymentDialog onOpenChange={(o) => !o && setEditing(null)} clientName={clientName} payment={editing} /> : null}
      {manual ? (
        <PaymentDialog
          onOpenChange={setManual}
          clientName={clientName}
          draft={{ clientId, period: current, amount: price, dueDate: dueDateFor(current, billingDay) }}
        />
      ) : null}
    </div>
  );
}
