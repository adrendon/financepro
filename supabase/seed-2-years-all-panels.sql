-- Seed integral de 2 años para TODOS los paneles
-- Incluye: profiles, categories, transactions, budgets, savings_goals,
-- savings_contributions, upcoming_bills e investments.
--
-- Ejecutar en Supabase SQL Editor (role: postgres)
-- Cambia el correo objetivo en v_target_email.

begin;

do $$
declare
  v_target_email text := 'alexis9229@gmail.com';
  v_user_id uuid;
  v_today date := current_date;
  v_month_start date;
  v_income numeric;
  v_freelance numeric;
  v_rent numeric;
  v_food numeric;
  v_transport numeric;
  v_services numeric;
  v_health numeric;
  v_leisure numeric;
  v_education numeric;
  v_misc numeric;
  v_i int;
begin
  select id into v_user_id
  from auth.users
  where email = v_target_email
  limit 1;

  if v_user_id is null then
    raise exception 'No se encontró usuario en auth.users con email: %', v_target_email;
  end if;

  -- 0) Limpieza para regenerar dataset consistente
  delete from public.savings_contributions where user_id = v_user_id;
  delete from public.savings_goals where user_id = v_user_id;
  delete from public.upcoming_bills where user_id = v_user_id;
  delete from public.budgets where user_id = v_user_id;
  delete from public.investments where user_id = v_user_id;
  delete from public.transactions where user_id = v_user_id;

  -- 1) Perfil base para top cards / onboarding
  update public.profiles
  set
    monthly_income = 6000000,
    monthly_income_onboarded = true,
    updated_at = now()
  where id = v_user_id;

  -- 2) Categorías base (si no existen)
  insert into public.categories (user_id, name, icon, applies_to)
  values
    (v_user_id, 'Salario', 'Briefcase', 'transaction'),
    (v_user_id, 'Ingreso extra', 'CircleDollarSign', 'transaction'),
    (v_user_id, 'Vivienda', 'Home', 'transaction'),
    (v_user_id, 'Comida', 'Utensils', 'transaction'),
    (v_user_id, 'Transporte', 'Car', 'transaction'),
    (v_user_id, 'Servicios', 'ReceiptText', 'transaction'),
    (v_user_id, 'Salud', 'HeartPulse', 'transaction'),
    (v_user_id, 'Ocio', 'Gamepad2', 'transaction'),
    (v_user_id, 'Educación', 'GraduationCap', 'transaction'),
    (v_user_id, 'Otros', 'Tag', 'transaction'),

    (v_user_id, 'Vivienda', 'Home', 'budget'),
    (v_user_id, 'Comida', 'Utensils', 'budget'),
    (v_user_id, 'Transporte', 'Car', 'budget'),
    (v_user_id, 'Servicios', 'ReceiptText', 'budget'),
    (v_user_id, 'Salud', 'HeartPulse', 'budget'),
    (v_user_id, 'Ocio', 'Gamepad2', 'budget'),

    (v_user_id, 'Servicios', 'ReceiptText', 'bill'),
    (v_user_id, 'Vivienda', 'Home', 'bill'),
    (v_user_id, 'Finanzas', 'CircleDollarSign', 'bill'),

    (v_user_id, 'Emergencias', 'Shield', 'saving'),
    (v_user_id, 'Vacaciones', 'Plane', 'saving'),
    (v_user_id, 'Vivienda', 'Home', 'saving'),
    (v_user_id, 'Transporte', 'Car', 'saving'),
    (v_user_id, 'Tecnología', 'Smartphone', 'saving'),
    (v_user_id, 'Educación', 'GraduationCap', 'saving'),
    (v_user_id, 'Salud', 'HeartPulse', 'saving'),
    (v_user_id, 'Mascotas', 'PawPrint', 'saving'),
    (v_user_id, 'Hogar', 'Wrench', 'saving')
  on conflict (user_id, name, applies_to) do nothing;

  -- 3) Metas de ahorro (12 metas para probar "ver más" de 3 en 3)
  insert into public.savings_goals (
    user_id, title, category, priority_level, goal_term,
    current_amount, target_amount, status, color_class, target_date, image_url
  ) values
    (v_user_id, 'Fondo de emergencias', 'Emergencias', 'alta', 'mediano', 0, 12000000, 'En progreso', 'bg-primary', v_today + interval '280 day', 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200'),
    (v_user_id, 'Viaje familiar', 'Vacaciones', 'media', 'corto', 0, 5000000, 'En progreso', 'bg-sky-500', v_today + interval '100 day', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200'),
    (v_user_id, 'Cuota inicial casa', 'Vivienda', 'alta', 'largo', 0, 45000000, 'En progreso', 'bg-emerald-500', v_today + interval '950 day', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200'),
    (v_user_id, 'Renovar moto', 'Transporte', 'media', 'mediano', 0, 9500000, 'En progreso', 'bg-amber-500', v_today + interval '360 day', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200'),
    (v_user_id, 'Laptop trabajo', 'Tecnología', 'alta', 'corto', 0, 7000000, 'En progreso', 'bg-indigo-500', v_today + interval '150 day', 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=1200'),
    (v_user_id, 'Especialización', 'Educación', 'media', 'mediano', 0, 8500000, 'En progreso', 'bg-violet-500', v_today + interval '420 day', 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200'),
    (v_user_id, 'Fondo médico', 'Salud', 'alta', 'corto', 0, 3500000, 'En progreso', 'bg-rose-500', v_today + interval '120 day', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200'),
    (v_user_id, 'Mascotas', 'Mascotas', 'media', 'corto', 0, 1800000, 'En progreso', 'bg-fuchsia-500', v_today + interval '90 day', 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200'),
    (v_user_id, 'Remodelar cocina', 'Hogar', 'baja', 'largo', 0, 22000000, 'En progreso', 'bg-teal-500', v_today + interval '820 day', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200'),
    (v_user_id, 'Fondo impuestos', 'Finanzas', 'alta', 'corto', 0, 4500000, 'En progreso', 'bg-red-500', v_today + interval '70 day', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200'),
    (v_user_id, 'Mudanza', 'Hogar', 'media', 'mediano', 0, 6000000, 'En progreso', 'bg-cyan-500', v_today + interval '300 day', 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200'),
    (v_user_id, 'Colchón de liquidez', 'Emergencias', 'baja', 'largo', 0, 15000000, 'En progreso', 'bg-slate-600', v_today + interval '700 day', 'https://images.unsplash.com/photo-1567427018141-0584cfcbf1b8?w=1200');

  -- 4) Aportes (2 años): cada meta recibe 1 aporte mensual variable
  insert into public.savings_contributions (
    user_id, savings_goal_id, amount, note, contribution_date
  )
  select
    v_user_id,
    g.id,
    round((50000 + random() * 250000)::numeric, 2) as amount,
    'Aporte mensual automático',
    (date_trunc('month', v_today) - (gs.m || ' months')::interval + interval '8 day')::date
  from public.savings_goals g
  cross join generate_series(0, 23) as gs(m)
  where g.user_id = v_user_id;

  -- Ajusta current_amount y status según aportes reales
  update public.savings_goals g
  set
    current_amount = coalesce(a.total_aportes, 0),
    status = case when coalesce(a.total_aportes, 0) >= g.target_amount then 'Completado' else 'En progreso' end
  from (
    select savings_goal_id, sum(amount) as total_aportes
    from public.savings_contributions
    where user_id = v_user_id
    group by savings_goal_id
  ) a
  where g.id = a.savings_goal_id
    and g.user_id = v_user_id;

  -- 5) Transacciones y presupuestos para 24 meses
  for v_i in 0..23 loop
    v_month_start := (date_trunc('month', v_today) - make_interval(months => v_i))::date;

    v_income := round((6000000 + (random() * 700000 - 350000))::numeric, 2);
    v_freelance := round((400000 + random() * 900000)::numeric, 2);
    v_rent := round((1700000 + random() * 250000)::numeric, 2);
    v_food := round((700000 + random() * 300000)::numeric, 2);
    v_transport := round((250000 + random() * 140000)::numeric, 2);
    v_services := round((280000 + random() * 120000)::numeric, 2);
    v_health := round((140000 + random() * 160000)::numeric, 2);
    v_leisure := round((180000 + random() * 220000)::numeric, 2);
    v_education := round((130000 + random() * 200000)::numeric, 2);
    v_misc := round((120000 + random() * 180000)::numeric, 2);

    -- Ingresos
    insert into public.transactions (user_id, merchant, category, amount, type, date, notes) values
      (v_user_id, 'Empresa principal', 'Salario', v_income, 'income', (v_month_start + interval '2 day')::date, 'Nómina mensual'),
      (v_user_id, 'Cliente freelance', 'Ingreso extra', v_freelance, 'income', (v_month_start + interval '18 day')::date, 'Proyecto mensual');

    -- Gastos
    insert into public.transactions (user_id, merchant, category, amount, type, date, notes) values
      (v_user_id, 'Arriendo', 'Vivienda', v_rent, 'expense', (v_month_start + interval '3 day')::date, 'Pago vivienda'),
      (v_user_id, 'Supermercado', 'Comida', v_food, 'expense', (v_month_start + interval '7 day')::date, 'Mercado del mes'),
      (v_user_id, 'Transporte urbano', 'Transporte', v_transport, 'expense', (v_month_start + interval '10 day')::date, null),
      (v_user_id, 'Servicios públicos', 'Servicios', v_services, 'expense', (v_month_start + interval '12 day')::date, 'Agua, luz, internet'),
      (v_user_id, 'Farmacia y salud', 'Salud', v_health, 'expense', (v_month_start + interval '15 day')::date, null),
      (v_user_id, 'Entretenimiento', 'Ocio', v_leisure, 'expense', (v_month_start + interval '20 day')::date, null),
      (v_user_id, 'Cursos y libros', 'Educación', v_education, 'expense', (v_month_start + interval '22 day')::date, null),
      (v_user_id, 'Gastos varios', 'Otros', v_misc, 'expense', (v_month_start + interval '25 day')::date, null);

    -- Presupuestos por mes (upsert)
    insert into public.budgets (user_id, category, monthly_limit, month_start, image_url)
    values
      (v_user_id, 'Vivienda', round((v_rent * 1.08)::numeric, 2), v_month_start, 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'),
      (v_user_id, 'Comida', round((v_food * 1.20)::numeric, 2), v_month_start, 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800'),
      (v_user_id, 'Transporte', round((v_transport * 1.20)::numeric, 2), v_month_start, 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800'),
      (v_user_id, 'Servicios', round((v_services * 1.15)::numeric, 2), v_month_start, 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800'),
      (v_user_id, 'Salud', round((v_health * 1.25)::numeric, 2), v_month_start, 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800'),
      (v_user_id, 'Ocio', round((v_leisure * 1.20)::numeric, 2), v_month_start, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800')
    on conflict (user_id, category, month_start)
    do update set
      monthly_limit = excluded.monthly_limit,
      image_url = excluded.image_url,
      updated_at = now();

    -- Facturas históricas (pasadas pagadas, recientes algunas pendientes)
    insert into public.upcoming_bills (user_id, title, category, description, amount, due_date, status, is_urgent, recurrence)
    values
      (
        v_user_id,
        'Internet hogar',
        'Servicios',
        'Fibra óptica mensual',
        round((120000 + random() * 30000)::numeric, 2),
        (v_month_start + interval '6 day')::date,
        case when v_i <= 1 then 'Pendiente' else 'Pagado' end,
        case when v_i = 0 then true else false end,
        'Mensual'
      ),
      (
        v_user_id,
        'Energía eléctrica',
        'Servicios',
        'Consumo mensual de energía',
        round((160000 + random() * 50000)::numeric, 2),
        (v_month_start + interval '11 day')::date,
        case when v_i <= 1 then 'Pendiente' else 'Pagado' end,
        false,
        'Mensual'
      ),
      (
        v_user_id,
        'Arriendo',
        'Vivienda',
        'Pago de arriendo',
        round((v_rent)::numeric, 2),
        (v_month_start + interval '3 day')::date,
        case when v_i = 0 then 'Urgente' when v_i = 1 then 'Pendiente' else 'Pagado' end,
        case when v_i = 0 then true else false end,
        'Mensual'
      );
  end loop;

  -- 6) Facturas próximas adicionales (para panel upcoming)
  insert into public.upcoming_bills (user_id, title, category, description, amount, due_date, status, is_urgent, recurrence)
  values
    (v_user_id, 'Tarjeta de crédito', 'Finanzas', 'Pago mínimo mensual', 420000, v_today + interval '2 day', 'Urgente', true, 'Mensual'),
    (v_user_id, 'Seguro vehículo', 'Finanzas', 'Cuota póliza', 280000, v_today + interval '9 day', 'Pendiente', false, 'Mensual'),
    (v_user_id, 'Suscripción streaming', 'Servicios', 'Plan familiar', 52000, v_today + interval '5 day', 'Pendiente', false, 'Mensual');

  -- 7) Inversiones (histórico + estado actual)
  insert into public.investments (user_id, name, investment_type, invested_amount, current_value, started_at, image_url, notes)
  values
    (v_user_id, 'ETF S&P 500', 'ETF', 14500000, 17300000, v_today - interval '700 day', 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800', 'Aportes recurrentes de largo plazo'),
    (v_user_id, 'Fondo de bonos', 'Bonos', 7200000, 7810000, v_today - interval '540 day', 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=800', 'Perfil conservador'),
    (v_user_id, 'Bitcoin', 'Cripto', 5100000, 6400000, v_today - interval '420 day', 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800', 'Alta volatilidad'),
    (v_user_id, 'CDT banco', 'Renta fija', 9000000, 9760000, v_today - interval '300 day', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800', 'Renovación trimestral');

end $$;

commit;
