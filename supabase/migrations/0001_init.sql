-- WebPoint Dashboard – úvodná schéma
-- Spusti v Supabase: SQL Editor → vlož celý súbor → Run

-- ---------------------------------------------------------------------------
-- Typy
-- ---------------------------------------------------------------------------
create type client_status as enum ('lead', 'onboarding', 'active', 'paused', 'ended');
create type payment_status as enum ('pending', 'paid', 'overdue');
create type task_status as enum ('todo', 'in_progress', 'review', 'done');
create type task_priority as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- Tím a prístup
-- ---------------------------------------------------------------------------
create table allowed_emails (
  email text primary key,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create or replace function is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'admin'
  );
$$;

-- Po prvom prihlásení sa vytvorí profil (len pre povolené emaily)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_role text;
begin
  select role into allowed_role from allowed_emails where lower(email) = lower(new.email);
  if allowed_role is not null then
    insert into profiles (id, email, full_name, avatar_url, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      new.raw_user_meta_data ->> 'avatar_url',
      allowed_role
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Pre používateľov, ktorí sa prihlásili skôr, než boli pridaní do allowed_emails
create or replace function ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u auth.users%rowtype;
  allowed_role text;
begin
  select * into u from auth.users where id = auth.uid();
  if u.id is null then return; end if;
  select role into allowed_role from allowed_emails where lower(email) = lower(u.email);
  if allowed_role is null then return; end if;
  insert into profiles (id, email, full_name, avatar_url, role)
  values (
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.raw_user_meta_data ->> 'avatar_url',
    allowed_role
  )
  on conflict (id) do update set role = excluded.role;
end;
$$;

-- ---------------------------------------------------------------------------
-- Balíky
-- ---------------------------------------------------------------------------
create table packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_price numeric(10, 2) not null default 0,
  description text,
  posts_per_month int,
  platforms text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Klienti
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  ico text,
  website text,
  status client_status not null default 'active',
  package_id uuid references packages on delete set null,
  custom_price numeric(10, 2),
  start_date date,
  billing_day int not null default 15 check (billing_day between 1 and 28),
  platforms text[] not null default '{}',
  assigned_to uuid references profiles on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_status_idx on clients (status);

-- ---------------------------------------------------------------------------
-- Platby (mesačné paušály)
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients on delete cascade,
  period date not null check (extract(day from period) = 1),
  amount numeric(10, 2) not null,
  due_date date not null,
  status payment_status not null default 'pending',
  paid_at date,
  note text,
  created_at timestamptz not null default now(),
  unique (client_id, period)
);

create index payments_period_idx on payments (period);

-- ---------------------------------------------------------------------------
-- Tasky
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  due_date date,
  due_time time,
  assignee_id uuid references profiles on delete set null,
  google_event_id text unique,
  completed_at timestamptz,
  created_by uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_client_idx on tasks (client_id);
create index tasks_due_idx on tasks (due_date) where status <> 'done';

-- ---------------------------------------------------------------------------
-- Google Kalendár (jedno agentúrne prepojenie; prístup len zo servera)
-- ---------------------------------------------------------------------------
create table google_connection (
  id int primary key default 1 check (id = 1),
  connected_by uuid references profiles on delete set null,
  google_email text,
  refresh_token_encrypted text not null,
  calendar_id text not null,
  sync_token text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at before update on clients
  for each row execute function set_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute function set_updated_at();

create or replace function set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at before insert or update of status on tasks
  for each row execute function set_task_completed_at();

-- ---------------------------------------------------------------------------
-- Platby: generovanie a po splatnosti
-- ---------------------------------------------------------------------------
create or replace function generate_payments(p_period date)
returns int
language plpgsql
as $$
declare
  inserted int;
  period_start date := date_trunc('month', p_period)::date;
begin
  insert into payments (client_id, period, amount, due_date)
  select
    c.id,
    period_start,
    coalesce(c.custom_price, p.monthly_price, 0),
    period_start + (c.billing_day - 1)
  from clients c
  left join packages p on p.id = c.package_id
  where c.status = 'active'
    and coalesce(c.custom_price, p.monthly_price, 0) > 0
    and (c.start_date is null or c.start_date < (period_start + interval '1 month')::date)
  on conflict (client_id, period) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

create or replace function mark_overdue_payments()
returns int
language plpgsql
as $$
declare
  updated int;
begin
  update payments
  set status = 'overdue'
  where status = 'pending'
    and due_date < (now() at time zone 'Europe/Bratislava')::date;
  get diagnostics updated = row_count;
  return updated;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table allowed_emails enable row level security;
alter table profiles enable row level security;
alter table packages enable row level security;
alter table clients enable row level security;
alter table payments enable row level security;
alter table tasks enable row level security;
alter table google_connection enable row level security;
-- google_connection nemá žiadne policies → prístup len cez secret (service role) kľúč

create policy "team reads allowed_emails" on allowed_emails
  for select using (is_team_member());
create policy "admin manages allowed_emails" on allowed_emails
  for all using (is_admin()) with check (is_admin());

create policy "team reads profiles" on profiles
  for select using (is_team_member());
create policy "user updates own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "team all packages" on packages
  for all using (is_team_member()) with check (is_team_member());
create policy "team all clients" on clients
  for all using (is_team_member()) with check (is_team_member());
create policy "team all payments" on payments
  for all using (is_team_member()) with check (is_team_member());
create policy "team all tasks" on tasks
  for all using (is_team_member()) with check (is_team_member());

-- ---------------------------------------------------------------------------
-- Úvodné dáta
-- ---------------------------------------------------------------------------
insert into packages (name, monthly_price, description, posts_per_month, platforms) values
  ('Social Basic', 250, 'Správa 1 sociálnej siete, základná grafika', 8, '{instagram}'),
  ('Social Standard', 450, 'Správa 2 sociálnych sietí, grafika, stories, mesačný report', 12, '{facebook,instagram}'),
  ('Social Premium', 750, 'Správa 3 sietí, video obsah (reels/TikTok), komunita, report', 20, '{facebook,instagram,tiktok}');

-- DÔLEŽITÉ: nahraď svojím Google emailom, ktorým sa budeš prihlasovať (admin)
insert into allowed_emails (email, role) values ('webpointsk@gmail.com', 'admin');
