"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PaymentDialog } from "./payment-dialog";
import { PaymentStatusMenu } from "./payment-status-menu";
import { createExpectedPayments } from "@/app/(dashboard)/platby/actions";
import { formatEur, formatMonth, monthStartISO } from "@/lib/format";
import { dueDateFor } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { Installment, Payment } from "@/lib/types";

export type GridClient = { id: string; name: string; price: number; billingDay: number; schedule: Installment[] | null };

type Dialog = { payment?: Payment; draft?: { clientId: string; period: string; amount: number; dueDate: string }; clientName: string } | null;

export function PaymentsGrid({ clients, months, payments }: { clients: GridClient[]; months: string[]; payments: Payment[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const current = monthStartISO();

  function addForMonth(c: GridClient, period: string) {
    if (c.price <= 0) {
      setDialog({ clientName: c.name, draft: { clientId: c.id, period, amount: 0, dueDate: dueDateFor(period, c.billingDay) } });
      return;
    }
    const key = `${c.id}:${period}`;
    setPendingCell(key);
    startTransition(async () => {
      const res = await createExpectedPayments(c.id, period);
      setPendingCell(null);
      if (res.ok) toast.success(res.count && res.count > 1 ? `Vytvorené ${res.count} splátky` : "Platba vytvorená");
      else toast.error(res.error);
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">Klient</th>
              {months.map((m) => (
                <th
                  key={m}
                  className={cn(
                    "px-2 py-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                    m === current && "text-brand-orange",
                  )}
                >
                  {formatMonth(m, true)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={months.length + 1} className="py-12 text-center text-muted-foreground">
                  Žiadni aktívni klienti s paušálom
                </td>
              </tr>
            ) : null}
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.02]">
                <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                  <Link href={`/klienti/${c.id}`} className="font-medium hover:text-brand-orange">
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {c.price ? `${formatEur(c.price)} / mes.` : "bez paušálu"}
                    {c.schedule?.length ? ` · ${c.schedule.length} splátky` : ""}
                  </div>
                </td>
                {months.map((m) => {
                  const cell = payments.filter((x) => x.client_id === c.id && x.period === m).sort((a, b) => a.installment - b.installment);
                  return (
                    <td key={m} className={cn("px-2 py-2.5 text-center", m === current && "bg-brand-orange/[0.03]")}>
                      {cell.length ? (
                        <div className="flex flex-col items-center gap-1">
                          {cell.map((p) => (
                            <PaymentStatusMenu key={p.id} payment={p} showAmount onEdit={() => setDialog({ payment: p, clientName: c.name })} />
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addForMonth(c, m)}
                          disabled={pendingCell === `${c.id}:${m}`}
                          className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-brand-orange/15 hover:text-brand-orange disabled:animate-pulse"
                          aria-label="Pridať platbu"
                        >
                          <Plus className="size-4" />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog ? <PaymentDialog onOpenChange={(o) => !o && setDialog(null)} {...dialog} /> : null}
    </>
  );
}
