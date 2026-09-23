import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { google, type calendar_v3 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { TIME_ZONE } from "@/lib/constants";
import { addDaysISO, toLocalISODate, toLocalTime } from "@/lib/format";
import type { Task } from "@/lib/types";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];
export const WEBPOINT_CALENDAR_NAME = "WebPoint – deadliny";

type Connection = {
  refresh_token_encrypted: string;
  calendar_id: string;
  sync_token: string | null;
  last_synced_at: string | null;
  google_email: string | null;
};

export function oauthClient(redirectUri?: string) {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
}

// V rámci jednej požiadavky sa pripojenie načíta z DB len raz
const getConnection = cache(async (): Promise<Connection | null> => {
  const admin = createAdminClient();
  const { data } = await admin.from("google_connection").select("*").eq("id", 1).maybeSingle();
  return (data as Connection | null) ?? null;
});

export async function getConnectionInfo() {
  const c = await getConnection();
  return c ? { googleEmail: c.google_email, lastSyncedAt: c.last_synced_at } : null;
}

// OAuth klient držíme medzi požiadavkami (kým beží serverless inštancia),
// aby sa access token neobnovoval pri každom načítaní stránky
let apiCache: { key: string; api: calendar_v3.Calendar } | null = null;

async function calendarApi() {
  const conn = await getConnection();
  if (!conn) return null;
  if (apiCache?.key !== conn.refresh_token_encrypted) {
    const auth = oauthClient();
    auth.setCredentials({ refresh_token: decrypt(conn.refresh_token_encrypted) });
    apiCache = { key: conn.refresh_token_encrypted, api: google.calendar({ version: "v3", auth }) };
  }
  return { api: apiCache.api, conn };
}

// ---------------------------------------------------------------------------
// Dashboard → Google
// ---------------------------------------------------------------------------

function eventBody(task: Task, clientName: string | null): calendar_v3.Schema$Event {
  const prefix = task.status === "done" ? "✓ " : "";
  const summary = `${prefix}${clientName ? `[${clientName}] ` : ""}${task.title}`;
  const date = task.due_date!;
  const timing: Pick<calendar_v3.Schema$Event, "start" | "end"> = task.due_time
    ? (() => {
        const start = `${date}T${task.due_time.slice(0, 5)}:00`;
        const [h, m] = task.due_time.split(":").map(Number);
        const endMinutes = Math.min(h * 60 + m + 30, 23 * 60 + 59);
        const end = `${date}T${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:00`;
        return { start: { dateTime: start, timeZone: TIME_ZONE }, end: { dateTime: end, timeZone: TIME_ZONE } };
      })()
    : { start: { date }, end: { date: addDaysISO(date, 1) } };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return {
    summary,
    description: [task.description, appUrl ? `Otvoriť v dashboarde: ${appUrl}/tasky?task=${task.id}` : null]
      .filter(Boolean)
      .join("\n\n"),
    ...timing,
    extendedProperties: { private: { webpointTaskId: task.id } },
  };
}

/**
 * Premietne task do Google Kalendára (vytvorí / upraví / zmaže event).
 * Chyby iba loguje – uloženie tasku nesmie zlyhať kvôli kalendáru.
 */
export async function pushTaskToCalendar(taskId: string) {
  try {
    const ctx = await calendarApi();
    if (!ctx) return;
    const admin = createAdminClient();
    const { data } = await admin.from("tasks").select("*, client:clients(name)").eq("id", taskId).maybeSingle();
    if (!data) return;
    const task = data as Task & { client: { name: string } | null };

    if (!task.due_date) {
      if (task.google_event_id) await deleteEvent(task.google_event_id);
      await admin.from("tasks").update({ google_event_id: null }).eq("id", taskId);
      return;
    }

    const body = eventBody(task, task.client?.name ?? null);
    if (task.google_event_id) {
      try {
        await ctx.api.events.patch({ calendarId: ctx.conn.calendar_id, eventId: task.google_event_id, requestBody: { ...body, status: "confirmed" } });
        return;
      } catch (e) {
        if (!isNotFound(e)) throw e;
      }
    }
    const res = await ctx.api.events.insert({ calendarId: ctx.conn.calendar_id, requestBody: body });
    await admin.from("tasks").update({ google_event_id: res.data.id }).eq("id", taskId);
  } catch (e) {
    console.error("[calendar] push failed", taskId, e);
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const ctx = await calendarApi();
    if (!ctx) return;
    await ctx.api.events.delete({ calendarId: ctx.conn.calendar_id, eventId });
  } catch (e) {
    if (!isNotFound(e) && !isGone(e)) console.error("[calendar] delete failed", eventId, e);
  }
}

// ---------------------------------------------------------------------------
// Google → Dashboard
// ---------------------------------------------------------------------------

function eventDue(ev: calendar_v3.Schema$Event): { due_date: string; due_time: string | null } | null {
  if (ev.start?.date) return { due_date: ev.start.date, due_time: null };
  if (ev.start?.dateTime) {
    const d = new Date(ev.start.dateTime);
    return { due_date: toLocalISODate(d), due_time: `${toLocalTime(d)}:00` };
  }
  return null;
}

function stripPrefix(summary: string) {
  return summary.replace(/^✓\s*/, "").replace(/^\[[^\]]*\]\s*/, "").trim();
}

/**
 * Inkrementálne načíta zmeny z kalendára „WebPoint – deadliny“:
 * - presunutý event → zmení termín tasku
 * - zmazaný event → odpojí task od kalendára (task ostáva)
 * - nový event vytvorený priamo v Google → vytvorí interný task
 */
