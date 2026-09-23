"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deletePayment, setPaymentStatus } from "@/app/(dashboard)/platby/actions";
import { PAYMENT_STATUS } from "@/lib/constants";
import { formatDate, formatEur } from "@/lib/format";
import { effectiveStatus } from "@/lib/payments";
import { cn } from "@/lib/utils";
import type { Payment, PaymentStatus } from "@/lib/types";

export function PaymentStatusMenu({ payment, onEdit, showAmount }: { payment: Payment; onEdit?: () => void; showAmount?: boolean }) {
  const [pending, startTransition] = useTransition();
  const status = effectiveStatus(payment);

  function set(s: PaymentStatus) {
    startTransition(async () => {
      const res = await setPaymentStatus(payment.id, s);
      if (res.ok) toast.success(`Platba: ${PAYMENT_STATUS[s].label.toLowerCase()}`);
      else toast.error(res.error);
    });
  }

  function remove() {
    if (!confirm("Zmazať túto platbu?")) return;
    startTransition(async () => {
      const res = await deletePayment(payment.id);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex min-w-20 flex-col items-center rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all hover:brightness-125",
          PAYMENT_STATUS[status].className,
          pending && "opacity-50",
        )}
        title={`${payment.installment > 1 ? `${payment.installment}. splátka · ` : ""}Splatnosť ${formatDate(payment.due_date)}${payment.paid_at ? ` · zaplatené ${formatDate(payment.paid_at)}` : ""}`}
      >
        <span>{PAYMENT_STATUS[status].label}</span>
        {showAmount ? (
          <span className="font-normal tabular-nums opacity-80">
            {formatEur(payment.amount)} · {formatDate(payment.due_date, { day: "numeric", month: "numeric" })}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {(["paid", "pending", "overdue"] as PaymentStatus[]).map((s) => (
          <DropdownMenuItem key={s} onClick={() => set(s)} disabled={payment.status === s}>
            <span className={cn("size-2 rounded-full", PAYMENT_STATUS[s].className)} />
            {PAYMENT_STATUS[s].label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {onEdit ? <DropdownMenuItem onClick={onEdit}>Upraviť sumu / poznámku</DropdownMenuItem> : null}
        <DropdownMenuItem variant="destructive" onClick={remove}>
          Zmazať platbu
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
