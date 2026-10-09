import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLIENT_STATUS } from "@/lib/constants";
import { addDaysISO, todayISO } from "@/lib/format";
import type { Client, Package, Profile } from "@/lib/types";

export const AI_MODEL = "claude-opus-5-5";
export const MAX_INPUT_CHARS = 4000;

const WEEKDAYS = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];

export const DraftTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable(),
  client_id: z.string().nullable(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  due_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  priority: z.enum(["low", "medium", "high"]),
  assignee_id: z.string().nullable(),
});

export type DraftTask = z.infer<typeof DraftTaskSchema>;

const PlanSchema = z.object({
  tasks: z.array(DraftTaskSchema),
  message: z.string().nullable(),
});

const nullableEnum = (values: string[]) => (values.length ? { anyOf: [{ type: "string", enum: values }, { type: "null" }] } : { type: "null" });
const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };

/** JSON schéma pre structured output – klient a zodpovedná osoba len z existujúcich ID */
function planJsonSchema(clientIds: string[], profileIds: string[]) {
  return {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: nullableString,
            client_id: nullableEnum(clientIds),
            due_date: nullableString,
            due_time: nullableString,
            priority: { type: "string", enum: ["low", "medium", "high"] },
            assignee_id: nullableEnum(profileIds),
          },
          required: ["title", "description", "client_id", "due_date", "due_time", "priority", "assignee_id"],
          additionalProperties: false,
        },
      },
      message: nullableString,
    },
    required: ["tasks", "message"],
    additionalProperties: false,
  };
}

function weekdayOf(iso: string) {
  return WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}

const SYSTEM_PROMPT = `Pomáhaš majiteľovi marketingovej agentúry WebPoint (správa sociálnych sietí, Meta reklamy, natáčanie reels) premeniť jeho poznámky písané voľným textom na konkrétne tasky v jeho dashboarde. Výstupom je zoznam taskov podľa zadanej JSON schémy.

Ako tvoriť tasky:
- Jeden task = jedna konkrétna úloha s jedným termínom. Ak text spomína viac vecí s rôznymi termínmi alebo pre rôznych klientov, rozdeľ ich na samostatné tasky. Ak ide o dávku rovnakej práce s jedným termínom (napr. „3 reels do piatku“), stačí jeden task s počtom v názve.
- Názov: krátky, v slovenčine, v rozkazovacom tvare (napr. „Natočiť 3 reels“, „Spustiť retargeting kampaň“, „Poslať scenáre na schválenie“). Meno klienta do názvu nedávaj – klient sa priraďuje zvlášť.
- Popis: len doplňujúce detaily z textu, ktoré sa do názvu nezmestili; inak null.
- Klient: priraď podľa mena, kontaktnej osoby, prezývky alebo časti názvu (napr. „Peťo“ → Peter Sámal, „joga“ → La Joga). Ak sa hodí viac klientov a z kontextu sa nedá rozhodnúť, daj null a spomeň to v message. Interné úlohy agentúry majú klienta null.
- Termín (due_date, formát YYYY-MM-DD): prepočítaj relatívne výrazy podľa kalendára nižšie. „Zajtra“ = nasledujúci deň, názov dňa („v piatok“, „do štvrtka“) = najbližší taký deň odo dneška (dnešok len ak je to výslovne „dnes“), „do konca týždňa“ = piatok tohto týždňa, „budúci týždeň“ bez dňa = pondelok budúceho týždňa, „do konca mesiaca“ = posledný deň mesiaca. Ak termín v texte nie je, daj null – nevymýšľaj ho.
- Čas (due_time, formát HH:MM, 24 h): len ak je v texte výslovne uvedený („o 14:00“, „ráno o 9“); inak null.
- Priorita: „high“ pri slovách ako súrne, ASAP, hneď, dôležité, alebo keď je termín dnes či zajtra; „low“ pri „niekedy“, „keď bude čas“, „nesúrne“; inak „medium“.
- Zodpovedná osoba (assignee_id): len ak je v texte výslovne menovaný člen tímu; inak null.
- message: jedna-dve krátke vety po slovensky o tom, čo si musel predpokladať alebo čo nebolo jasné. Ak je všetko jasné, null. Ak text neobsahuje žiadnu úlohu, vráť prázdny zoznam taskov a v message to vysvetli.`;

