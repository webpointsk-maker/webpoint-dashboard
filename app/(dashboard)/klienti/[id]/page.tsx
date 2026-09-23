import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clapperboard, Globe, Image as ImageIcon, Mail, Megaphone, Phone, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-badge";
import { ClientActions } from "@/components/clients/client-actions";
import { ClientNotes } from "@/components/clients/client-notes";
import { ClientPayments } from "@/components/clients/client-payments";
import { TaskList } from "@/components/tasks/task-list";
import { clientPrice, getClient, getClients, getPackages, getPayments, getProfiles, getTasks } from "@/lib/data";
import { CLIENT_STATUS, PAYMENT_STATUS, PLATFORMS } from "@/lib/constants";
import { formatDate, formatEur, monthStartISO } from "@/lib/format";
import { combinedStatus } from "@/lib/payments";

export default async function ClientDetailPage(props: PageProps<"/klienti/[id]">) {
  const { id } = await props.params;
  const client = await getClient(id);
  if (!client) notFound();

  const [packages, profiles, tasks, payments, clients] = await Promise.all([
    getPackages(),
    getProfiles(),
    getTasks({ clientId: id }),
    getPayments({ clientId: id }),
    getClients(),
  ]);

  const pkg = packages.find((p) => p.id === client.package_id);
  const price = clientPrice(client, packages);
  const assigned = profiles.find((p) => p.id === client.assigned_to);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done").slice(0, 10);
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  const website = client.website && !/^https?:\/\//.test(client.website) ? `https://${client.website}` : client.website;
  const monthStatus = combinedStatus(payments.filter((p) => p.period === monthStartISO()));
  const schedule = client.payment_schedule ?? [];
  const priceDiffers = pkg && price > 0 && price !== Number(pkg.monthly_price);

  return (
    <>
      <Link href="/klienti" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-brand-orange">
        <ArrowLeft className="size-4" /> Klienti
      </Link>

      <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-card/80 p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
        <div className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-brand-blue/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-24 size-64 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{client.name}</h1>
              <StatusPill {...CLIENT_STATUS[client.status]} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {client.contact_person ? `${client.contact_person} · ` : ""}
              {assigned ? `stará sa ${assigned.full_name ?? assigned.email}` : "nikto nepriradený"}
            </p>
          </div>
          <div className="flex gap-2">
            <ClientActions client={client} packages={packages} profiles={profiles} />
          </div>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="Balík" value={pkg ? pkg.name : "Na mieru"} accent="blue" />
          <HeroStat label="Mesačne" value={price ? formatEur(price) : "—"} sub={priceDiffers ? `balík ${formatEur(pkg!.monthly_price)}` : undefined} accent="orange" />
          <HeroStat
            label="Splatnosť"
            value={schedule.length ? schedule.map((s) => `${s.day}.`).join(" + ") : price ? `${client.billing_day}. v mesiaci` : "—"}
            sub={schedule.length ? schedule.map((s) => formatEur(s.amount)).join(" + ") : undefined}
          />
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">Tento mesiac</dt>
            <dd className="mt-1">{monthStatus ? <StatusPill {...PAYMENT_STATUS[monthStatus]} /> : <span className="text-sm text-muted-foreground">bez platby</span>}</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Čo treba urobiť ({openTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList tasks={openTasks} clients={clientOptions} profiles={profiles} showClient={false} defaultClientId={client.id} addButton emptyText="Všetko hotové 🎉" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Poznámky a dohodnutý rozsah</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientNotes key={client.notes ?? ""} clientId={client.id} notes={client.notes} />
            </CardContent>
          </Card>

          {doneTasks.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">Nedávno dokončené</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={doneTasks} clients={clientOptions} profiles={profiles} showClient={false} compact />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platby</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientPayments
                clientId={client.id}
                clientName={client.name}
                payments={payments}
                price={price}
                billingDay={schedule[0]?.day ?? client.billing_day}
                hasSchedule={schedule.length > 1}
              />
            </CardContent>
          </Card>

          {pkg ? (
            <Card>
              <CardHeader>
                <CardTitle>Balík {pkg.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <PkgStat icon={Clapperboard} value={pkg.reels_per_month} label="reels" />
                  <PkgStat icon={ImageIcon} value={pkg.posts_per_month} label="postov" />
                  <PkgStat icon={Megaphone} value={pkg.campaigns_per_month} label="kampane" />
                </div>
                {pkg.description ? <p className="text-xs leading-relaxed text-muted-foreground">{pkg.description}</p> : null}
                <p className="text-xs text-brand-orange-light/90">Individuálne úpravy rozsahu sú v poznámkach klienta.</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Kontakt a údaje</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {client.contact_person ? (
                <p className="flex items-center gap-2">
                  <UserRound className="size-4 text-muted-foreground" /> {client.contact_person}
                </p>
              ) : null}
              {client.email ? (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:text-brand-orange">
                  <Mail className="size-4 text-muted-foreground" /> {client.email}
                </a>
              ) : null}
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:text-brand-orange">
                  <Phone className="size-4 text-muted-foreground" /> {client.phone}
                </a>
              ) : null}
              {website ? (
                <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:text-brand-orange">
                  <Globe className="size-4 shrink-0 text-muted-foreground" /> {client.website}
                </a>
              ) : null}
              {client.start_date ? (
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" /> Spolupráca od {formatDate(client.start_date)}
                </p>
              ) : null}
              <Info label="IČO" value={client.ico} />
              {client.platforms.length ? (
                <div className="flex flex-wrap gap-1">
                  {client.platforms.map((p) => (
                    <span key={p} className="rounded-md bg-white/5 px-1.5 py-0.5 text-xs ring-1 ring-white/10">
                      {PLATFORMS[p] ?? p}
                    </span>
                  ))}
                </div>
              ) : null}
              {!client.contact_person && !client.email && !client.phone && !website ? (
                <p className="text-xs text-muted-foreground">Kontakt doplníš cez „Upraviť“.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function HeroStat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "blue" | "orange" }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-0.5 font-heading text-lg font-bold tracking-tight tabular-nums ${accent === "blue" ? "text-brand-blue-light" : accent === "orange" ? "text-brand-orange" : ""}`}
      >
        {value}
      </dd>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function PkgStat({ icon: Icon, value, label }: { icon: React.ElementType; value: number | null; label: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-2 py-2.5 text-center ring-1 ring-white/[0.06]">
      <Icon className="mx-auto size-4 text-brand-blue-light" />
      <p className="mt-1 font-heading text-lg font-bold tabular-nums">{value ?? "—"}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
