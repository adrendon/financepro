-- Migración incremental: prioridades, categorías y plazos para metas de ahorro
-- Ejecutar en Supabase SQL Editor

begin;

alter table public.savings_goals
  add column if not exists priority_level text not null default 'media';

alter table public.savings_goals
  add column if not exists goal_term text not null default 'mediano';

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

-- Datos de ejemplo para que existan varias prioridades/categorías/plazos
update public.savings_goals
set
  priority_level = case
    when coalesce(priority_level, '') = '' then
      (array['alta','media','baja'])[1 + floor(random() * 3)::int]
    else priority_level
  end,
  goal_term = case
    when coalesce(goal_term, '') = '' then
      (array['corto','mediano','largo'])[1 + floor(random() * 3)::int]
    else goal_term
  end
where user_id = auth.uid();

commit;
