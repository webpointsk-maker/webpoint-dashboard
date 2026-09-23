import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { oauthClient, pullCalendarChanges, pushTaskToCalendar, WEBPOINT_CALENDAR_NAME } from "@/lib/google/calendar";
import { TIME_ZONE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { profile } = await requireMember();
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (profile.role !== "admin" || !code || !state || state !== request.cookies.get("g_oauth_state")?.value) {
    return NextResponse.redirect(`${origin}/nastavenia?google=error`);
  }

  try {
    const auth = oauthClient(`${origin}/api/google/callback`);
    const { tokens } = await auth.getToken(code);
    if (!tokens.refresh_token) return NextResponse.redirect(`${origin}/nastavenia?google=no-refresh`);
    auth.setCredentials(tokens);

    const calendar = google.calendar({ version: "v3", auth });
    const { data: me } = await google.oauth2({ version: "v2", auth }).userinfo.get();

    // Nájdi alebo vytvor kalendár „WebPoint – deadliny“
    const list = await calendar.calendarList.list({ minAccessRole: "owner" });
    let calendarId = list.data.items?.find((c) => c.summary === WEBPOINT_CALENDAR_NAME)?.id;
    if (!calendarId) {
      const created = await calendar.calendars.insert({
        requestBody: { summary: WEBPOINT_CALENDAR_NAME, timeZone: TIME_ZONE, description: "Deadliny taskov z WebPoint dashboardu" },
      });
      calendarId = created.data.id!;
    }

    const admin = createAdminClient();
    await admin.from("google_connection").upsert({
      id: 1,
      connected_by: profile.id,
      google_email: me.email ?? null,
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      calendar_id: calendarId,
      sync_token: null,
      last_synced_at: null,
    });

    // Prvotná synchronizácia: existujúce tasky s termínom → kalendár, potom načítanie z kalendára
    const { data: tasks } = await admin.from("tasks").select("id").not("due_date", "is", null).is("google_event_id", null);
    for (const t of tasks ?? []) await pushTaskToCalendar(t.id);
    await pullCalendarChanges();

    const res = NextResponse.redirect(`${origin}/nastavenia?google=connected`);
    res.cookies.delete("g_oauth_state");
    return res;
  } catch (e) {
    console.error("[google] callback failed", e);
    return NextResponse.redirect(`${origin}/nastavenia?google=error`);
  }
}
