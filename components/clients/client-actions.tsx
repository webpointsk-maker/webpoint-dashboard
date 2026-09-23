"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "./client-form-dialog";
import { deleteClient } from "@/app/(dashboard)/klienti/actions";
import type { Client, Package, Profile } from "@/lib/types";

export function ClientActions({ client, packages, profiles }: { client: Client; packages: Package[]; profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    if (!confirm(`Naozaj zmazať klienta „${client.name}“ vrátane všetkých taskov a platieb? Ak spolupráca skončila, radšej zmeň stav na „Ukončený“.`)) return;
    startTransition(async () => {
      const res = await deleteClient(client.id);
      if (res.ok) {
        toast.success("Klient zmazaný");
        router.push("/klienti");
      } else toast.error(res.error);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Upraviť
      </Button>
      <Button variant="ghost" size="icon" onClick={remove} disabled={pending} aria-label="Zmazať klienta">
        <Trash2 />
      </Button>
      {open ? <ClientFormDialog open onOpenChange={setOpen} client={client} packages={packages} profiles={profiles} /> : null}
    </>
  );
}
