import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Mail, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/status-badge";
import { ClientActions } from "@/components/clients/client-actions";
import { ClientNotes } from "@/components/clients/client-notes";
import { ClientPayments } from "@/components/clients/client-payments";
import { TaskList } from "@/components/tasks/task-list";
import { clientPrice, getClient, getClients, getPackages, getPayments, getProfiles, getTasks } from "@/lib/data";
import { CLIENT_STATUS, PLATFORMS } from "@/lib/constants";
import { formatDate, formatEur } from "@/lib/format";

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

  return (
    <>
      <Link href="/klienti" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Klienti
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <StatusPill {...CLIENT_STATUS[client.status]} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {pkg ? pkg.name : "Bez balíka"} · {price ? `${formatEur(price)} / mes.` : "bez paušálu"}
            {assigned ? ` · stará sa ${assigned.full_name ?? assigned.email}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <ClientActions client={client} packages={packages} profiles={profiles} />
        </div>
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

          <Card>
            <CardHeader>
              <CardTitle>Poznámky</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientNotes key={client.notes ?? ""} clientId={client.id} notes={client.notes} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Údaje</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <Info label="Kontaktná osoba" value={client.contact_person} />
              {client.email ? (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 hover:underline">
                  <Mail className="size-4 text-muted-foreground" /> {client.email}
                </a>
              ) : null}
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="flex items-center gap-2 hover:underline">
                  <Phone className="size-4 text-muted-foreground" /> {client.phone}
                </a>
              ) : null}
              {website ? (
                <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate hover:underline">
                  <Globe className="size-4 shrink-0 text-muted-foreground" /> {client.website}
                </a>
              ) : null}
              <Info label="IČO" value={client.ico} />
              <Info label="Spolupráca od" value={client.start_date ? formatDate(client.start_date) : null} />
              <Info label="Splatnosť" value={`${client.billing_day}. deň v mesiaci`} />
              {client.platforms.length ? (
                <div>
                  <p className="text-xs text-muted-foreground">Platformy</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {client.platforms.map((p) => (
                      <span key={p} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                        {PLATFORMS[p] ?? p}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {pkg?.description ? <Info label="Balík obsahuje" value={`${pkg.description}${pkg.posts_per_month ? ` · ${pkg.posts_per_month} príspevkov/mes.` : ""}`} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platby</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientPayments clientId={client.id} clientName={client.name} payments={payments} price={price} billingDay={client.billing_day} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
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
