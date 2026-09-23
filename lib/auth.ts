import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Aktuálny používateľ + profil. Presmeruje na /login alebo /bez-pristupu. */
export const requireMember = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  let { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    await supabase.rpc("ensure_profile");
    ({ data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle());
  }
  if (!profile) redirect("/bez-pristupu");

  return { supabase, user: data.user, profile: profile as Profile };
});
