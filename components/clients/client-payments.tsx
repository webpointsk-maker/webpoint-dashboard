"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/payments/payment-dialog";
import { PaymentStatusMenu } from "@/components/payments/payment-status-menu";
import { formatDate, formatEur, formatMonth, monthStartISO } from "@/lib/format";
import type { Payment } from "@/lib/types";

export function ClientPayments({ clientId, clientName, payments, price, billingDay }: { clientId: string; clientName: string; payments: Payment[]; price: number; billingDay: number }) {
  const [editing, setEditing] = useState<Payment | null>(null);
  const [creating, setCreating] = useState(false);
  const current = monthStartISO();
  const hasCurrent = payments.some((p) => p.period === current);

  return (
    <div className="grid gap-3">
      {!hasCurrent ? (
        <Button size="sm" variant="outline" className="justify-self-start" onClick={() => setCreating(true)}>
          <Plus /> Platba za {formatMonth(current)}
        </Button>
      ) : null}
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatiaľ žiadne platby.</p>
      ) : (
        <ul className="divide-y">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium capitalize">{formatMonth(p.period)}</p>
                <p className="text-xs text-muted-foreground">
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
      {creating ? (
        <PaymentDialog
          onOpenChange={setCreating}
          clientName={clientName}
          draft={{ clientId, period: current, amount: price, dueDate: `${current.slice(0, 8)}${String(billingDay).padStart(2, "0")}` }}
        />
      ) : null}
    </div>
  );
}
