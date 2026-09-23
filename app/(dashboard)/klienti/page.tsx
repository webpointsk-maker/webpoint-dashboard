import { PageHeader } from "@/components/page-header";
import { ClientsTable, type ClientRow } from "@/components/clients/clients-table";
import { NewClientButton } from "@/components/clients/new-client-button";
import { clientPrice, getClients, getPackages, getPayments, getProfiles, getTasks } from "@/lib/data";
import { formatEur, monthStartISO } from "@/lib/format";
import { effectiveStatus } from "@/lib/payments";

export const metadata = { title: "Klienti · WebPoint" };

export default async function ClientsPage() {
  const month = monthStartISO();
  const [clients, packages, profiles, payments, tasks] = await Promise.all([
    getClients(),
    getPackages(),
    getProfiles(),
    getPayments({ from: month, to: month }),
    getTasks({ openOnly: true }),
  ]);

  const rows: ClientRow[] = clients.map((c) => {
    const pay = payments.find((p) => p.client_id === c.id);
    const clientTasks = tasks.filter((t) => t.client_id === c.id);
    const assigned = profiles.find((p) => p.id === c.assigned_to);
    return {
      id: c.id,
      name: c.name,
      contact: c.contact_person,
      status: c.status,
      packageId: c.package_id,
      packageName: packages.find((p) => p.id === c.package_id)?.name ?? null,
      price: clientPrice(c, packages),
      paymentStatus: pay ? effectiveStatus(pay) : null,
      openTasks: clientTasks.length,
      nextDue: clientTasks.find((t) => t.due_date)?.due_date ?? null,
      assignedTo: c.assigned_to,
      assignedName: assigned ? (assigned.full_name ?? assigned.email) : null,
    };
  });

  const active = clients.filter((c) => c.status === "active");
  const mrr = active.reduce((sum, c) => sum + clientPrice(c, packages), 0);

  return (
    <>
      <PageHeader title="Klienti" description={`${active.length} aktívnych · ${formatEur(mrr)} mesačne`}>
        <NewClientButton packages={packages.filter((p) => p.is_active)} profiles={profiles} />
      </PageHeader>
      <ClientsTable
        rows={rows}
        packages={packages.map((p) => ({ id: p.id, name: p.name }))}
        profiles={profiles.map((p) => ({ id: p.id, name: p.full_name ?? p.email }))}
      />
    </>
  );
}
