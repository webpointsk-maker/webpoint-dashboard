"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CreditCard, LayoutDashboard, ListChecks, LogOut, Menu, Settings, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/brand";
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
    <nav className="grid gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.04] hover:text-foreground",
              active && "bg-gradient-to-r from-brand-orange/15 via-brand-orange/[0.06] to-transparent text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-orange opacity-0 transition-opacity",
                active && "opacity-100",
              )}
            />
            <Icon className={cn("size-[18px] transition-colors", active ? "text-brand-orange" : "group-hover:text-brand-blue-light")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center px-2">
      <Logo />
    </Link>
  );
}

function UserBox({ profile }: { profile: Profile }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
      <Avatar className="size-8 ring-2 ring-brand-orange/40">
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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 border-r border-sidebar-border bg-sidebar/90 p-4 pt-6 backdrop-blur md:flex">
      <Brand />
      <div className="flex-1">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/60 uppercase">Menu</p>
        <NavLinks />
      </div>
      <UserBox profile={profile} />
    </aside>
  );
}

export function MobileHeader({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-sidebar/90 px-4 backdrop-blur md:hidden">
      <Brand />
      <Button variant="ghost" size="icon" aria-label="Menu" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-8 border-sidebar-border bg-sidebar p-4 pt-6">
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
