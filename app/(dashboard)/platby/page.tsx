import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { GeneratePaymentsButton } from "@/components/payments/generate-button";
import { PaymentsGrid, type GridClient } from "@/components/payments/payments-grid";
import { clientPrice, getClients, getPackages, getPayments } from "@/lib/data";
import { addMonthsISO, formatEur, formatMonth, monthStartISO } from "@/lib/format";
import { effectiveStatus } from "@/lib/payments";

export const metadata = { title: "Platby · WebPoint" };

const MONTHS = 6;

export default async function PaymentsPage(props: PageProps<"/platby">) {
  const { do: toParam } = await props.searchParams;
  const current = monthStartISO();
  const last = typeof toParam === "string" && /^\d{4}-\d{2}$/.test(toParam) ? `${toParam}-01` : current;
  const months = Array.from({ length: MONTHS }, (_, i) => addMonthsISO(last, i - MONTHS + 1));

  const [clients, packages, payments, currentPayments] = await Promise.all([
    getClients(),
    getPackages(),
    getPayments({ from: months[0], to: months[months.length - 1] }),
    getPayments({ from: current, to: current }),
  ]);

  const withPayments = new Set(payments.map((p) => p.client_id));
  const gridClients: GridClient[] = clients
    .filter((c) => c.status === "active" || withPayments.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, price: clientPrice(c, packages), billingDay: c.billing_day, schedule: c.payment_schedule }));

  const sum = (status: string) =>
    currentPayments.filter((p) => effectiveStatus(p) === status).reduce((s, p) => s + Number(p.amount), 0);
  const expected = currentPayments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Platby" description="Mesačné paušály klientov – klikni na stav a zmeň ho">
        <GeneratePaymentsButton period={current} />
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={Wallet} tone="blue" label={`Očakávané · ${formatMonth(current)}`} value={formatEur(expected)} />
        <KpiCard icon={CheckCircle2} tone="green" label="Zaplatené" value={formatEur(sum("paid"))} />
        <KpiCard icon={Clock} tone="orange" label="Čaká na úhradu" value={formatEur(sum("pending"))} />
        <KpiCard icon={AlertTriangle} tone={sum("overdue") ? "red" : "neutral"} label="Po splatnosti" value={formatEur(sum("overdue"))} />
      </div>

      <div className="mb-3 flex items-center justify-end gap-1">
        <Link href={`/platby?do=${addMonthsISO(last, -MONTHS).slice(0, 7)}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Staršie">
          <ChevronLeft />
        </Link>
        <Link href="/platby" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Aktuálne
        </Link>
        <Link href={`/platby?do=${addMonthsISO(last, MONTHS).slice(0, 7)}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Novšie">
          <ChevronRight />
        </Link>
      </div>

      <PaymentsGrid clients={gridClients} months={months} payments={payments} />
    </>
  );
}
