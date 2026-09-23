export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");
}

export function fail(error: unknown): ActionResult {
  const message = typeof error === "string" ? error : (error as { message?: string })?.message ?? "Neznáma chyba";
  return { ok: false, error: message };
}
