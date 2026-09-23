import { TIME_ZONE } from "./constants";

const eur = new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurPrecise = new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" });

export function formatEur(value: number | null | undefined, precise = false) {
  if (value == null) return "–";
  return (precise ? eurPrecise : eur).format(Number(value));
}

/** Dnešný dátum v Bratislave ako YYYY-MM-DD */
export function todayISO() {
  return toLocalISODate(new Date());
}

export function toLocalISODate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function toLocalTime(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Prvý deň mesiaca YYYY-MM-01 */
export function monthStartISO(iso = todayISO()) {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonthsISO(iso: string, months: number) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric", year: "numeric" }) {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("sk-SK", { ...opts, timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}

export function formatMonth(iso: string, short = false) {
  return new Intl.DateTimeFormat("sk-SK", { month: short ? "short" : "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00Z`),
  );
}

/** Relatívny popis termínu: "dnes", "zajtra", "o 3 dni", "pred 2 dňami" */
export function relativeDue(iso: string) {
  const today = todayISO();
  const diff = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (diff === 0) return "dnes";
  if (diff === 1) return "zajtra";
  if (diff === -1) return "včera";
  if (diff > 1) return diff < 5 ? `o ${diff} dni` : `o ${diff} dní`;
  const n = -diff;
  return `pred ${n} dňami`;
}

export function formatTime(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "";
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
