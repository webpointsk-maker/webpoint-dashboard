import type { ClientStatus, PaymentStatus, TaskPriority, TaskStatus } from "./types";

export const TIME_ZONE = "Europe/Bratislava";

const PILL = {
  blue: "bg-brand-blue/15 text-brand-blue-light ring-1 ring-inset ring-brand-blue/25",
  orange: "bg-brand-orange/15 text-brand-orange-light ring-1 ring-inset ring-brand-orange/25",
  green: "bg-emerald-500/12 text-emerald-300 ring-1 ring-inset ring-emerald-500/25",
  red: "bg-red-500/12 text-red-300 ring-1 ring-inset ring-red-500/30",
  violet: "bg-violet-500/12 text-violet-300 ring-1 ring-inset ring-violet-500/25",
  gray: "bg-white/5 text-zinc-400 ring-1 ring-inset ring-white/10",
};

export const CLIENT_STATUS: Record<ClientStatus, { label: string; className: string }> = {
  lead: { label: "Lead", className: PILL.violet },
  onboarding: { label: "Skúšobná doba", className: PILL.blue },
  active: { label: "Aktívny", className: PILL.green },
  paused: { label: "Pozastavený", className: PILL.orange },
  ended: { label: "Ukončený", className: PILL.gray },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Zaplatené", className: PILL.green },
  pending: { label: "Čaká", className: PILL.orange },
  overdue: { label: "Po splatnosti", className: PILL.red },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "To-do", className: PILL.gray },
  in_progress: { label: "Rozpracované", className: PILL.blue },
  review: { label: "Na schválenie", className: PILL.violet },
  done: { label: "Hotovo", className: PILL.green },
};

export const TASK_PRIORITY: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Nízka", className: "text-zinc-500" },
  medium: { label: "Stredná", className: "text-brand-orange-light" },
  high: { label: "Vysoká", className: "text-red-400" },
};

export const PLATFORMS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  pinterest: "Pinterest",
};
