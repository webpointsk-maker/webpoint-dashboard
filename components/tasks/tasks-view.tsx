"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KanbanSquare, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { KanbanBoard } from "./kanban-board";
import { TaskList } from "./task-list";
import { TaskFormDialog, type ClientOption } from "./task-form-dialog";
import { addDaysISO, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, TaskWithClient } from "@/lib/types";

type DueFilter = "all" | "overdue" | "today" | "week" | "none";

export function TasksView({ tasks, clients, profiles }: { tasks: TaskWithClient[]; clients: ClientOption[]; profiles: Profile[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") === "kanban" ? "kanban" : "list";
  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState(params.get("klient") ?? "");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState<DueFilter>((params.get("termin") as DueFilter) ?? "all");
  const [showDone, setShowDone] = useState(false);
  const [creating, setCreating] = useState(false);
  const openTaskId = params.get("task");

  const filtered = useMemo(() => {
    const today = todayISO();
    const weekEnd = addDaysISO(today, 7);
    const needle = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (view === "list" && !showDone && t.status === "done") return false;
      if (clientId === "internal" ? t.client_id : clientId && t.client_id !== clientId) return false;
      if (assignee && t.assignee_id !== assignee) return false;
      if (needle && !`${t.title} ${t.description ?? ""} ${t.client?.name ?? ""}`.toLowerCase().includes(needle)) return false;
      const open = t.status !== "done";
      switch (due) {
        case "overdue":
          return open && !!t.due_date && t.due_date < today;
        case "today":
          return t.due_date === today;
        case "week":
          return !!t.due_date && t.due_date >= today && t.due_date <= weekEnd;
        case "none":
          return !t.due_date;
        default:
          return true;
      }
    });
  }, [tasks, view, showDone, clientId, assignee, q, due]);

  function setView(v: "list" | "kanban") {
    const next = new URLSearchParams(params);
    if (v === "kanban") next.set("view", "kanban");
    else next.delete("view");
    router.replace(`/tasky?${next}`);
  }

  const openTask = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať…" className="pl-8" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <NativeSelect value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Klient">
            <option value="">Všetci klienti</option>
            <option value="internal">Interné</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Zodpovedný">
            <option value="">Všetci ľudia</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.email}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={due} onChange={(e) => setDue(e.target.value as DueFilter)} aria-label="Termín">
            <option value="all">Každý termín</option>
            <option value="overdue">Po termíne</option>
            <option value="today">Dnes</option>
            <option value="week">Najbližších 7 dní</option>
            <option value="none">Bez termínu</option>
          </NativeSelect>
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          {view === "list" ? (
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-primary" />
              Hotové
            </label>
          ) : null}
          <div className="flex rounded-lg border p-0.5">
            <button type="button" onClick={() => setView("list")} className={cn("rounded-md p-1.5", view === "list" && "bg-muted")} aria-label="Zoznam">
              <List className="size-4" />
            </button>
            <button type="button" onClick={() => setView("kanban")} className={cn("rounded-md p-1.5", view === "kanban" && "bg-muted")} aria-label="Kanban">
              <KanbanSquare className="size-4" />
            </button>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nový task
          </Button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard tasks={filtered} clients={clients} profiles={profiles} />
      ) : (
        <TaskList tasks={filtered} clients={clients} profiles={profiles} emptyText="Žiadne tasky pre zvolený filter" />
      )}

      {creating ? (
        <TaskFormDialog open onOpenChange={setCreating} clients={clients} profiles={profiles} defaultClientId={clientId && clientId !== "internal" ? clientId : null} />
      ) : null}
      {openTask ? (
        <TaskFormDialog
          open
          onOpenChange={(o) => {
            if (!o) {
              const next = new URLSearchParams(params);
              next.delete("task");
              router.replace(`/tasky?${next}`);
            }
          }}
          task={openTask}
          clients={clients}
          profiles={profiles}
        />
      ) : null}
    </div>
  );
}
