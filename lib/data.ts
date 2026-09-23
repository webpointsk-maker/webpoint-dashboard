import "server-only";
import { requireMember } from "@/lib/auth";
import type { Client, Package, Payment, Profile, TaskWithClient } from "@/lib/types";

export async function getPackages(includeInactive = true) {
  const { supabase } = await requireMember();
  let q = supabase.from("packages").select("*").order("monthly_price");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as Package[];
}

export async function getProfiles() {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("profiles").select("*").order("full_name");
  return (data ?? []) as Profile[];
}

export async function getClients() {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("clients").select("*").order("name");
  return (data ?? []) as Client[];
}

export async function getClient(id: string) {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  return data as Client | null;
}

export async function getTasks(opts: { clientId?: string; openOnly?: boolean; from?: string; to?: string } = {}) {
  const { supabase } = await requireMember();
  let q = supabase
    .from("tasks")
    .select("*, client:clients(id, name)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false });
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  if (opts.openOnly) q = q.neq("status", "done");
  if (opts.from) q = q.gte("due_date", opts.from);
  if (opts.to) q = q.lte("due_date", opts.to);
  const { data } = await q;
  return (data ?? []) as TaskWithClient[];
}

export async function getPayments(opts: { from?: string; to?: string; clientId?: string } = {}) {
  const { supabase } = await requireMember();
  let q = supabase.from("payments").select("*").order("period", { ascending: false });
  if (opts.from) q = q.gte("period", opts.from);
  if (opts.to) q = q.lte("period", opts.to);
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  const { data } = await q;
  return (data ?? []) as Payment[];
}

/** Mesačná cena klienta – vlastná cena má prednosť pred cenou balíka */
export function clientPrice(client: Client, packages: Package[]) {
  if (client.custom_price != null) return Number(client.custom_price);
  const pkg = packages.find((p) => p.id === client.package_id);
  return pkg ? Number(pkg.monthly_price) : 0;
}
