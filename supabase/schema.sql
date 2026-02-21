-- FinancePro complete SQL (Supabase)
-- Includes:
-- 1) Full schema
-- 2) Roles & subscription model
-- 3) Auto profile sync from auth.users
-- 4) Safe admin promotion flow (after normal signup/login)
-- 5) Demo seed data
--
-- Run ALL in Supabase SQL Editor as postgres.

begin;

create extension if not exists "pgcrypto";

-- =========================================
-- Enums for role/subscription
-- =========================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type public.subscription_tier as enum ('free', 'pro', 'premium');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('active', 'trialing', 'past_due', 'canceled');
  end if;
end $$;

-- =========================================
-- Tables
-- =========================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  avatar_url text,
  phone text,
  role public.app_role not null default 'user',
  subscription_tier public.subscription_tier not null default 'free',
  subscription_status public.subscription_status not null default 'active',
  subscription_ends_at timestamptz,
  language text not null default 'es',
  currency text not null default 'COP',
  date_format text not null default 'DD/MM/AAAA',
  two_factor_enabled boolean not null default false,
  alerts_by_email boolean not null default true,
  profile_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns for existing environments
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role public.app_role not null default 'user';
alter table public.profiles add column if not exists subscription_tier public.subscription_tier not null default 'free';
alter table public.profiles add column if not exists subscription_status public.subscription_status not null default 'active';
alter table public.profiles add column if not exists subscription_ends_at timestamptz;
alter table public.profiles add column if not exists language text not null default 'es';
alter table public.profiles add column if not exists currency text not null default 'COP';
alter table public.profiles add column if not exists date_format text not null default 'DD/MM/AAAA';
alter table public.profiles add column if not exists two_factor_enabled boolean not null default false;
alter table public.profiles add column if not exists alerts_by_email boolean not null default true;
alter table public.profiles add column if not exists profile_visible boolean not null default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant text not null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'General',
  priority_level text not null default 'media' check (priority_level in ('alta', 'media', 'baja')),
  goal_term text not null default 'mediano' check (goal_term in ('corto', 'mediano', 'largo')),
  current_amount numeric(12,2) not null default 0,
  target_amount numeric(12,2) not null default 0,
  status text not null default 'En progreso',
  color_class text not null default 'bg-primary',
  image_url text,
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint savings_goal_non_negative check (current_amount >= 0 and target_amount >= 0)
);

create table if not exists public.upcoming_bills (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'General',
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date not null,
  status text not null default 'Pendiente',
  is_urgent boolean not null default false,
  recurrence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(12,2) not null check (monthly_limit > 0),
  month_start date not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month_start)
);

create table if not exists public.savings_contributions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  savings_goal_id bigint not null references public.savings_goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  contribution_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  investment_type text not null,
  invested_amount numeric(12,2) not null check (invested_amount >= 0),
  current_value numeric(12,2) not null check (current_value >= 0),
  started_at date,
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'Tag',
  applies_to text not null check (applies_to in ('transaction', 'budget', 'bill', 'saving')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, applies_to)
);

