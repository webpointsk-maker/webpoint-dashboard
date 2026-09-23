"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "./client-form-dialog";
import type { Package, Profile } from "@/lib/types";

export function NewClientButton({ packages, profiles }: { packages: Package[]; profiles: Profile[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Nový klient
      </Button>
      {open ? <ClientFormDialog open onOpenChange={setOpen} packages={packages} profiles={profiles} /> : null}
    </>
  );
}
