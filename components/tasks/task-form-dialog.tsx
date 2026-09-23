"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { saveTask } from "@/app/(dashboard)/tasky/actions";
import { TASK_PRIORITY, TASK_STATUS } from "@/lib/constants";
import type { Profile, Task } from "@/lib/types";

export type ClientOption = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  clients: ClientOption[];
  profiles: Profile[];
  defaultClientId?: string | null;
  defaultDueDate?: string | null;
};

export function TaskFormDialog({ open, onOpenChange, task, clients, profiles, defaultClientId, defaultDueDate }: Props) {
  const [pending, startTransition] = useTransition();
  const [dueDate, setDueDate] = useState(task?.due_date ?? defaultDueDate ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveTask(fd);
      if (res.ok) {
        toast.success(task ? "Task upravený" : "Task pridaný");
        onOpenChange(false);
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Upraviť task" : "Nový task"}</DialogTitle>
        </DialogHeader>
        <form key={task?.id ?? "new"} onSubmit={onSubmit} className="grid gap-4">
          {task ? <input type="hidden" name="id" value={task.id} /> : null}
          <Field label="Názov" htmlFor="title">
            <Input id="title" name="title" required autoFocus defaultValue={task?.title} placeholder="napr. Pripraviť obsahový plán na október" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Klient" htmlFor="client_id">
              <NativeSelect id="client_id" name="client_id" defaultValue={task?.client_id ?? defaultClientId ?? ""}>
                <option value="">— interný task —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Zodpovedný" htmlFor="assignee_id">
              <NativeSelect id="assignee_id" name="assignee_id" defaultValue={task?.assignee_id ?? ""}>
                <option value="">— nikto —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Deadline" htmlFor="due_date">
              <Input id="due_date" name="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Čas (nepovinné)" htmlFor="due_time">
              <Input id="due_time" name="due_time" type="time" disabled={!dueDate} defaultValue={task?.due_time?.slice(0, 5) ?? ""} />
            </Field>
            <Field label="Stav" htmlFor="status">
              <NativeSelect id="status" name="status" defaultValue={task?.status ?? "todo"}>
                {Object.entries(TASK_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Priorita" htmlFor="priority">
              <NativeSelect id="priority" name="priority" defaultValue={task?.priority ?? "medium"}>
                {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Popis" htmlFor="description">
            <Textarea id="description" name="description" rows={3} defaultValue={task?.description ?? ""} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušiť
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Ukladám…" : "Uložiť"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
