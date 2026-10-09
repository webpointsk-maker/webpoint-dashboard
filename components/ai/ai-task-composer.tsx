"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createTasks, planTasks } from "@/app/(dashboard)/tasky/actions";
import { TASK_PRIORITY } from "@/lib/constants";
import { relativeDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DraftTask } from "@/lib/ai/task-planner";
import type { Profile } from "@/lib/types";

type Option = { id: string; name: string };
type Row = DraftTask & { key: number; include: boolean };

const THINKING = ["Čítam poznámky…", "Hľadám klientov…", "Počítam termíny…", "Skladám tasky…"];

const PLACEHOLDER = `Napíš, čo treba urobiť – napr.:
Petrovi do piatku 3 reels a scenáre na budúci týždeň, La Joge súrne spustiť retargeting zajtra o 10:00 a Paradise poslať návrh giveaway do konca týždňa.`;

export function AiTaskComposer({
  clients,
  profiles,
  defaultClientId,
  compact,
}: {
  clients: Option[];
  profiles: Profile[];
  defaultClientId?: string | null;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [planning, startPlanning] = useTransition();
  const [saving, startSaving] = useTransition();
  const [step, setStep] = useState(0);
  const keyRef = useRef(0);

  useEffect(() => {
    if (!planning) return;
    const id = setInterval(() => setStep((s) => (s + 1) % THINKING.length), 1400);
    return () => clearInterval(id);
  }, [planning]);

  function plan() {
    if (!text.trim() || planning) return;
    setStep(0);
    startPlanning(async () => {
      const res = await planTasks(text, defaultClientId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (!res.tasks.length) {
        toast.info(res.message ?? "V texte som nenašiel žiadnu úlohu.");
        return;
      }
      setRows(res.tasks.map((t) => ({ ...t, key: ++keyRef.current, include: true })));
      setMessage(res.message);
    });
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);
  }

  function save() {
    const selected = (rows ?? []).filter((r) => r.include && r.title.trim());
    if (!selected.length) return;
    startSaving(async () => {
      const res = await createTasks(selected.map(({ key: _key, include: _include, ...t }) => ({ ...t, title: t.title.trim() })));
      if (res.ok) {
        toast.success(res.count === 1 ? "Pridaný 1 task" : `Pridaných ${res.count} taskov`);
        setRows(null);
        setMessage(null);
        setText("");
      } else toast.error(res.error);
    });
  }

  const selectedCount = rows?.filter((r) => r.include).length ?? 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-blue/50 via-white/[0.08] to-brand-orange/50 p-px shadow-xl shadow-black/30">
      <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-card/95 backdrop-blur">
        <div className="pointer-events-none absolute -top-20 -right-10 size-48 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className={cn("relative", compact ? "p-3" : "p-4 sm:p-5")}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-gradient shadow-md shadow-brand-orange/20">
              <Sparkles className="size-4 text-white" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">AI asistent</p>
              {!compact ? <p className="text-xs text-muted-foreground">Napíš voľným textom, čo treba urobiť – tasky pripravím za teba.</p> : null}
            </div>
          </div>

          {!rows ? (
            <div className="grid gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    plan();
                  }
                }}
                placeholder={PLACEHOLDER}
                rows={compact ? 2 : 3}
                disabled={planning}
                className="resize-none border-white/10 bg-black/20 text-sm leading-relaxed placeholder:text-muted-foreground/60"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="hidden text-[11px] text-muted-foreground/70 sm:block">⌘ + Enter na odoslanie</span>
                <Button onClick={plan} disabled={planning || !text.trim()} className="ml-auto">
                  {planning ? (
                    <>
                      <Loader2 className="animate-spin" /> {THINKING[step]}
                    </>
                  ) : (
                    <>
                      <Sparkles /> Pripraviť tasky
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {message ? <p className="rounded-lg bg-brand-blue/10 px-3 py-2 text-xs text-blue-100 ring-1 ring-brand-blue/20">{message}</p> : null}
              <ul className="grid gap-2">
                {rows.map((r) => (
                  <li
                    key={r.key}
                    className={cn(
                      "grid gap-2 rounded-xl bg-white/[0.03] p-2.5 ring-1 ring-white/[0.07] transition-opacity",
                      !r.include && "opacity-45",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => update(r.key, { include: e.target.checked })}
                        className="size-4 shrink-0 accent-primary"
                        aria-label="Pridať tento task"
                      />
                      <Input value={r.title} onChange={(e) => update(r.key, { title: e.target.value })} className="h-8 flex-1 font-medium" aria-label="Názov" />
                      <Button variant="ghost" size="icon-sm" onClick={() => setRows((rs) => rs?.filter((x) => x.key !== r.key) ?? null)} aria-label="Odstrániť">
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6 sm:grid-cols-4">
                      <NativeSelect value={r.client_id ?? ""} onChange={(e) => update(r.key, { client_id: e.target.value || null })} aria-label="Klient">
                        <option value="">Interné</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </NativeSelect>
                      <Input
                        type="date"
                        value={r.due_date ?? ""}
                        onChange={(e) => update(r.key, { due_date: e.target.value || null, due_time: e.target.value ? r.due_time : null })}
                        aria-label="Deadline"
                      />
                      <Input
                        type="time"
                        value={r.due_time ?? ""}
                        disabled={!r.due_date}
                        onChange={(e) => update(r.key, { due_time: e.target.value || null })}
                        aria-label="Čas"
                      />
                      <NativeSelect value={r.priority} onChange={(e) => update(r.key, { priority: e.target.value as Row["priority"] })} aria-label="Priorita">
                        {Object.entries(TASK_PRIORITY).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label} priorita
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    {r.description || r.due_date || r.assignee_id ? (
                      <p className="pl-6 text-xs text-muted-foreground">
                        {[
                          r.due_date ? relativeDue(r.due_date) : null,
                          r.assignee_id ? `zodpovedá ${profiles.find((p) => p.id === r.assignee_id)?.full_name ?? "člen tímu"}` : null,
                          r.description,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRows(null)} disabled={saving}>
                  <ArrowLeft /> Upraviť zadanie
                </Button>
                <Button onClick={save} disabled={saving || selectedCount === 0}>
                  {saving ? <Loader2 className="animate-spin" /> : <Check />}
                  {selectedCount === 1 ? "Pridať 1 task" : `Pridať ${selectedCount} ${selectedCount >= 2 && selectedCount <= 4 ? "tasky" : "taskov"}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
