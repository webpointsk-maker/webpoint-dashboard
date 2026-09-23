"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { saveClient } from "@/app/(dashboard)/klienti/actions";
import { CLIENT_STATUS, PLATFORMS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import type { Client, Installment, Package, Profile } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  packages: Package[];
  profiles: Profile[];
};

export function ClientFormDialog({ open, onOpenChange, client, packages, profiles }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [hasSchedule, setHasSchedule] = useState(Boolean(client?.payment_schedule?.length));
  const [schedule, setSchedule] = useState<Installment[]>(
    client?.payment_schedule?.length
      ? client.payment_schedule
      : [
          { day: 1, amount: 0 },
          { day: 15, amount: 0 },
        ],
  );
  const scheduleTotal = schedule.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveClient(fd);
      if (res.ok) {
        toast.success(client ? "Klient upravený" : "Klient pridaný");
        onOpenChange(false);
        if (!client && res.id) router.push(`/klienti/${res.id}`);
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? "Upraviť klienta" : "Nový klient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {client ? <input type="hidden" name="id" value={client.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Názov firmy / klienta" htmlFor="name" className="sm:col-span-2">
              <Input id="name" name="name" required autoFocus defaultValue={client?.name} />
            </Field>
            <Field label="Stav" htmlFor="status">
              <NativeSelect id="status" name="status" defaultValue={client?.status ?? "active"}>
                {Object.entries(CLIENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Zodpovedná osoba (WebPoint)" htmlFor="assigned_to">
              <NativeSelect id="assigned_to" name="assigned_to" defaultValue={client?.assigned_to ?? ""}>
                <option value="">— nikto —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <fieldset className="grid gap-4 rounded-lg border p-3 sm:grid-cols-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Balík a platby</legend>
            <Field label="Balík" htmlFor="package_id">
              <NativeSelect id="package_id" name="package_id" defaultValue={client?.package_id ?? ""}>
                <option value="">— bez balíka —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatEur(p.monthly_price)})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {!hasSchedule ? (
              <>
                <Field label="Dohodnutá cena €/mes." htmlFor="custom_price">
                  <Input id="custom_price" name="custom_price" type="number" step="0.01" min="0" defaultValue={client?.custom_price ?? ""} placeholder="podľa balíka" />
                </Field>
                <Field label="Deň splatnosti (1–28)" htmlFor="billing_day">
                  <Input id="billing_day" name="billing_day" type="number" min="1" max="28" defaultValue={client?.billing_day ?? 15} />
                </Field>
              </>
            ) : (
              <input type="hidden" name="billing_day" value={schedule[0]?.day ?? 1} />
            )}
            <div className="grid gap-2 sm:col-span-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="has_schedule" checked={hasSchedule} onChange={(e) => setHasSchedule(e.target.checked)} className="accent-primary" />
                Platí v splátkach (viac platieb mesačne)
              </label>
              {hasSchedule ? (
                <div className="grid gap-2 rounded-lg bg-white/[0.03] p-2.5 ring-1 ring-white/[0.06]">
                  {schedule.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">{i + 1}. splátka</span>
                      <Input
                        name="schedule_day"
                        type="number"
                        min="1"
                        max="28"
                        value={row.day}
                        onChange={(e) => setSchedule((s) => s.map((r, j) => (j === i ? { ...r, day: Number(e.target.value) } : r)))}
                        className="w-20"
                        aria-label="Deň"
                      />
                      <span className="text-xs text-muted-foreground">. deň</span>
                      <Input
                        name="schedule_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amount || ""}
                        onChange={(e) => setSchedule((s) => s.map((r, j) => (j === i ? { ...r, amount: Number(e.target.value) } : r)))}
                        className="w-28"
                        placeholder="suma €"
                        aria-label="Suma"
                      />
                      {schedule.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSchedule((s) => s.filter((_, j) => j !== i))} aria-label="Odstrániť splátku">
                          <X />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSchedule((s) => [...s, { day: 20, amount: 0 }])}>
                      <Plus /> Pridať splátku
                    </Button>
                    <span className="text-xs text-muted-foreground">Spolu {formatEur(scheduleTotal)} / mes.</span>
                  </div>
                </div>
              ) : null}
            </div>
            <Field label="Spolupráca od" htmlFor="start_date">
              <Input id="start_date" name="start_date" type="date" defaultValue={client?.start_date ?? ""} />
            </Field>
            <div className="grid gap-1.5 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Platformy</span>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {Object.entries(PLATFORMS).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="platforms" value={k} defaultChecked={client?.platforms.includes(k)} className="accent-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Kontakt</legend>
            <Field label="Kontaktná osoba" htmlFor="contact_person">
              <Input id="contact_person" name="contact_person" defaultValue={client?.contact_person ?? ""} />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
            </Field>
            <Field label="Telefón" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" defaultValue={client?.phone ?? ""} />
            </Field>
            <Field label="IČO" htmlFor="ico">
              <Input id="ico" name="ico" defaultValue={client?.ico ?? ""} />
            </Field>
            <Field label="Web / Instagram" htmlFor="website" className="sm:col-span-2">
              <Input id="website" name="website" defaultValue={client?.website ?? ""} placeholder="https://…" />
            </Field>
          </fieldset>

          <Field label="Poznámky" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} />
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
