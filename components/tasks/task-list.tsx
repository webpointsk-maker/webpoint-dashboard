"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarCheck, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusPill } from "@/components/status-badge";
import { TaskFormDialog, type ClientOption } from "./task-form-dialog";
import { deleteTask, setTaskStatus } from "@/app/(dashboard)/tasky/actions";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatTime, relativeDue, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, Task, TaskWithClient } from "@/lib/types";

type Props = {
  tasks: TaskWithClient[];
  clients: ClientOption[];
  profiles: Profile[];
  showClient?: boolean;
  defaultClientId?: string | null;
  emptyText?: string;
  addButton?: boolean;
  compact?: boolean;
};

export function TaskList({ tasks, clients, profiles, showClient = true, defaultClientId, emptyText = "Žiadne tasky", addButton, compact }: Props) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(t: Task) {
    setEditing(t);
    setOpen(true);
  }

  return (
    <div>
      {addButton ? (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onClick={openNew}>
            <Plus /> Pridať task
          </Button>
        </div>
      ) : null}
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015]">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} profiles={profiles} showClient={showClient} compact={compact} onEdit={() => openEdit(t)} />
          ))}
        </ul>
      )}
      {open ? (
        <TaskFormDialog
          open={open}
          onOpenChange={setOpen}
          task={editing}
          clients={clients}
          profiles={profiles}
          defaultClientId={defaultClientId}
        />
      ) : null}
    </div>
  );
}

function TaskRow({ task, profiles, showClient, compact, onEdit }: { task: TaskWithClient; profiles: Profile[]; showClient: boolean; compact?: boolean; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "done";
  const overdue = !done && task.due_date != null && task.due_date < todayISO();
  const assignee = profiles.find((p) => p.id === task.assignee_id);

  function toggle(checked: boolean) {
    startTransition(async () => {
      const res = await setTaskStatus(task.id, checked ? "done" : "todo");
      if (!res.ok) toast.error(res.error);
    });
  }

  function remove() {
    if (!confirm(`Zmazať task „${task.title}“?`)) return;
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.ok) toast.success("Task zmazaný");
      else toast.error(res.error);
    });
  }

  return (
    <li className={cn("flex items-start gap-3 px-3 py-2.5 transition-all hover:bg-white/[0.03]", pending && "opacity-50")}>
      <Checkbox className="mt-0.5" checked={done} onCheckedChange={(v) => toggle(Boolean(v))} aria-label="Hotovo" />
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{task.title}</span>
          {task.priority === "high" && !done ? <span className={cn("text-xs font-medium", TASK_PRIORITY.high.className)}>● vysoká</span> : null}
          {!compact && task.status !== "todo" && !done ? <StatusPill {...TASK_STATUS[task.status]} /> : null}
          {task.google_event_id ? <CalendarCheck className="size-3.5 text-muted-foreground" aria-label="V Google Kalendári" /> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {showClient && task.client ? (
            <Link href={`/klienti/${task.client.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-blue-light hover:text-brand-orange">
              {task.client.name}
            </Link>
          ) : null}
          {showClient && !task.client ? <span>Interné</span> : null}
          {task.due_date ? (
            <span className={cn(overdue && "font-medium text-red-400")}>
              {formatDate(task.due_date, { day: "numeric", month: "numeric" })}
              {task.due_time ? ` ${formatTime(task.due_time)}` : ""} · {relativeDue(task.due_date)}
            </span>
          ) : null}
          {assignee && !compact ? <span>{assignee.full_name ?? assignee.email}</span> : null}
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Akcie" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil /> Upraviť
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={remove}>
            <Trash2 /> Zmazať
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
