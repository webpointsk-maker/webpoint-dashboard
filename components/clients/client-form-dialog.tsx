"use client";

import { useTransition } from "react";
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
import type { Client, Package, Profile } from "@/lib/types";

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
            <Field label="Vlastná cena €/mes. (nepovinné)" htmlFor="custom_price">
              <Input id="custom_price" name="custom_price" type="number" step="0.01" min="0" defaultValue={client?.custom_price ?? ""} placeholder="podľa balíka" />
            </Field>
            <Field label="Deň splatnosti (1–28)" htmlFor="billing_day">
              <Input id="billing_day" name="billing_day" type="number" min="1" max="28" defaultValue={client?.billing_day ?? 15} />
            </Field>
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
