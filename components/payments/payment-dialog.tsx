"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Field } from "@/components/field";
import { savePayment } from "@/app/(dashboard)/platby/actions";
import { PAYMENT_STATUS } from "@/lib/constants";
import { formatMonth } from "@/lib/format";
import type { Payment } from "@/lib/types";

type Props = {
  onOpenChange: (open: boolean) => void;
  clientName: string;
  payment?: Payment | null;
  /** pre novú platbu */
  draft?: { clientId: string; period: string; amount: number; dueDate: string };
};

export function PaymentDialog({ onOpenChange, clientName, payment, draft }: Props) {
  const [pending, startTransition] = useTransition();
  const period = payment?.period ?? draft?.period ?? "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await savePayment(fd);
      if (res.ok) {
        toast.success("Platba uložená");
        onOpenChange(false);
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {clientName} · {period ? formatMonth(period) : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {payment ? <input type="hidden" name="id" value={payment.id} /> : null}
          {draft ? (
            <>
              <input type="hidden" name="client_id" value={draft.clientId} />
              <input type="hidden" name="period" value={draft.period} />
            </>
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Suma (€)" htmlFor="amount">
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required defaultValue={payment?.amount ?? draft?.amount} />
            </Field>
            <Field label="Splatnosť" htmlFor="due_date">
              <Input id="due_date" name="due_date" type="date" required defaultValue={payment?.due_date ?? draft?.dueDate} />
            </Field>
            <Field label="Stav" htmlFor="status">
              <NativeSelect id="status" name="status" defaultValue={payment?.status ?? "pending"}>
                {Object.entries(PAYMENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Zaplatené dňa" htmlFor="paid_at">
              <Input id="paid_at" name="paid_at" type="date" defaultValue={payment?.paid_at ?? ""} />
            </Field>
          </div>
          <Field label="Poznámka" htmlFor="note">
            <Input id="note" name="note" defaultValue={payment?.note ?? ""} placeholder="napr. faktúra 2026-014" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušiť
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Ukladám…" : "Uložiť"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
