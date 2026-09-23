/** Okamžitá odozva pri prepínaní stránok, kým server načíta dáta */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Načítavam">
      <div className="mb-8 space-y-2">
        <div className="h-4 w-32 rounded-md bg-brand-orange/20" />
        <div className="h-8 w-64 rounded-lg bg-white/[0.07]" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-[118px] rounded-2xl border border-white/[0.06] bg-card/60" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 rounded-2xl border border-white/[0.06] bg-card/60" />
          <div className="h-40 rounded-2xl border border-white/[0.06] bg-card/60" />
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-2xl border border-white/[0.06] bg-card/60" />
          <div className="h-40 rounded-2xl border border-white/[0.06] bg-card/60" />
        </div>
      </div>
    </div>
  );
}
