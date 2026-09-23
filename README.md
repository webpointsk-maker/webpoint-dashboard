# WebPoint Dashboard

Interný dashboard agentúry WebPoint: klienti, balíky, mesačné platby, tasky s deadlinmi a obojsmerná synchronizácia s Google Kalendárom.

**Stack:** Next.js 16 · Supabase (Postgres + Google prihlásenie) · Google Calendar API · Vercel

## Čo to vie

- **Prehľad** – aktívni klienti, MRR, platby po splatnosti, tasky po termíne / dnes / tento týždeň, dnešné stretnutia z kalendára
- **Klienti** – stav (lead → onboarding → aktívny → pozastavený → ukončený), balík, cena, kontakt, platformy, poznámky
- **Tasky** – zoznam aj kanban (drag & drop), filtre podľa klienta, osoby a termínu
- **Platby** – mriežka klienti × mesiace, klik na stav = zmena, automatické generovanie paušálov
- **Kalendár** – mesačný pohľad s deadlinmi aj udalosťami z Google
- **Nastavenia** – balíky, tím (kto sa môže prihlásiť), pripojenie Google Kalendára

## Nastavenie (jednorazovo, ~20 minút)

### 1. Supabase

1. Na [supabase.com](https://supabase.com) vytvor nový projekt (región Frankfurt).
2. **SQL Editor** → New query → vlož celý obsah [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**.
   - Na konci súboru je `insert into allowed_emails` s tvojím emailom ako admin – ak sa budeš prihlasovať iným Google účtom, zmeň ho pred spustením.
3. **Project Settings → API Keys**: skopíruj `Project URL`, `publishable` a `secret` kľúč do `.env.local` (vzor v `.env.example`).

### 2. Google Cloud (prihlásenie + kalendár)

1. [console.cloud.google.com](https://console.cloud.google.com) → nový projekt „WebPoint Dashboard“.
2. **APIs & Services → Library** → zapni **Google Calendar API**.
3. **OAuth consent screen** → External → vyplň názov a email → v **Audience / Test users** pridaj Google účty tímu.
4. **Credentials → Create credentials → OAuth client ID → Web application**. Do **Authorized redirect URIs** pridaj:
   - `https://<tvoj-projekt>.supabase.co/auth/v1/callback` (prihlásenie)
   - `http://localhost:3000/api/google/callback` (kalendár lokálne)
   - `https://<tvoja-domena>/api/google/callback` (kalendár po nasadení)
5. Client ID a Secret:
   - vlož do `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
   - a v Supabase **Authentication → Sign In / Providers → Google** zapni a vlož ich tam tiež.
6. V Supabase **Authentication → URL Configuration**: Site URL = adresa aplikácie, do Redirect URLs pridaj `http://localhost:3000/**` a `https://<tvoja-domena>/**`.

### 3. Zvyšok `.env.local`

```bash
openssl rand -hex 32   # → ENCRYPTION_KEY
openssl rand -hex 32   # → CRON_SECRET
```

### 4. Spustenie lokálne

```bash
npm install
npm run dev
```

Otvor http://localhost:3000, prihlás sa cez Google, v **Nastaveniach** klikni na **Pripojiť Google Kalendár**.

## Nasadenie na Vercel

1. Nahraj projekt na GitHub a na [vercel.com](https://vercel.com) ho importuj.
2. V **Settings → Environment Variables** vlož všetky premenné z `.env.local` (`NEXT_PUBLIC_APP_URL` = produkčná adresa).
3. Pridaj produkčné redirect URL do Google Cloud a Supabase (kroky 2.4 a 2.6).
4. `vercel.json` spúšťa denný cron (`/api/cron/daily`, 7:00): vygeneruje platby za aktuálny mesiac, označí platby po splatnosti a synchronizuje kalendár.

### Častejšia synchronizácia z Google (voliteľné)

Kalendár sa synchronizuje automaticky pri otvorení Prehľadu, Taskov a Kalendára (max. raz za 2 minúty), tlačidlom v Nastaveniach a denným cronom. Ak chceš, aby sa zmeny z Google prenášali aj keď nikto dashboard nemá otvorený, spusti v Supabase SQL Editore (zapni najprv rozšírenia `pg_cron` a `pg_net` v Database → Extensions):

```sql
select cron.schedule('webpoint-calendar-sync', '*/10 * * * *', $$
  select net.http_get(
    url := 'https://<tvoja-domena>/api/cron/calendar-sync',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

## Ako funguje synchronizácia kalendára

- Pri pripojení sa v Google účte vytvorí kalendár **„WebPoint – deadliny“** (môžeš ho zdieľať s tímom priamo v Google Kalendári).
- Task s deadlinom → event `[Klient] Názov tasku` (bez času = celodenný, s časom = 30 min). Hotový task dostane ✓.
- Presunieš event v Google → zmení sa deadline tasku. Zmažeš event v Google → task ostane, len sa odpojí od kalendára.
- Nový event vytvorený priamo v kalendári „WebPoint – deadliny“ → vznikne z neho interný task.
- V dashboarde sa zobrazujú aj udalosti z tvojho hlavného kalendára (len na čítanie).

## Štruktúra

```
app/(dashboard)/        stránky (prehľad, klienti, tasky, platby, kalendár, nastavenia) + server actions
app/api/google/         OAuth pripojenie kalendára
app/api/cron/           denný cron a sync kalendára
components/             UI komponenty (shadcn/ui v components/ui)
lib/google/calendar.ts  obojsmerná synchronizácia s Google Kalendárom
lib/data.ts             načítanie dát zo Supabase
supabase/migrations/    databázová schéma + RLS
```
