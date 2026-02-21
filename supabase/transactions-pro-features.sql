-- Pro features for Transactions module
-- - Merchant auto-rules
-- - Recurring templates
-- - Change log (audit-like user history)
--
-- Run in Supabase SQL Editor after schema.sql

begin;

create table if not exists public.transaction_rules (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  match_pattern text not null,
  category text not null,
  inferred_type text check (inferred_type in ('income', 'expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_transaction_templates (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  merchant text not null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_change_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  detail text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tx_rules_user_pattern on public.transaction_rules(user_id, match_pattern);
create index if not exists idx_tx_templates_user_active on public.recurring_transaction_templates(user_id, active);
create index if not exists idx_tx_change_log_user_created on public.transaction_change_log(user_id, created_at desc);

create unique index if not exists uq_tx_rules_user_pattern on public.transaction_rules(user_id, lower(match_pattern));

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transaction_rules_updated_at on public.transaction_rules;
create trigger trg_transaction_rules_updated_at
before update on public.transaction_rules
for each row execute function public.handle_updated_at();

drop trigger if exists trg_recurring_templates_updated_at on public.recurring_transaction_templates;
create trigger trg_recurring_templates_updated_at
before update on public.recurring_transaction_templates
for each row execute function public.handle_updated_at();

alter table public.transaction_rules enable row level security;
alter table public.recurring_transaction_templates enable row level security;
alter table public.transaction_change_log enable row level security;

drop policy if exists transaction_rules_select_own on public.transaction_rules;
create policy transaction_rules_select_own
on public.transaction_rules for select
to authenticated
using (user_id = auth.uid());

drop policy if exists transaction_rules_insert_own on public.transaction_rules;
create policy transaction_rules_insert_own
on public.transaction_rules for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists transaction_rules_update_own on public.transaction_rules;
create policy transaction_rules_update_own
on public.transaction_rules for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists transaction_rules_delete_own on public.transaction_rules;
create policy transaction_rules_delete_own
on public.transaction_rules for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists recurring_templates_select_own on public.recurring_transaction_templates;
create policy recurring_templates_select_own
on public.recurring_transaction_templates for select
to authenticated
using (user_id = auth.uid());

drop policy if exists recurring_templates_insert_own on public.recurring_transaction_templates;
create policy recurring_templates_insert_own
on public.recurring_transaction_templates for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists recurring_templates_update_own on public.recurring_transaction_templates;
create policy recurring_templates_update_own
on public.recurring_transaction_templates for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists recurring_templates_delete_own on public.recurring_transaction_templates;
create policy recurring_templates_delete_own
on public.recurring_transaction_templates for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists tx_change_log_select_own on public.transaction_change_log;
create policy tx_change_log_select_own
on public.transaction_change_log for select
to authenticated
using (user_id = auth.uid());

drop policy if exists tx_change_log_insert_own on public.transaction_change_log;
create policy tx_change_log_insert_own
on public.transaction_change_log for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists tx_change_log_delete_own on public.transaction_change_log;
create policy tx_change_log_delete_own
on public.transaction_change_log for delete
to authenticated
using (user_id = auth.uid());

commit;
