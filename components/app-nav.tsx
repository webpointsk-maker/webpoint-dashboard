"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CreditCard, LayoutDashboard, ListChecks, LogOut, Menu, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/app/actions";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/", label: "Prehľad", icon: LayoutDashboard },
  { href: "/klienti", label: "Klienti", icon: Users },
  { href: "/tasky", label: "Tasky", icon: ListChecks },
  { href: "/platby", label: "Platby", icon: CreditCard },
  { href: "/kalendar", label: "Kalendár", icon: CalendarDays },
  { href: "/nastavenia", label: "Nastavenia", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2.5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">W</div>
      <span className="font-semibold">WebPoint</span>
    </Link>
  );
}

function UserBox({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
      <Avatar className="size-8">
        {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
        <AvatarFallback>{initials(profile.full_name ?? profile.email)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{profile.full_name ?? profile.email}</p>
        <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
      </div>
      <form action={signOut}>
        <Button variant="ghost" size="icon-sm" aria-label="Odhlásiť sa" title="Odhlásiť sa">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

export function AppSidebar({ profile }: { profile: Profile }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-3 pt-5 md:flex">
      <Brand />
      <div className="flex-1">
        <NavLinks />
      </div>
      <UserBox profile={profile} />
    </aside>
  );
}

export function MobileHeader({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
      <Brand />
      <Button variant="ghost" size="icon" aria-label="Menu" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-6 p-3 pt-5">
          <SheetTitle className="sr-only">Navigácia</SheetTitle>
          <Brand />
          <div className="flex-1">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <UserBox profile={profile} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
