"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PaymentDialog } from "./payment-dialog";
import { PaymentStatusMenu } from "./payment-status-menu";
import { formatEur, formatMonth, monthStartISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Payment } from "@/lib/types";

export type GridClient = { id: string; name: string; price: number; billingDay: number };

type Dialog = { payment?: Payment; draft?: { clientId: string; period: string; amount: number; dueDate: string }; clientName: string } | null;

export function PaymentsGrid({ clients, months, payments }: { clients: GridClient[]; months: string[]; payments: Payment[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const current = monthStartISO();

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/95 px-3 py-2 text-left font-medium">Klient</th>
              {months.map((m) => (
                <th key={m} className={cn("px-2 py-2 text-center font-medium capitalize", m === current && "text-primary")}>
                  {formatMonth(m, true)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={months.length + 1} className="py-10 text-center text-muted-foreground">
                  Žiadni aktívni klienti s paušálom
                </td>
              </tr>
            ) : null}
            {clients.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background px-3 py-2">
                  <Link href={`/klienti/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-xs text-muted-foreground tabular-nums">{c.price ? `${formatEur(c.price)} / mes.` : "bez paušálu"}</div>
                </td>
                {months.map((m) => {
                  const p = payments.find((x) => x.client_id === c.id && x.period === m);
                  return (
                    <td key={m} className="px-2 py-2 text-center">
                      {p ? (
                        <PaymentStatusMenu payment={p} showAmount onEdit={() => setDialog({ payment: p, clientName: c.name })} />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setDialog({
                              clientName: c.name,
                              draft: { clientId: c.id, period: m, amount: c.price, dueDate: `${m.slice(0, 8)}${String(c.billingDay).padStart(2, "0")}` },
                            })
                          }
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-foreground"
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
