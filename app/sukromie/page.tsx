export const metadata = { title: "Ochrana súkromia · WebPoint Dashboard" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Zásady ochrany súkromia – WebPoint Dashboard</h1>
      <p>
        WebPoint Dashboard je interná aplikácia agentúry WebPoint (kontakt: webpointsk@gmail.com), ktorú používajú len pozvaní členovia tímu.
      </p>
      <h2 className="pt-2 text-lg font-medium">Aké údaje spracúvame</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Z Google účtu: meno, email a profilovú fotku – na prihlásenie a identifikáciu člena tímu.</li>
        <li>
          Google Kalendár: aplikácia vytvára a upravuje udalosti v kalendári „WebPoint – deadliny“ (deadliny taskov) a číta udalosti z hlavného
          kalendára, aby ich zobrazila v dashboarde.
        </li>
        <li>Pracovné údaje agentúry: klienti, tasky, platby a poznámky zadané používateľmi.</li>
      </ul>
      <h2 className="pt-2 text-lg font-medium">Ako údaje chránime</h2>
      <p>
        Údaje sú uložené v databáze Supabase (EÚ) s prístupom len pre prihlásených členov tímu. Prístupový token ku Google Kalendáru je uložený
        šifrovane. Údaje nepredávame ani nezdieľame s tretími stranami a nepoužívame ich na reklamu.
      </p>
      <p>
        Použitie údajov z Google API je v súlade s{" "}
        <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , vrátane požiadaviek Limited Use.
      </p>
      <h2 className="pt-2 text-lg font-medium">Zrušenie prístupu</h2>
      <p>
        Prístup aplikácie ku Google účtu môžeš kedykoľvek zrušiť na{" "}
        <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
          myaccount.google.com/permissions
        </a>
        . Na vymazanie údajov napíš na webpointsk@gmail.com.
      </p>
    </main>
  );
}
