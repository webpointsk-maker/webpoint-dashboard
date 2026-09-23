import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Nemáš prístup</h1>
        <p className="text-sm text-muted-foreground">
          Tvoj Google účet nie je v zozname tímu WebPoint. Požiadaj administrátora, aby ťa pridal v Nastaveniach.
        </p>
        <form action={signOut}>
          <Button variant="outline">Odhlásiť sa</Button>
        </form>
      </div>
    </main>
  );
}
