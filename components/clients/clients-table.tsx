"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/status-badge";
import { CLIENT_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatDate, formatEur, relativeDue, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientStatus, PaymentStatus } from "@/lib/types";

export type ClientRow = {
  id: string;
  name: string;
  contact: string | null;
  status: ClientStatus;
  packageName: string | null;
  packageId: string | null;
  price: number;
  paymentStatus: PaymentStatus | null;
  openTasks: number;
  nextDue: string | null;
  assignedTo: string | null;
  assignedName: string | null;
};

export function ClientsTable({ rows, packages, profiles }: { rows: ClientRow[]; packages: { id: string; name: string }[]; profiles: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("current");
  const [pkg, setPkg] = useState("");
  const [person, setPerson] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status === "current" ? r.status === "ended" : status && r.status !== status) return false;
      if (pkg && r.packageId !== pkg) return false;
      if (person && r.assignedTo !== person) return false;
      if (needle && !`${r.name} ${r.contact ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, status, pkg, person]);

  const today = todayISO();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative md:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať klienta…" className="pl-8" />
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Stav">
            <option value="current">Všetci okrem ukončených</option>
            <option value="">Všetky stavy</option>
            {Object.entries(CLIENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={pkg} onChange={(e) => setPkg(e.target.value)} aria-label="Balík">
            <option value="">Všetky balíky</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Zodpovedný">
            <option value="">Všetci ľudia</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-card/80 shadow-xl shadow-black/20 backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.02] [&>th]:h-11 [&>th]:text-xs [&>th]:font-semibold [&>th]:tracking-wide [&>th]:text-muted-foreground [&>th]:uppercase">
              <TableHead className="pl-4">Klient</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="hidden md:table-cell">Balík</TableHead>
              <TableHead className="text-right">€ / mes.</TableHead>
              <TableHead className="hidden sm:table-cell">Platba (tento mes.)</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Otvorené tasky</TableHead>
              <TableHead className="hidden lg:table-cell">Najbližší deadline</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Žiadni klienti
                </TableCell>
              </TableRow>
            ) : null}
            {filtered.map((r) => (
              <TableRow key={r.id} className="relative border-white/[0.05] hover:bg-white/[0.03]">
                <TableCell className="py-3 pl-4">
                  <Link href={`/klienti/${r.id}`} className="font-medium after:absolute after:inset-0 hover:text-brand-orange">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.assignedName ?? r.contact ?? ""}</div>
                </TableCell>
                <TableCell>
                  <StatusPill {...CLIENT_STATUS[r.status]} />
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.packageName ? (
                    <span className="rounded-md bg-brand-blue/10 px-1.5 py-0.5 text-xs font-semibold text-brand-blue-light ring-1 ring-brand-blue/20">{r.packageName}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">na mieru</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{r.price ? formatEur(r.price) : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {r.paymentStatus ? <StatusPill {...PAYMENT_STATUS[r.paymentStatus]} /> : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-right tabular-nums">{r.openTasks || <span className="text-muted-foreground">0</span>}</TableCell>
                <TableCell className={cn("hidden lg:table-cell text-sm", r.nextDue && r.nextDue < today && "font-medium text-red-400")}>
                  {r.nextDue ? `${formatDate(r.nextDue, { day: "numeric", month: "numeric" })} · ${relativeDue(r.nextDue)}` : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
