"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/field";
import { deletePackage, savePackage } from "@/app/(dashboard)/nastavenia/actions";
import { PLATFORMS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import type { Package } from "@/lib/types";

export function PackagesManager({ packages, usage }: { packages: Package[]; usage: Record<string, number> }) {
  const [editing, setEditing] = useState<Package | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(p: Package) {
    if (!confirm(`Zmazať balík „${p.name}“? Klienti s týmto balíkom zostanú bez balíka.`)) return;
    startTransition(async () => {
      const res = await deletePackage(p.id);
      if (res.ok) toast.success("Balík zmazaný");
      else toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-3">
      <ul className="divide-y rounded-lg border">
        {packages.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {p.name} {!p.is_active ? <span className="text-xs font-normal text-muted-foreground">(neaktívny)</span> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {formatEur(p.monthly_price)} / mes.
                {p.posts_per_month ? ` · ${p.posts_per_month} príspevkov` : ""}
                {p.platforms.length ? ` · ${p.platforms.map((x) => PLATFORMS[x] ?? x).join(", ")}` : ""}
                {` · ${usage[p.id] ?? 0} klientov`}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(p)} aria-label="Upraviť">
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => remove(p)} disabled={pending} aria-label="Zmazať">
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setEditing("new")}>
        <Plus /> Pridať balík
      </Button>
      {editing ? <PackageDialog pkg={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function PackageDialog({ pkg, onClose }: { pkg: Package | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!fd.get("is_active")) fd.set("is_active", "off");
    startTransition(async () => {
      const res = await savePackage(fd);
      if (res.ok) {
        toast.success("Balík uložený");
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pkg ? "Upraviť balík" : "Nový balík"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Názov" htmlFor="name" className="sm:col-span-3">
              <Input id="name" name="name" required defaultValue={pkg?.name} />
            </Field>
            <Field label="Cena € / mes." htmlFor="monthly_price">
              <Input id="monthly_price" name="monthly_price" type="number" step="0.01" min="0" required defaultValue={pkg?.monthly_price} />
            </Field>
            <Field label="Príspevkov / mes." htmlFor="posts_per_month">
              <Input id="posts_per_month" name="posts_per_month" type="number" min="0" defaultValue={pkg?.posts_per_month ?? ""} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
              <input type="checkbox" name="is_active" value="on" defaultChecked={pkg?.is_active ?? true} className="accent-primary" />
              Aktívny
            </label>
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Platformy</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(PLATFORMS).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="platforms" value={k} defaultChecked={pkg?.platforms.includes(k)} className="accent-primary" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <Field label="Čo balík obsahuje" htmlFor="description">
            <Textarea id="description" name="description" rows={3} defaultValue={pkg?.description ?? ""} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
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
