"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, [ "success" | "error", string ]> = {
  connected: ["success", "Google Kalendár pripojený a synchronizovaný"],
  error: ["error", "Pripojenie Google Kalendára zlyhalo"],
  forbidden: ["error", "Pripojiť kalendár môže len administrátor"],
  "no-refresh": ["error", "Google nevrátil refresh token – odober aplikácii prístup v nastaveniach Google účtu a skús znova"],
};

export function GoogleStatusToast({ status }: { status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const msg = status ? MESSAGES[status] : undefined;
    if (!msg) return;
    toast[msg[0]](msg[1]);
    router.replace(pathname);
  }, [status, router, pathname]);
  return null;
}
