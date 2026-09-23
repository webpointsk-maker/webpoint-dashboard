"use client";

import { useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { addTeamMember, removeTeamMember } from "@/app/(dashboard)/nastavenia/actions";

type Member = { email: string; role: string; name: string | null; joined: boolean };

export function TeamManager({ members, isAdmin }: { members: Member[]; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="grid gap-3">
      <ul className="divide-y rounded-lg border">
        {members.map((m) => (
          <li key={m.email} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.name ?? m.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.name ? `${m.email} · ` : ""}
                {m.role === "admin" ? "administrátor" : "člen"}
                {!m.joined ? " · ešte sa neprihlásil" : ""}
              </p>
            </div>
            {isAdmin ? (
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                aria-label="Odobrať"
                onClick={() => {
                  if (!confirm(`Odobrať prístup pre ${m.email}?`)) return;
                  startTransition(async () => {
                    const res = await removeTeamMember(m.email);
                    if (res.ok) toast.success("Prístup odobratý");
                    else toast.error(res.error);
                  });
                }}
              >
                <Trash2 />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {isAdmin ? (
        <form
          ref={formRef}
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await addTeamMember(fd);
              if (res.ok) {
                toast.success("Pridané – kolega sa môže prihlásiť cez Google");
                formRef.current?.reset();
              } else toast.error(res.error);
            });
          }}
        >
          <Input name="email" type="email" required placeholder="kolega@gmail.com" className="sm:flex-1" />
          <div className="sm:w-36">
            <NativeSelect name="role" defaultValue="member">
              <option value="member">Člen</option>
              <option value="admin">Administrátor</option>
            </NativeSelect>
          </div>
          <Button type="submit" disabled={pending}>
            Pridať
          </Button>
        </form>
      ) : null}
    </div>
  );
}
