-- WebPoint Dashboard – balíky ŠTART/RAST/EXPANZIA, splátky, klienti
-- Spusti v Supabase: SQL Editor → vlož celý súbor → Run (dá sa spustiť aj opakovane)

-- ---------------------------------------------------------------------------
-- Balíky: počet reels a kampaní
-- ---------------------------------------------------------------------------
alter table packages add column if not exists reels_per_month int;
alter table packages add column if not exists campaigns_per_month int;
comment on column packages.posts_per_month is 'Statické posty / karusely mesačne';

-- ---------------------------------------------------------------------------
-- Splátky: klient môže platiť mesačne vo viacerých častiach
-- payment_schedule = [{"day": 1, "amount": 200}, {"day": 5, "amount": 200}]
-- ---------------------------------------------------------------------------
alter table clients add column if not exists payment_schedule jsonb;
alter table payments add column if not exists installment int not null default 1;
alter table payments drop constraint if exists payments_client_id_period_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_client_period_installment_key') then
    alter table payments add constraint payments_client_period_installment_key unique (client_id, period, installment);
  end if;
end $$;

create or replace function generate_payments(p_period date)
returns int
language plpgsql
as $$
declare
  inserted int;
  period_start date := date_trunc('month', p_period)::date;
begin
  insert into payments (client_id, period, installment, amount, due_date)
  select c.id, period_start, s.idx, s.amount, period_start + (least(greatest(s.day, 1), 28) - 1)
  from clients c
  left join packages p on p.id = c.package_id
  cross join lateral (
    select (e ->> 'day')::int as day, (e ->> 'amount')::numeric as amount, t.ord::int as idx
    from jsonb_array_elements(case when jsonb_typeof(c.payment_schedule) = 'array' then c.payment_schedule else '[]'::jsonb end)
      with ordinality as t(e, ord)
    union all
    select c.billing_day, coalesce(c.custom_price, p.monthly_price, 0), 1
    where coalesce(jsonb_array_length(case when jsonb_typeof(c.payment_schedule) = 'array' then c.payment_schedule end), 0) = 0
  ) s
  where c.status = 'active'
    and s.amount > 0
    and (c.start_date is null or c.start_date < (period_start + interval '1 month')::date)
  on conflict (client_id, period, installment) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Balíky podľa cenníka
-- ---------------------------------------------------------------------------
delete from packages
where name in ('Social Basic', 'Social Standard', 'Social Premium')
  and not exists (select 1 from clients where clients.package_id = packages.id);

insert into packages (name, monthly_price, reels_per_month, posts_per_month, campaigns_per_month, platforms, description)
select v.* from (values
  ('ŠTART', 600::numeric, 8, 4, 1, '{facebook,instagram}'::text[],
   'Rozbeh značky a prvý stály kanál na klientov. 8× Reels (2 týždenne), 4× statické posty/karusely, návrh nápadov a scenárov, natočenie a strih, 1× Meta kampaň na akvizíciu. Automatizácia: zachytenie leadov do CRM, okamžitá odpoveď leadu, CRM kanban, pripomienka nezavolaným (2 h).'),
  ('RAST', 800::numeric, 12, 6, 2, '{facebook,instagram}'::text[],
   'Viac obsahu a stály tlak na získavanie klientov. 12× Reels (3 týždenne), 6× statické posty/karusely, nápady a scenáre, natočenie a strih, 2× Meta kampane (akvizícia + retargeting). Automatizácia ako ŠTART + reputačný systém (Google recenzie) + referral program.'),
  ('EXPANZIA', 950::numeric, 16, 10, 3, '{facebook,instagram}'::text[],
   'Maximálne pokrytie, výkon a exkluzivita v regióne. 16× Reels (4 týždenne), 10× statické posty/karusely, nápady a scenáre, natočenie a strih, 3× Meta kampane (akvizícia + retargeting + A/B test kreatív). Exkluzivita v odvetví a meste, prioritné SLA na leady (SMS do 15 min), kvartálny strategický call. Plná automatizácia.')
) as v(name, monthly_price, reels_per_month, posts_per_month, campaigns_per_month, platforms, description)
where not exists (select 1 from packages p where p.name = v.name);

-- ---------------------------------------------------------------------------
-- Klienti
-- ---------------------------------------------------------------------------
insert into clients (name, contact_person, status, package_id, custom_price, billing_day, payment_schedule, platforms, notes)
select v.name, v.contact_person, v.status::client_status, (select id from packages where name = v.package_name), v.custom_price, v.billing_day, v.payment_schedule, '{facebook,instagram}', v.notes
from (values
  ('Peter Sámal', 'Peter Sámal', 'active', 'ŠTART', 400::numeric, 1, null::jsonb,
   'Osobný tréner, Bratislava. Custom ŠTART: 12× Reels + 1× Meta kampaň, 0 statických postov (nahradené 4 extra reels).'),
  ('La Joga', null, 'active', 'ŠTART', 400::numeric, 1, null::jsonb,
   'Jóga štúdio, Žilina. 2 paralelné Meta kampane (warm retargeting + cold na skúšobnú lekciu) + sales kampaň na permanentky.'),
  ('Realitka pre každého', 'Daniel Marčan', 'active', 'ŠTART', 400::numeric, 1, null::jsonb,
   'Reality. 12× Reels + Meta kampaň, 0 statických postov.'),
  ('Paradise', null, 'active', 'RAST', 600::numeric, 21, null::jsonb,
   'Kozmetický salón, Martin. Meta kampaň + súťaž/giveaway s 50 % zľavou. Platí okolo pondelka v danom týždni.'),
  ('Tribeca Real', null, 'onboarding', null, null::numeric, 1, null::jsonb,
   'Skúšobná doba – zatiaľ neplatí. 1 natáčací deň mesačne → 8 videí + ad videá, publikovanie 2× týždenne.'),
  ('Scream Tattoo – content', 'Martin', 'onboarding', null, null::numeric, 1, null::jsonb,
   'Skúšobná doba – zatiaľ neplatí. Natáčanie a content.'),
  ('Scream Tattoo – lead gen', null, 'active', null, null::numeric, 1, null::jsonb,
   'Tatér. Lead gen kampaň, reklamný budget 150 €, 30 % zľava. Platba zatiaľ neevidovaná – doplň cenu.'),
  ('GetFit', null, 'active', 'ŠTART', null::numeric, 12, null::jsonb,
   'CrossFit. Meta kampane na tréningy + permanentky + video obsah.'),
  ('Bella Donna', null, 'active', null, 400::numeric, 1, '[{"day": 1, "amount": 200}, {"day": 5, "amount": 200}]'::jsonb,
   'Kaderníctvo, Žilina. 400 €/mes v dvoch splátkach: 200 € okolo 1. a 200 € okolo 5. v mesiaci.')
) as v(name, contact_person, status, package_name, custom_price, billing_day, payment_schedule, notes)
where not exists (select 1 from clients c where c.name = v.name);

-- ---------------------------------------------------------------------------
-- Platby za aktuálny mesiac (Paradise už zaplatila v pondelok 21. 9.)
-- ---------------------------------------------------------------------------
select generate_payments(date_trunc('month', now() at time zone 'Europe/Bratislava')::date);

update payments set status = 'paid', paid_at = date '2026-09-21'
where client_id = (select id from clients where name = 'Paradise')
  and period = date '2026-09-01';