export async function pullCalendarChanges(): Promise<{ updated: number; created: number; unlinked: number } | null> {
  const ctx = await calendarApi();
  if (!ctx) return null;
  const admin = createAdminClient();
  const stats = { updated: 0, created: 0, unlinked: 0 };

  const syncToken = ctx.conn.sync_token ?? undefined;
  let pageToken: string | undefined;
  let nextSyncToken: string | null | undefined;
  const events: calendar_v3.Schema$Event[] = [];

  try {
    do {
      const res = await ctx.api.events.list({
        calendarId: ctx.conn.calendar_id,
        singleEvents: true,
        showDeleted: true,
        maxResults: 250,
        pageToken,
        ...(syncToken ? { syncToken } : { timeMin: new Date(Date.now() - 90 * 86400000).toISOString() }),
      });
      events.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
      nextSyncToken = res.data.nextSyncToken;
    } while (pageToken);
  } catch (e) {
    if (isGone(e) && syncToken) {
      // sync token expiroval → plná synchronizácia
      await admin.from("google_connection").update({ sync_token: null }).eq("id", 1);
      return pullCalendarChanges();
    }
    throw e;
  }

  for (const ev of events) {
    if (!ev.id) continue;
    const { data: existing } = await admin.from("tasks").select("*").eq("google_event_id", ev.id).maybeSingle();
    const task = existing as Task | null;

    if (ev.status === "cancelled") {
      if (task) {
        await admin.from("tasks").update({ google_event_id: null }).eq("id", task.id);
        stats.unlinked++;
      }
      continue;
    }

    const due = eventDue(ev);
    if (!due) continue;

    if (task) {
      const changed = task.due_date !== due.due_date || (task.due_time ?? null) !== due.due_time;
      const googleNewer = ev.updated && Date.parse(ev.updated) > Date.parse(task.updated_at);
      if (changed && googleNewer) {
        await admin.from("tasks").update(due).eq("id", task.id);
        stats.updated++;
      }
      continue;
    }

    const linkedId = ev.extendedProperties?.private?.webpointTaskId;
    if (linkedId) continue; // event patrí tasku, ktorý bol medzitým zmazaný alebo prelinkovaný

    const { data: created } = await admin
      .from("tasks")
      .insert({ title: stripPrefix(ev.summary ?? "Bez názvu"), description: ev.description ?? null, ...due, google_event_id: ev.id })
      .select("id")
      .single();
    if (created) {
      await ctx.api.events
        .patch({ calendarId: ctx.conn.calendar_id, eventId: ev.id, requestBody: { extendedProperties: { private: { webpointTaskId: created.id } } } })
        .catch(() => {});
      stats.created++;
    }
  }

  await admin
    .from("google_connection")
    .update({ sync_token: nextSyncToken ?? syncToken ?? null, last_synced_at: new Date().toISOString() })
    .eq("id", 1);

  return stats;
}

/** Spustí sync, ak posledný prebehol pred viac ako `minIntervalMs`. */
export async function maybePullCalendarChanges(minIntervalMs = 2 * 60 * 1000) {
  try {
    const conn = await getConnection();
    if (!conn) return;
    if (conn.last_synced_at && Date.now() - Date.parse(conn.last_synced_at) < minIntervalMs) return;
    await pullCalendarChanges();
  } catch (e) {
    console.error("[calendar] pull failed", e);
  }
}

// ---------------------------------------------------------------------------
// Udalosti z primárneho kalendára (na zobrazenie)
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  endTime: string | null;
  url: string | null;
};

/** Udalosti z hlavného kalendára – cache 5 minút, aby stránky nečakali na Google */
const cachedPrimaryEvents = unstable_cache(fetchPrimaryEvents, ["google-primary-events"], {
  revalidate: 300,
  tags: ["google-events"],
});

export async function listPrimaryEvents(fromISO: string, toISO: string): Promise<CalendarEvent[]> {
  try {
    return await cachedPrimaryEvents(fromISO, toISO);
  } catch (e) {
    // chyby sa necachujú – ďalšie načítanie to skúsi znova
    console.error("[calendar] list primary failed", e);
    return [];
  }
}

async function fetchPrimaryEvents(fromISO: string, toISO: string): Promise<CalendarEvent[]> {
  {
    const ctx = await calendarApi();
    if (!ctx) return [];
    const res = await ctx.api.events.list({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      timeMin: new Date(`${fromISO}T00:00:00Z`).toISOString(),
      timeMax: new Date(`${addDaysISO(toISO, 1)}T00:00:00Z`).toISOString(),
      maxResults: 250,
    });
    return (res.data.items ?? [])
      .filter((ev) => ev.status !== "cancelled" && ev.id)
      .map((ev) => {
        const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
        const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
        return {
          id: ev.id!,
          title: ev.summary ?? "(bez názvu)",
          date: ev.start?.date ?? (start ? toLocalISODate(start) : fromISO),
          time: start ? toLocalTime(start) : null,
          endTime: end ? toLocalTime(end) : null,
          url: ev.htmlLink ?? null,
        };
      });
  }
}

// ---------------------------------------------------------------------------

function status(e: unknown) {
  const err = e as { code?: number; status?: number; response?: { status?: number } };
  return err?.code ?? err?.status ?? err?.response?.status;
}
const isNotFound = (e: unknown) => status(e) === 404;
const isGone = (e: unknown) => status(e) === 410;
