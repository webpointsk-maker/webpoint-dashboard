import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    .map((c) => ({ id: c.id, name: c.name, price: clientPrice(c, packages), billingDay: c.billing_day }));

  const sum = (status: string) =>
    currentPayments.filter((p) => effectiveStatus(p) === status).reduce((s, p) => s + Number(p.amount), 0);
  const expected = currentPayments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Platby" description="Mesačné paušály klientov – klikni na stav a zmeň ho">
        <GeneratePaymentsButton period={current} />
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Očakávané · ${formatMonth(current)}`} value={formatEur(expected)} />
        <Stat label="Zaplatené" value={formatEur(sum("paid"))} tone="text-emerald-600 dark:text-emerald-400" />
        <Stat label="Čaká na úhradu" value={formatEur(sum("pending"))} tone="text-amber-600 dark:text-amber-400" />
        <Stat label="Po splatnosti" value={formatEur(sum("overdue"))} tone="text-red-600 dark:text-red-400" />
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
