"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateClientNotes } from "@/app/(dashboard)/klienti/actions";

export function ClientNotes({ clientId, notes }: { clientId: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== (notes ?? "");

  return (
    <div className="grid gap-2">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={6} placeholder="Prístupy, preferencie klienta, tón komunikácie, dôležité info…" />
      {dirty ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateClientNotes(clientId, value);
                if (res.ok) toast.success("Poznámky uložené");
                else toast.error(res.error);
              })
            }
          >
            Uložiť poznámky
          </Button>
        </div>
      ) : null}
    </div>
  );
}
