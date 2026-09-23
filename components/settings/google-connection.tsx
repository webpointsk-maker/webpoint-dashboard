"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { disconnectGoogle, syncCalendarNow } from "@/app/(dashboard)/nastavenia/actions";

export function GoogleConnection({ info, isAdmin }: { info: { googleEmail: string | null; lastSyncedAt: string | null } | null; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();

  if (!info) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          Po pripojení sa v tvojom Google účte vytvorí kalendár <strong>„WebPoint – deadliny“</strong>. Každý task s deadlinom sa doň automaticky zapíše, a keď event v Google presunieš, zmení sa aj deadline v dashboarde. Kalendár môžeš v Google zdieľať s kolegami.
        </p>
        {isAdmin ? (
          <a href="/api/google/connect" className={buttonVariants({ className: "justify-self-start" })}>
            Pripojiť Google Kalendár
          </a>
        ) : (
          <p className="text-sm">Pripojiť kalendár môže administrátor.</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm">
        Pripojené: <strong>{info.googleEmail ?? "Google účet"}</strong>
        <br />
        <span className="text-muted-foreground">
          Posledná synchronizácia:{" "}
          {info.lastSyncedAt
            ? new Intl.DateTimeFormat("sk-SK", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bratislava" }).format(new Date(info.lastSyncedAt))
            : "zatiaľ nie"}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await syncCalendarNow();
              if (res.ok) toast.success(res.message ?? "Synchronizované");
              else toast.error(res.error);
            })
          }
        >
          <RefreshCw className={pending ? "animate-spin" : undefined} /> Synchronizovať teraz
        </Button>
        {isAdmin ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm("Odpojiť Google Kalendár? Existujúce eventy v kalendári zostanú.")) return;
              startTransition(async () => {
                const res = await disconnectGoogle();
                if (res.ok) toast.success("Odpojené");
                else toast.error(res.error);
              });
            }}
          >
            Odpojiť
          </Button>
        ) : null}
      </div>
    </div>
  );
}
