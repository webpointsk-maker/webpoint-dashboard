import { LogoMark, Wordmark } from "@/components/brand";
import { LoginButton } from "./login-button";

export const metadata = { title: "Prihlásenie · WebPoint" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -top-40 -left-40 size-[520px] rounded-full bg-brand-blue/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-[520px] rounded-full bg-brand-orange/15 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl bg-gradient-to-br from-brand-blue/40 via-white/10 to-brand-orange/40 p-px shadow-2xl shadow-black/50">
          <div className="rounded-[calc(1.5rem-1px)] bg-card/95 px-8 pt-10 pb-8 backdrop-blur">
            <div className="flex flex-col items-center text-center">
              <LogoMark className="h-20" />
              <Wordmark className="mt-4 text-3xl" />
              <p className="mt-2 text-sm text-muted-foreground">Klienti · tasky · platby · deadliny</p>
            </div>
            <div className="mt-8">
              <LoginButton />
            </div>
            {error ? <p className="mt-4 text-center text-sm text-destructive">Prihlásenie zlyhalo. Skús to znova.</p> : null}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground/70">Interný dashboard agentúry WebPoint</p>
      </div>
    </main>
  );
}
