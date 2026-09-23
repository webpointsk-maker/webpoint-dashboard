"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskFormDialog, type ClientOption } from "@/components/tasks/task-form-dialog";
import { TASK_PRIORITY } from "@/lib/constants";
import { addDaysISO, formatTime, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/lib/google/calendar";
import type { Profile, Task, TaskWithClient } from "@/lib/types";

const WEEKDAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function MonthCalendar({
  month,
  tasks,
  events,
  clients,
  profiles,
}: {
  month: string;
  tasks: TaskWithClient[];
  events: CalendarEvent[];
  clients: ClientOption[];
  profiles: Profile[];
}) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [newOn, setNewOn] = useState<string | null>(null);
  const today = todayISO();

  // Mriežka od pondelka pred 1. dňom mesiaca, 6 týždňov
  const first = new Date(`${month}T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const start = addDaysISO(month, -offset);
  const days = Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
  const weeks = days[35].slice(0, 7) === month.slice(0, 7) ? 6 : 5;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
        <div className="grid grid-cols-7 border-b border-white/[0.07] bg-white/[0.02] text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.slice(0, weeks * 7).map((day, i) => {
            const inMonth = day.slice(0, 7) === month.slice(0, 7);
            const dayTasks = tasks.filter((t) => t.due_date === day);
            const dayEvents = events.filter((e) => e.date === day);
            return (
              <div
                key={day}
                className={cn(
                  "group relative min-h-24 border-b border-white/[0.05] p-1 transition-colors hover:bg-white/[0.02] sm:min-h-28 sm:p-1.5",
                  i % 7 !== 6 && "border-r",
                  !inMonth && "bg-black/20 text-muted-foreground/60",
                  day === today && "bg-brand-orange/[0.04]",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      day === today && "bg-brand-orange font-bold text-primary-foreground shadow-md shadow-brand-orange/30",
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNewOn(day)}
                    className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-brand-orange/15 hover:text-brand-orange focus:opacity-100"
                    aria-label="Pridať task"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="grid gap-0.5">
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setEditing(t)}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight",
                        t.status === "done"
                          ? "bg-white/5 text-muted-foreground line-through"
                          : t.due_date! < today
                            ? "bg-red-500/15 text-red-200 ring-1 ring-inset ring-red-500/30"
                            : "bg-brand-blue/15 text-blue-100 ring-1 ring-inset ring-brand-blue/30 hover:bg-brand-blue/25",
                      )}
                      title={`${t.client?.name ? `[${t.client.name}] ` : ""}${t.title}`}
                    >
                      {t.priority === "high" && t.status !== "done" ? <span className={TASK_PRIORITY.high.className}>● </span> : null}
                      {t.due_time ? <span className="tabular-nums opacity-70">{formatTime(t.due_time)} </span> : null}
                      {t.client?.name ? <span className="font-medium">{t.client.name}: </span> : null}
                      {t.title}
                    </button>
                  ))}
                  {dayEvents.map((e) => (
                    <a
                      key={e.id}
                      href={e.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate rounded border border-dashed border-brand-orange/30 px-1 py-0.5 text-[11px] leading-tight text-brand-orange-light/80 hover:bg-brand-orange/10"
                      title={e.title}
                    >
                      {e.time ? <span className="tabular-nums">{e.time} </span> : null}
                      {e.title}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {editing ? <TaskFormDialog open onOpenChange={(o) => !o && setEditing(null)} task={editing} clients={clients} profiles={profiles} /> : null}
      {newOn ? <TaskFormDialog open onOpenChange={(o) => !o && setNewOn(null)} defaultDueDate={newOn} clients={clients} profiles={profiles} /> : null}
    </>
  );
}
