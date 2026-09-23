import { LoginButton } from "./login-button";

export const metadata = { title: "Prihlásenie · WebPoint" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">W</div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">WebPoint</h1>
            <p className="text-sm text-muted-foreground">Klientsky dashboard</p>
          </div>
        </div>
        <LoginButton />
        {error ? <p className="mt-4 text-sm text-destructive">Prihlásenie zlyhalo. Skús to znova.</p> : null}
      </div>
    </main>
  );
}
