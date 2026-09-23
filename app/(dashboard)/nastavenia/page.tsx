import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { GoogleConnection } from "@/components/settings/google-connection";
import { GoogleStatusToast } from "@/components/settings/google-status-toast";
import { PackagesManager } from "@/components/settings/packages-manager";
import { TeamManager } from "@/components/settings/team-manager";
import { requireMember } from "@/lib/auth";
import { getClients, getPackages, getProfiles } from "@/lib/data";
import { getConnectionInfo } from "@/lib/google/calendar";

export const metadata = { title: "Nastavenia · WebPoint" };

export default async function SettingsPage(props: PageProps<"/nastavenia">) {
  const { google } = await props.searchParams;
  const { supabase, profile } = await requireMember();
  const isAdmin = profile.role === "admin";

  const [packages, clients, profiles, connection, { data: allowed }] = await Promise.all([
    getPackages(),
    getClients(),
    getProfiles(),
    getConnectionInfo(),
    supabase.from("allowed_emails").select("email, role").order("created_at"),
  ]);

  const usage: Record<string, number> = {};
  for (const c of clients) if (c.package_id && c.status !== "ended") usage[c.package_id] = (usage[c.package_id] ?? 0) + 1;

  const members = (allowed ?? []).map((a) => {
    const p = profiles.find((x) => x.email.toLowerCase() === a.email.toLowerCase());
    return { email: a.email, role: a.role, name: p?.full_name ?? null, joined: !!p };
  });

  return (
    <>
      <GoogleStatusToast status={typeof google === "string" ? google : undefined} />
      <PageHeader title="Nastavenia" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Google Kalendár</CardTitle>
            <CardDescription>Obojsmerná synchronizácia deadlinov</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleConnection info={connection} isAdmin={isAdmin} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balíky</CardTitle>
            <CardDescription>Ponuka služieb a mesačné ceny</CardDescription>
          </CardHeader>
          <CardContent>
            <PackagesManager packages={packages} usage={usage} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tím</CardTitle>
            <CardDescription>Kto sa môže prihlásiť do dashboardu (Google účet)</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamManager members={members} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
