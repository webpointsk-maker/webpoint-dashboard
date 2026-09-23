"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { TaskFormDialog, type ClientOption } from "./task-form-dialog";
import { setTaskStatus } from "@/app/(dashboard)/tasky/actions";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { formatDate, relativeDue, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, Task, TaskStatus, TaskWithClient } from "@/lib/types";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const COLUMN_DOT: Record<TaskStatus, string> = {
  todo: "bg-zinc-400",
  in_progress: "bg-brand-blue",
  review: "bg-violet-400",
  done: "bg-emerald-400",
};

export function KanbanBoard({ tasks, clients, profiles }: { tasks: TaskWithClient[]; clients: ClientOption[]; profiles: Profile[] }) {
  const [, startTransition] = useTransition();
  const [optimistic, move] = useOptimistic(tasks, (state, { id, status }: { id: string; status: TaskStatus }) =>
    state.map((t) => (t.id === id ? { ...t, status } : t)),
  );
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);

  function drop(status: TaskStatus, id: string) {
    setDragOver(null);
    const task = optimistic.find((t) => t.id === id);
    if (!task || task.status === status) return;
    startTransition(async () => {
      move({ id, status });
      const res = await setTaskStatus(id, status);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((status) => {
          const items = optimistic.filter((t) => t.status === status);
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => drop(status, e.dataTransfer.getData("text/plain"))}
              className={cn(
                "flex min-h-48 flex-col gap-2 rounded-2xl bg-white/[0.025] p-2 ring-1 ring-white/[0.05] transition-all",
                dragOver === status && "bg-brand-blue/[0.06] ring-2 ring-brand-blue/40",
              )}
            >
              <header className="flex items-center justify-between px-1.5 pt-1 pb-1">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <span className={cn("size-2 rounded-full", COLUMN_DOT[status])} />
                  {TASK_STATUS[status].label}
                </h3>
                <span className="rounded-md bg-white/5 px-1.5 text-xs text-muted-foreground tabular-nums">{items.length}</span>
              </header>
              {items.map((t) => {
                const overdue = status !== "done" && t.due_date != null && t.due_date < todayISO();
                return (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    onClick={() => setEditing(t)}
                    className="cursor-grab rounded-xl border border-white/[0.07] bg-card p-3 shadow-md shadow-black/20 transition-all hover:-translate-y-px hover:border-brand-blue/40 active:cursor-grabbing"
                  >
                    <p className={cn("text-sm font-medium", status === "done" && "text-muted-foreground line-through")}>{t.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-brand-blue-light">{t.client?.name ?? "Interné"}</span>
                      {t.due_date ? (
                        <span className={cn(overdue && "font-medium text-red-400")}>
                          · {formatDate(t.due_date, { day: "numeric", month: "numeric" })} ({relativeDue(t.due_date)})
                        </span>
                      ) : null}
                      {t.priority !== "medium" ? <span className={TASK_PRIORITY[t.priority].className}>· {TASK_PRIORITY[t.priority].label}</span> : null}
                      {t.google_event_id ? <CalendarCheck className="size-3.5" aria-label="V Google Kalendári" /> : null}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
      {editing ? (
        <TaskFormDialog open onOpenChange={(o) => !o && setEditing(null)} task={editing} clients={clients} profiles={profiles} />
      ) : null}
    </>
  );
}
