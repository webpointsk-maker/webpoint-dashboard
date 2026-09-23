import Image from "next/image";
import { cn } from "@/lib/utils";

/** Znak WebPoint (sieťové „W“ s kurzorom) */
export function LogoMark({ className }: { className?: string }) {
  return <Image src="/logo-mark.png" alt="" width={320} height={217} priority className={cn("h-7 w-auto select-none", className)} />;
}

/** Wordmark „WebPoint“ – Web biele, Point oranžové */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-lg font-bold tracking-tight", className)}>
      <span className="text-white">Web</span>
      <span className="text-brand-orange">Point</span>
    </span>
  );
}

export function Logo({ className, markClassName, wordClassName }: { className?: string; markClassName?: string; wordClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <Wordmark className={wordClassName} />
    </span>
  );
}