alter table public.savings_goals add column if not exists category text not null default 'General';
alter table public.savings_goals add column if not exists priority_level text not null default 'media';
alter table public.savings_goals add column if not exists goal_term text not null default 'mediano';
alter table public.upcoming_bills add column if not exists category text not null default 'General';
alter table public.categories add column if not exists icon text not null default 'Tag';
alter table public.categories add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'savings_goals_priority_level_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_priority_level_check
      check (priority_level in ('alta', 'media', 'baja'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'savings_goals_goal_term_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_goal_term_check
      check (goal_term in ('corto', 'mediano', 'largo'));
  end if;
end $$;

-- =========================================
-- Indexes
-- =========================================

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_subscription on public.profiles(subscription_tier, subscription_status);
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_user_category on public.transactions(user_id, category);
create index if not exists idx_savings_goals_user on public.savings_goals(user_id);
create index if not exists idx_savings_goals_category on public.savings_goals(user_id, category);
create index if not exists idx_upcoming_bills_user_due on public.upcoming_bills(user_id, due_date asc);
create index if not exists idx_upcoming_bills_category on public.upcoming_bills(user_id, category);
create index if not exists idx_budgets_user_month on public.budgets(user_id, month_start desc);
create index if not exists idx_savings_contrib_user_date on public.savings_contributions(user_id, contribution_date desc);
create index if not exists idx_savings_contrib_goal on public.savings_contributions(savings_goal_id);
create index if not exists idx_investments_user on public.investments(user_id);
create index if not exists idx_categories_user_scope on public.categories(user_id, applies_to, name);

-- =========================================
-- Utility functions/triggers
-- =========================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    role,
    subscription_tier,
    subscription_status
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    case
      when coalesce(new.raw_app_meta_data->>'role', 'user') = 'admin' then 'admin'::public.app_role
      else 'user'::public.app_role
    end,
    'free'::public.subscription_tier,
    'active'::public.subscription_status
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

-- Prevent normal users from changing their own role/subscription fields
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() = old.id then
    if new.role <> old.role
       or new.subscription_tier <> old.subscription_tier
       or new.subscription_status <> old.subscription_status
       or coalesce(new.subscription_ends_at, 'epoch'::timestamptz) <> coalesce(old.subscription_ends_at, 'epoch'::timestamptz)
    then
      raise exception 'No autorizado para cambiar rol o suscripción';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.can_manage_categories(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user
      and (p.role = 'admin'::public.app_role or p.subscription_tier in ('pro'::public.subscription_tier, 'premium'::public.subscription_tier))
  );
$$;

create or replace function public.can_view_category(owner_user uuid, viewer_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select owner_user = viewer_user
    or exists (
      select 1
      from public.profiles p
      where p.id = owner_user
        and p.role = 'admin'::public.app_role
    );
$$;

create or replace function public.is_admin_user(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user
      and p.role = 'admin'::public.app_role
  );
$$;

-- Triggers

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.handle_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.handle_updated_at();

drop trigger if exists trg_savings_goals_updated_at on public.savings_goals;
create trigger trg_savings_goals_updated_at
before update on public.savings_goals
for each row execute function public.handle_updated_at();

drop trigger if exists trg_upcoming_bills_updated_at on public.upcoming_bills;
create trigger trg_upcoming_bills_updated_at
before update on public.upcoming_bills
for each row execute function public.handle_updated_at();

drop trigger if exists trg_budgets_updated_at on public.budgets;
create trigger trg_budgets_updated_at
before update on public.budgets
for each row execute function public.handle_updated_at();

drop trigger if exists trg_investments_updated_at on public.investments;
create trigger trg_investments_updated_at
before update on public.investments
for each row execute function public.handle_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.handle_updated_at();

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for users created before trigger existed
insert into public.profiles (id, full_name, email, avatar_url, role, subscription_tier, subscription_status)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  case
    when coalesce(u.raw_app_meta_data->>'role', 'user') = 'admin' then 'admin'::public.app_role
    else 'user'::public.app_role
  end,
  'free'::public.subscription_tier,
  'active'::public.subscription_status
from auth.users u
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  updated_at = now();

insert into public.categories (user_id, name, icon, applies_to)
select
  u.id,
  base.name,
  base.icon,
  base.applies_to
from auth.users u
cross join (
  values
    ('Comida', 'Utensils', 'transaction'),
    ('Salario', 'Briefcase', 'transaction'),
    ('Transporte', 'Car', 'transaction'),
    ('Servicios', 'ReceiptText', 'bill'),
    ('Vivienda', 'Home', 'bill'),
    ('Comida', 'Utensils', 'budget'),
    ('Transporte', 'Car', 'budget'),
    ('Emergencias', 'PiggyBank', 'saving'),
    ('Vacaciones', 'Plane', 'saving'),
    ('Compras', 'Tag', 'saving'),
    ('Finanzas', 'CircleDollarSign', 'bill')
) as base(name, icon, applies_to)
on conflict (user_id, name, applies_to) do nothing;

-- =========================================
-- Grants
-- =========================================

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- =========================================
-- RLS
-- =========================================

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.upcoming_bills enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.investments enable row level security;
alter table public.categories enable row level security;

-- Profiles policies

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_admin_select_all
on public.profiles for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all
on public.profiles for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

-- Transactions policies

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own
on public.transactions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own
on public.transactions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own
on public.transactions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own
on public.transactions for delete
to authenticated
using (auth.uid() = user_id);

-- Savings goals policies

drop policy if exists savings_goals_select_own on public.savings_goals;
create policy savings_goals_select_own
on public.savings_goals for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists savings_goals_insert_own on public.savings_goals;
create policy savings_goals_insert_own
on public.savings_goals for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists savings_goals_update_own on public.savings_goals;
create policy savings_goals_update_own
on public.savings_goals for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists savings_goals_delete_own on public.savings_goals;
create policy savings_goals_delete_own
on public.savings_goals for delete
to authenticated
using (auth.uid() = user_id);

-- Upcoming bills policies

drop policy if exists upcoming_bills_select_own on public.upcoming_bills;
create policy upcoming_bills_select_own
on public.upcoming_bills for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists upcoming_bills_insert_own on public.upcoming_bills;
create policy upcoming_bills_insert_own
on public.upcoming_bills for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists upcoming_bills_update_own on public.upcoming_bills;
create policy upcoming_bills_update_own
on public.upcoming_bills for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists upcoming_bills_delete_own on public.upcoming_bills;
create policy upcoming_bills_delete_own
on public.upcoming_bills for delete
to authenticated
using (auth.uid() = user_id);

-- Budgets policies

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own
on public.budgets for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own
on public.budgets for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own
on public.budgets for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own
on public.budgets for delete
to authenticated
using (auth.uid() = user_id);

-- Savings contributions policies

drop policy if exists savings_contrib_select_own on public.savings_contributions;
create policy savings_contrib_select_own
on public.savings_contributions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists savings_contrib_insert_own on public.savings_contributions;
create policy savings_contrib_insert_own
on public.savings_contributions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists savings_contrib_update_own on public.savings_contributions;
create policy savings_contrib_update_own
on public.savings_contributions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists savings_contrib_delete_own on public.savings_contributions;
create policy savings_contrib_delete_own
on public.savings_contributions for delete
to authenticated
using (auth.uid() = user_id);

-- Investments policies

drop policy if exists investments_select_own on public.investments;
create policy investments_select_own
on public.investments for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists investments_insert_own on public.investments;
create policy investments_insert_own
on public.investments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists investments_update_own on public.investments;
create policy investments_update_own
on public.investments for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists investments_delete_own on public.investments;
create policy investments_delete_own
on public.investments for delete
to authenticated
using (auth.uid() = user_id);

-- Categories policies

drop policy if exists categories_select_visible on public.categories;
drop policy if exists categories_select_own on public.categories;
create policy categories_select_visible
on public.categories for select
to authenticated
using (public.can_view_category(user_id, auth.uid()));

drop policy if exists categories_insert_managed on public.categories;
create policy categories_insert_managed
on public.categories for insert
to authenticated
with check (auth.uid() = user_id and public.can_manage_categories(auth.uid()));

drop policy if exists categories_update_managed on public.categories;
create policy categories_update_managed
on public.categories for update
to authenticated
using (auth.uid() = user_id and public.can_manage_categories(auth.uid()))
with check (auth.uid() = user_id and public.can_manage_categories(auth.uid()));

drop policy if exists categories_delete_managed on public.categories;
create policy categories_delete_managed
on public.categories for delete
to authenticated
using (auth.uid() = user_id and public.can_manage_categories(auth.uid()));

commit;

-- =======================================================
-- PROMOTE EXISTING USER AS ADMIN (SAFE)
-- =======================================================
-- IMPORTANT:
-- 1) First create the user via normal flow (email signup, Google or GitHub).
-- 2) Then run this block to mark role/subscription as admin.

do $$
declare
  v_admin_email text := 'alexis9229@gmail.com';
  v_admin_name text := 'Administrador FinancePro';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_admin_email limit 1;

  if v_user_id is null then
    raise notice 'Admin promotion skipped: user % not found in auth.users', v_admin_email;
    return;
  end if;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
    updated_at = now()
  where id = v_user_id;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    subscription_tier,
    subscription_status
  ) values (
    v_user_id,
    v_admin_name,
    v_admin_email,
    'admin',
    'premium',
    'active'
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    role = 'admin',
    subscription_tier = 'premium',
    subscription_status = 'active',
    updated_at = now();

  raise notice 'Admin promoted successfully for %', v_admin_email;
end
$$;

-- =======================================================
-- DEMO SEED FOR THE ADMIN USER
-- =======================================================

do $$
declare
  v_target_email text := 'alexis9229@gmail.com';
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_target_email limit 1;

  if v_user_id is null then
    raise notice 'Seed skipped: admin user not found: %', v_target_email;
    return;
  end if;

  delete from public.transactions where user_id = v_user_id;
  delete from public.savings_contributions where user_id = v_user_id;
  delete from public.savings_goals where user_id = v_user_id;
  delete from public.upcoming_bills where user_id = v_user_id;
  delete from public.budgets where user_id = v_user_id;
  delete from public.investments where user_id = v_user_id;

  insert into public.transactions (user_id, merchant, category, amount, type, date, notes)
  values
    (v_user_id, 'Empresa', 'Salario', 3200.00, 'income', current_date - interval '25 day', 'Nómina mensual'),
    (v_user_id, 'Freelance', 'Ingreso extra', 450.00, 'income', current_date - interval '20 day', 'Proyecto web'),
    (v_user_id, 'Alquiler', 'Vivienda', 980.00, 'expense', current_date - interval '18 day', 'Renta mensual'),
    (v_user_id, 'Supermercado', 'Comida', 240.00, 'expense', current_date - interval '15 day', null),
    (v_user_id, 'Gasolina', 'Transporte', 72.40, 'expense', current_date - interval '12 day', null),
    (v_user_id, 'Netflix', 'Suscripciones', 15.99, 'expense', current_date - interval '10 day', null),
    (v_user_id, 'Farmacia', 'Salud', 31.75, 'expense', current_date - interval '7 day', null),
    (v_user_id, 'Cafetería', 'Comida', 12.50, 'expense', current_date - interval '3 day', null);

  insert into public.savings_goals (user_id, title, category, current_amount, target_amount, status, color_class, image_url, target_date)
  values
    (v_user_id, 'Fondo de Emergencia', 'Emergencias', 4200.00, 10000.00, 'En progreso', 'bg-primary', 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1200', current_date + interval '180 day'),
    (v_user_id, 'Vacaciones', 'Vacaciones', 1500.00, 3000.00, 'En progreso', 'bg-accent-emerald', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200', current_date + interval '120 day'),
    (v_user_id, 'Laptop nueva', 'Compras', 1800.00, 1800.00, 'Completado', 'bg-accent-coral', 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=1200', current_date - interval '5 day');

  insert into public.upcoming_bills (user_id, title, category, description, amount, due_date, status, is_urgent, recurrence)
  values
    (v_user_id, 'Renta', 'Vivienda', 'Pago mensual de vivienda', 980.00, current_date + interval '3 day', 'Pendiente', true, 'Mensual'),
    (v_user_id, 'Internet', 'Servicios', 'Fibra 600MB', 35.00, current_date + interval '5 day', 'Pendiente', false, 'Mensual'),
    (v_user_id, 'Electricidad', 'Servicios', 'Consumo del mes', 62.40, current_date + interval '7 day', 'Pendiente', false, 'Mensual'),
    (v_user_id, 'Tarjeta de crédito', 'Finanzas', 'Pago mínimo', 250.00, current_date + interval '2 day', 'Urgente', true, 'Mensual');

  insert into public.budgets (user_id, category, monthly_limit, month_start, image_url)
  values
    (v_user_id, 'Comida', 1200.00, date_trunc('month', current_date)::date, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800'),
    (v_user_id, 'Transporte', 450.00, date_trunc('month', current_date)::date, 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800'),
    (v_user_id, 'Servicios', 300.00, date_trunc('month', current_date)::date, 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800');

  insert into public.investments (user_id, name, investment_type, invested_amount, current_value, started_at, image_url, notes)
  values
    (v_user_id, 'ETF S&P 500', 'ETF', 2500.00, 2920.00, current_date - interval '200 day', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800', 'Aporte mensual automático'),
    (v_user_id, 'Bitcoin', 'Cripto', 900.00, 1115.00, current_date - interval '140 day', 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800', 'Posición a largo plazo');

  insert into public.savings_contributions (user_id, savings_goal_id, amount, note, contribution_date)
  select v_user_id, sg.id, 300.00, 'Aporte mensual', current_date - interval '30 day'
  from public.savings_goals sg
  where sg.user_id = v_user_id
  limit 1;

  insert into public.savings_contributions (user_id, savings_goal_id, amount, note, contribution_date)
  select v_user_id, sg.id, 250.00, 'Aporte quincenal', current_date - interval '15 day'
  from public.savings_goals sg
  where sg.user_id = v_user_id
  limit 1;

  raise notice 'Seed completed for admin user %', v_target_email;
end
$$;

-- =======================================================
-- FLOW NOTES
-- =======================================================
-- 1) Email signup:
--    - If "Confirm email" is enabled in Supabase Auth, user must confirm email.
-- 2) Google/GitHub signup/login:
--    - User is usually considered verified by provider, no email confirmation step needed.
-- 3) Every new user is stored in public.profiles with:
--    role='user', subscription_tier='free', subscription_status='active'.
-- 4) For admin:
--    - Create/login user normally first, then run "PROMOTE EXISTING USER AS ADMIN (SAFE)" block.

-- =======================================================
-- INCREMENTAL MIGRATION (NO RESET REQUIRED)
-- =======================================================
-- Use this section when you already have data and need to apply
-- changes without dropping tables/users.

create or replace function public.can_access_feature(target_user uuid, feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user
      and (
        p.role = 'admin'::public.app_role
        or feature not in ('transactions', 'investments')
        or p.subscription_tier in ('pro'::public.subscription_tier, 'premium'::public.subscription_tier)
      )
  );
$$;

create or replace function public.can_view_category(owner_user uuid, viewer_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select owner_user = viewer_user
    or exists (
      select 1
      from public.profiles p
      where p.id = owner_user
        and p.role = 'admin'::public.app_role
    );
$$;

create or replace function public.is_admin_user(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user
      and p.role = 'admin'::public.app_role
  );
$$;

-- Normalize null/empty tiers to free in old rows
update public.profiles
set subscription_tier = 'free'::public.subscription_tier
where subscription_tier is null;

-- Add profile preference columns for migrated environments
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists language text not null default 'es';
alter table public.profiles add column if not exists currency text not null default 'COP';
alter table public.profiles add column if not exists date_format text not null default 'DD/MM/AAAA';
alter table public.profiles add column if not exists two_factor_enabled boolean not null default false;
alter table public.profiles add column if not exists alerts_by_email boolean not null default true;
alter table public.profiles add column if not exists profile_visible boolean not null default true;

-- Ensure admin can manage profile subscriptions in existing projects
drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_admin_select_all
on public.profiles for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists profiles_admin_update_all on public.profiles;
create policy profiles_admin_update_all
on public.profiles for update
to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists categories_select_visible on public.categories;
drop policy if exists categories_select_own on public.categories;
create policy categories_select_visible
on public.categories for select
to authenticated
using (public.can_view_category(user_id, auth.uid()));