function buildContext(clients: Client[], packages: Package[], profiles: Profile[], defaultClientId?: string | null) {
  const today = todayISO();
  const calendar = Array.from({ length: 21 }, (_, i) => {
    const d = addDaysISO(today, i);
    return `${d} ${weekdayOf(d)}${i === 0 ? " (dnes)" : i === 1 ? " (zajtra)" : ""}`;
  }).join("\n");

  const clientLines = clients
    .map((c) => {
      const pkg = packages.find((p) => p.id === c.package_id)?.name;
      const parts = [
        `id=${c.id}`,
        c.name,
        c.contact_person ? `kontakt: ${c.contact_person}` : null,
        `stav: ${CLIENT_STATUS[c.status].label}`,
        pkg ? `balík: ${pkg}` : null,
        c.notes ? `poznámka: ${c.notes.replace(/\s+/g, " ").slice(0, 160)}` : null,
      ].filter(Boolean);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");

  const teamLines = profiles.map((p) => `- id=${p.id} | ${p.full_name ?? p.email}`).join("\n");
  const defaultClient = defaultClientId ? clients.find((c) => c.id === defaultClientId) : null;

  return [
    `Dnes je ${weekdayOf(today)} ${today} (časové pásmo Europe/Bratislava).`,
    `Kalendár na najbližšie 3 týždne:\n${calendar}`,
    `Klienti:\n${clientLines || "(žiadni)"}`,
    `Tím WebPoint:\n${teamLines || "(žiadni)"}`,
    defaultClient
      ? `Používateľ práve pracuje v detaile klienta ${defaultClient.name} (id=${defaultClient.id}). Ak text nespomína iného klienta, priraď tasky tomuto klientovi.`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export type PlanResult = { ok: true; tasks: DraftTask[]; message: string | null } | { ok: false; error: string };

export async function planTasksWithAI(
  text: string,
  data: { clients: Client[]; packages: Package[]; profiles: Profile[]; defaultClientId?: string | null },
): Promise<PlanResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "AI asistent nie je nastavený – chýba ANTHROPIC_API_KEY (pozri README)." };
  }

  const clientIds = data.clients.map((c) => c.id);
  const profileIds = data.profiles.map((p) => p.id);
  const client = new Anthropic();

  let response;
  try {
    response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      // pri odmietnutí bezpečnostným filtrom server automaticky skúsi odporúčaný záložný model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: planJsonSchema(clientIds, profileIds) },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${buildContext(data.clients, data.packages, data.profiles, data.defaultClientId)}\n\nText od používateľa:\n<poznamky>\n${text}\n</poznamky>`,
        },
      ],
    });
  } catch (error) {
    console.error("[ai] planTasks failed", error);
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "Neplatný ANTHROPIC_API_KEY." };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "AI je momentálne preťažená, skús to o chvíľu." };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `AI služba vrátila chybu (${error.status ?? "?"}). Skús to znova.` };
    return { ok: false, error: "Nepodarilo sa spojiť s AI. Skús to znova." };
  }

  if (response.stop_reason === "refusal") return { ok: false, error: "AI túto požiadavku odmietla spracovať." };
  if (response.stop_reason === "max_tokens") return { ok: false, error: "Text je príliš dlhý – rozdeľ ho na menšie časti." };

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return { ok: false, error: "AI nevrátila žiadnu odpoveď." };

  let parsed;
  try {
    parsed = PlanSchema.safeParse(JSON.parse(textBlock.text));
  } catch {
    return { ok: false, error: "AI vrátila neplatnú odpoveď. Skús to znova." };
  }
  if (!parsed.success) return { ok: false, error: "AI vrátila neplatnú odpoveď. Skús to znova." };

  // poistka: neznáme ID zahodiť
  const tasks = parsed.data.tasks.map((t) => ({
    ...t,
    client_id: t.client_id && clientIds.includes(t.client_id) ? t.client_id : null,
    assignee_id: t.assignee_id && profileIds.includes(t.assignee_id) ? t.assignee_id : null,
    due_time: t.due_date ? t.due_time : null,
  }));

  return { ok: true, tasks, message: parsed.data.message };
}
