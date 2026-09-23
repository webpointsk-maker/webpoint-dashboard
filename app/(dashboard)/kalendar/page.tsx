import Link from "next/link";
import { after } from "next/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { getClients, getProfiles, getTasks } from "@/lib/data";
import { getConnectionInfo, listPrimaryEvents, maybePullCalendarChanges } from "@/lib/google/calendar";
import { addDaysISO, addMonthsISO, formatMonth, monthStartISO } from "@/lib/format";

export const metadata = { title: "Kalendár · WebPoint" };

export default async function CalendarPage(props: PageProps<"/kalendar">) {
  after(() => maybePullCalendarChanges());
  const { mesiac } = await props.searchParams;
  const month = typeof mesiac === "string" && /^\d{4}-\d{2}$/.test(mesiac) ? `${mesiac}-01` : monthStartISO();
  const from = addDaysISO(month, -7);
  const to = addDaysISO(addMonthsISO(month, 1), 14);

  const [tasks, events, clients, profiles, connection] = await Promise.all([
    getTasks({ from, to }),
    listPrimaryEvents(from, to),
    getClients(),
    getProfiles(),
    getConnectionInfo(),
  ]);

  return (
    <>
      <PageHeader
        title="Kalendár"
        description={connection ? `Deadliny taskov + udalosti z Google Kalendára (${connection.googleEmail})` : "Deadliny taskov · Google Kalendár nie je pripojený"}
      >
        <div className="flex items-center gap-1">
          <Link href={`/kalendar?mesiac=${addMonthsISO(month, -1).slice(0, 7)}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Predchádzajúci mesiac">
            <ChevronLeft />
          </Link>
          <span className="w-36 text-center text-sm font-medium capitalize">{formatMonth(month)}</span>
          <Link href={`/kalendar?mesiac=${addMonthsISO(month, 1).slice(0, 7)}`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Nasledujúci mesiac">
            <ChevronRight />
          </Link>
          <Link href="/kalendar" className={buttonVariants({ variant: "ghost" })}>
            Dnes
          </Link>
        </div>
      </PageHeader>
      {!connection ? (
        <p className="mb-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Pripoj Google Kalendár v <Link href="/nastavenia" className="underline">Nastaveniach</Link> – deadliny sa budú zapisovať do kalendára a uvidíš tu aj svoje stretnutia.
        </p>
      ) : null}
      <MonthCalendar month={month} tasks={tasks} events={events} clients={clients.map((c) => ({ id: c.id, name: c.name }))} profiles={profiles} />
      <p className="mt-3 text-xs text-muted-foreground">Plné štítky = tasky z dashboardu · prerušované = udalosti z Google Kalendára</p>
    </>
  );
}
