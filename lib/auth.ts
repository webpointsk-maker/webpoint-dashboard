import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Aktuálny používateľ + profil. Presmeruje na /login alebo /bez-pristupu.
 * getClaims() overí JWT lokálne (ES256 kľúče) – bez volania na Supabase Auth.
 */
export const requireMember = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) {
    await supabase.rpc("ensure_profile");
    ({ data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
  }
  if (!profile) redirect("/bez-pristupu");

  return { supabase, userId, profile: profile as Profile };
});
