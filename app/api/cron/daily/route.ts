import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { pullCalendarChanges } from "@/lib/google/calendar";
import { monthStartISO } from "@/lib/format";

/** Denne: vygeneruje platby za aktuálny mesiac (idempotentné), označí po splatnosti, synchronizuje kalendár. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: generated, error: genError } = await admin.rpc("generate_payments", { p_period: monthStartISO() });
  const { data: overdue, error: overdueError } = await admin.rpc("mark_overdue_payments");
  const calendar = await pullCalendarChanges().catch((e) => ({ error: String(e) }));

  return NextResponse.json({ generated, overdue, calendar, errors: [genError?.message, overdueError?.message].filter(Boolean) });
}
