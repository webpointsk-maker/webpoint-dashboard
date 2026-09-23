import type { ClientStatus, PaymentStatus, TaskPriority, TaskStatus } from "./types";

export const TIME_ZONE = "Europe/Bratislava";

export const CLIENT_STATUS: Record<ClientStatus, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  onboarding: { label: "Onboarding", className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  active: { label: "Aktívny", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  paused: { label: "Pozastavený", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  ended: { label: "Ukončený", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  paid: { label: "Zaplatené", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  pending: { label: "Čaká", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  overdue: { label: "Po splatnosti", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; className: string }> = {
  todo: { label: "To-do", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  in_progress: { label: "Rozpracované", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  review: { label: "Na schválenie", className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  done: { label: "Hotovo", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};

export const TASK_PRIORITY: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Nízka", className: "text-zinc-500" },
  medium: { label: "Stredná", className: "text-amber-600 dark:text-amber-400" },
  high: { label: "Vysoká", className: "text-red-600 dark:text-red-400" },
};

export const PLATFORMS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  pinterest: "Pinterest",
};
