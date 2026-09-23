import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { pullCalendarChanges } from "@/lib/google/calendar";

/** Častý sync kalendára – volaný napr. zo Supabase pg_cron každých 10 minút (viď README). */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, stats: await pullCalendarChanges() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
