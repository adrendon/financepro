-- Seed: 9 metas adicionales para probar "Ver más" (3 en 3)
-- Ejecutar en Supabase SQL Editor (funciona con rol postgres)
-- Cambia el correo si quieres sembrar para otro usuario.

begin;

do $$
declare
  v_target_email text := 'alexis9229@gmail.com';
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = v_target_email
  limit 1;

  if v_user_id is null then
    raise exception 'No se encontró usuario en auth.users con email: %', v_target_email;
  end if;

  insert into public.savings_goals (
    user_id,
    title,
    category,
    priority_level,
    goal_term,
    current_amount,
    target_amount,
    status,
    color_class,
    target_date,
    image_url
  )
  values
    (
      v_user_id,
      'Fondo médico familiar',
      'Salud',
      'alta',
      'corto',
      450000,
      2500000,
      'En progreso',
      'bg-primary',
      current_date + interval '45 day',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200'
    ),
    (
      v_user_id,
      'Cuota inicial vivienda',
      'Vivienda',
      'alta',
      'largo',
      4200000,
      35000000,
      'En progreso',
      'bg-emerald-500',
      current_date + interval '900 day',
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200'
    ),
    (
      v_user_id,
      'Renovación de moto',
      'Transporte',
      'media',
      'mediano',
      1800000,
      8500000,
      'En progreso',
      'bg-amber-500',
      current_date + interval '320 day',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1200'
    ),
    (
      v_user_id,
      'Viaje a Cartagena',
      'Vacaciones',
      'media',
      'corto',
      700000,
      3200000,
      'En progreso',
      'bg-sky-500',
      current_date + interval '85 day',
      'https://images.unsplash.com/photo-1538947151057-dfe933d688d1?w=1200'
    ),
    (
      v_user_id,
      'Curso de inglés',
      'Educación',
      'baja',
      'mediano',
      300000,
      2800000,
      'En progreso',
      'bg-violet-500',
      current_date + interval '240 day',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200'
    ),
    (
      v_user_id,
      'Fondo mascotas',
      'Mascotas',
      'media',
      'corto',
      220000,
      1500000,
      'En progreso',
      'bg-rose-500',
      current_date + interval '70 day',
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200'
    ),
    (
      v_user_id,
      'Laptop de trabajo',
      'Tecnología',
      'alta',
      'mediano',
      1200000,
      6000000,
      'En progreso',
      'bg-indigo-500',
      current_date + interval '210 day',
      'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=1200'
    ),
    (
      v_user_id,
      'Fondo impuestos',
      'Finanzas',
      'alta',
      'corto',
      950000,
      4000000,
      'En progreso',
      'bg-red-500',
      current_date + interval '60 day',
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200'
    ),
    (
      v_user_id,
      'Remodelación cocina',
      'Hogar',
      'baja',
      'largo',
      2600000,
      18000000,
      'En progreso',
      'bg-teal-500',
      current_date + interval '780 day',
      'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200'
    );
end $$;

commit;
