import Link from "next/link";
import { cn } from "@/lib/utils";

const TONES = {
  blue: { chip: "bg-brand-blue/15 text-brand-blue-light ring-brand-blue/25", glow: "from-brand-blue/20", value: "" },
  orange: { chip: "bg-brand-orange/15 text-brand-orange-light ring-brand-orange/25", glow: "from-brand-orange/20", value: "" },
  green: { chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25", glow: "from-emerald-500/15", value: "text-emerald-300" },
  red: { chip: "bg-red-500/15 text-red-300 ring-red-500/30", glow: "from-red-500/20", value: "text-red-300" },
  neutral: { chip: "bg-white/5 text-muted-foreground ring-white/10", glow: "from-white/5", value: "" },
} as const;

export type KpiTone = keyof typeof TONES;

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  icon?: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  href?: string;
}) {
  const t = TONES[tone];
  const body = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-card/80 p-4 backdrop-blur transition-all",
        href && "hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg hover:shadow-black/40",
      )}
    >
      <div className={cn("pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-gradient-to-br to-transparent blur-2xl", t.glow)} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", t.chip)}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className={cn("relative mt-2 font-heading text-2xl font-bold tracking-tight tabular-nums sm:text-[1.7rem]", t.value)}>{value}</p>
      {hint ? <p className="relative mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
