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
      <ul className="grid gap-2">
        {packages.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3 ring-1 ring-white/[0.06]">
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2 text-sm font-semibold">
                <span className="font-heading">{p.name}</span>
                <span className="font-heading text-brand-orange tabular-nums">{formatEur(p.monthly_price)}</span>
                <span className="text-xs font-normal text-muted-foreground">/ mes.</span>
                {!p.is_active ? <span className="text-xs font-normal text-muted-foreground">(neaktívny)</span> : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[
                  p.reels_per_month ? `${p.reels_per_month}× reels` : null,
                  p.posts_per_month ? `${p.posts_per_month}× posty` : null,
                  p.campaigns_per_month ? `${p.campaigns_per_month}× kampaň` : null,
                  p.platforms.length ? p.platforms.map((x) => PLATFORMS[x] ?? x).join(", ") : null,
                  `${usage[p.id] ?? 0} klientov`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
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
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm sm:col-span-2">
              <input type="checkbox" name="is_active" value="on" defaultChecked={pkg?.is_active ?? true} className="accent-primary" />
              Aktívny (ponúkať novým klientom)
            </label>
            <Field label="Reels / mes." htmlFor="reels_per_month">
              <Input id="reels_per_month" name="reels_per_month" type="number" min="0" defaultValue={pkg?.reels_per_month ?? ""} />
            </Field>
            <Field label="Statické posty / mes." htmlFor="posts_per_month">
              <Input id="posts_per_month" name="posts_per_month" type="number" min="0" defaultValue={pkg?.posts_per_month ?? ""} />
            </Field>
            <Field label="Reklamné kampane" htmlFor="campaigns_per_month">
              <Input id="campaigns_per_month" name="campaigns_per_month" type="number" min="0" defaultValue={pkg?.campaigns_per_month ?? ""} />
            </Field>
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
            <Textarea id="description" name="description" rows={5} defaultValue={pkg?.description ?? ""} />
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
