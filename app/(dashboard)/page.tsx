import Link from "next/link";
import { after } from "next/server";
import { AlertTriangle, CalendarClock, CheckCircle2, Euro, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { StatusPill } from "@/components/status-badge";
import { KpiCard } from "@/components/kpi-card";
import { TaskList } from "@/components/tasks/task-list";
import { clientPrice, getClients, getPackages, getPayments, getProfiles, getTasks } from "@/lib/data";
import { listPrimaryEvents, maybePullCalendarChanges } from "@/lib/google/calendar";
import { requireMember } from "@/lib/auth";
import { CLIENT_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { addDaysISO, formatDate, formatEur, formatMonth, monthStartISO, todayISO } from "@/lib/format";
import { effectiveStatus } from "@/lib/payments";

export const metadata = { title: "Prehľad · WebPoint" };

export default async function DashboardPage() {
  after(() => maybePullCalendarChanges());
  const { profile } = await requireMember();
  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);
  const month = monthStartISO();

  const [clients, packages, profiles, tasks, payments, events] = await Promise.all([
    getClients(),
    getPackages(),
    getProfiles(),
    getTasks({ openOnly: true }),
    getPayments({ from: addDaysISO(month, -365) }),
    listPrimaryEvents(today, today),
  ]);

  const active = clients.filter((c) => c.status === "active");
  const mrr = active.reduce((s, c) => s + clientPrice(c, packages), 0);
  const pipeline = clients.filter((c) => c.status === "lead" || c.status === "onboarding");

  const monthPayments = payments.filter((p) => p.period === month);
  const paidThisMonth = monthPayments.filter((p) => p.status === "paid");
  const unpaid = payments
    .map((p) => ({ ...p, eff: effectiveStatus(p) }))
    .filter((p) => p.eff !== "paid")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const overdue = unpaid.filter((p) => p.eff === "overdue");
  const overdueSum = overdue.reduce((s, p) => s + Number(p.amount), 0);

  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today);
  const todayTasks = tasks.filter((t) => t.due_date === today);
  const weekTasks = tasks.filter((t) => t.due_date && t.due_date > today && t.due_date <= weekEnd);
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const firstName = (profile.full_name ?? "").split(" ")[0];

  return (
    <>
      <div className="mb-8">
        <p className="text-sm font-medium text-brand-orange capitalize">
          {new Intl.DateTimeFormat("sk-SK", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Bratislava" }).format(new Date())}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Ahoj{firstName ? <>, <span className="text-brand-gradient">{firstName}</span></> : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu je prehľad klientov, deadlinov a platieb.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard tone="blue" icon={Users} label="Aktívni klienti" value={String(active.length)} hint={pipeline.length ? `+ ${pipeline.length} v skúšobnej dobe / leady` : undefined} href="/klienti" />
        <KpiCard tone="orange" icon={Euro} label="Mesačný príjem (MRR)" value={formatEur(mrr)} hint={`zaplatené ${paidThisMonth.length}/${monthPayments.length} za ${formatMonth(month, true)}`} href="/platby" />
        <KpiCard
          icon={AlertTriangle}
          label="Po splatnosti"
          value={formatEur(overdueSum)}
          hint={overdue.length ? `${overdue.length} ${overdue.length === 1 ? "platba" : overdue.length < 5 ? "platby" : "platieb"}` : "všetko v poriadku"}
          tone={overdue.length ? "red" : "green"}
          href="/platby"
        />
        <KpiCard
          icon={CalendarClock}
          label="Tasky po termíne"
          value={String(overdueTasks.length)}
          hint={`${todayTasks.length} dnes · ${weekTasks.length} tento týždeň`}
          tone={overdueTasks.length ? "red" : "neutral"}
          href="/tasky?termin=overdue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Na dnes {overdueTasks.length ? "a po termíne" : ""}</CardTitle>
              <CardAction>
                <Link href="/tasky" className="text-sm text-muted-foreground hover:text-foreground">
                  Všetky tasky →
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              <TaskList tasks={[...overdueTasks, ...todayTasks]} clients={clientOptions} profiles={profiles} addButton emptyText="Na dnes nič nehorí ✨" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Najbližších 7 dní</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={weekTasks} clients={clientOptions} profiles={profiles} emptyText="Žiadne deadliny tento týždeň" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dnes v kalendári</CardTitle>
              <CardAction>
                <Link href="/kalendar" className="text-sm text-muted-foreground hover:text-foreground">
                  Kalendár →
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žiadne udalosti</p>
              ) : (
                <ul className="grid gap-2">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-3 text-sm">
                      <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">{e.time ?? "celý deň"}</span>
                      <a href={e.url ?? "#"} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                        {e.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nezaplatené</CardTitle>
            </CardHeader>
            <CardContent>
              {unpaid.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-400" /> Všetko zaplatené
                </p>
              ) : (
                <ul className="grid gap-2.5">
                  {unpaid.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <Link href={`/klienti/${p.client_id}`} className="block truncate font-medium hover:underline">
                          {clientName(p.client_id)}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatEur(p.amount)} · splatné {formatDate(p.due_date, { day: "numeric", month: "numeric" })}
                        </p>
                      </div>
                      <StatusPill {...PAYMENT_STATUS[p.eff]} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {pipeline.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {pipeline.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/klienti/${c.id}`} className="truncate hover:underline">
                        {c.name}
                      </Link>
                      <StatusPill {...CLIENT_STATUS[c.status]} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
