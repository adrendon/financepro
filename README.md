# FinancePro (Next.js + Supabase)

Aplicación web de finanzas personales orientada a uso diario: panel principal, transacciones, presupuestos, ahorros, facturas, inversiones, informes y gestión de categorías por dominio.

Este documento es una guía operativa completa para instalar, ejecutar, entender, poblar datos, validar y mantener el proyecto.

Documentación para usuario final:

- Manual completo: [MANUAL-USUARIO.md](MANUAL-USUARIO.md)
- Guía rápida (5 minutos): [GUIA-RAPIDA.md](GUIA-RAPIDA.md)

---

## Tabla de contenido

1. [Visión general](#1-visión-general)
2. [Tecnología y arquitectura](#2-tecnología-y-arquitectura)
3. [Requisitos](#3-requisitos)
4. [Instalación local](#4-instalación-local)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Base de datos y scripts SQL](#6-base-de-datos-y-scripts-sql)
7. [Autenticación y control de acceso](#7-autenticación-y-control-de-acceso)
8. [Módulos funcionales](#8-módulos-funcionales)
9. [Reglas UX implementadas (límites y paginación)](#9-reglas-ux-implementadas-límites-y-paginación)
10. [Seeds de datos y pruebas](#10-seeds-de-datos-y-pruebas)
11. [Estructura de carpetas](#11-estructura-de-carpetas)
12. [Flujo recomendado de desarrollo](#12-flujo-recomendado-de-desarrollo)
13. [Validación y calidad](#13-validación-y-calidad)
14. [Troubleshooting](#14-troubleshooting)
15. [Operación y mantenimiento](#15-operación-y-mantenimiento)

---

## 1) Visión general

FinancePro permite:

- Registrar ingresos y gastos.
- Definir presupuestos por categoría y por mes.
- Gestionar metas de ahorro con prioridades y plazos.
- Registrar aportes a metas y revisar historial.
- Administrar facturas pendientes y vencimientos.
- Llevar inversiones con valor invertido vs valor actual.
- Analizar información en paneles y reportes.

Nuevas capacidades MVP en Transacciones:

- Edición masiva por selección (categoría, tipo y fecha).
- Eliminación masiva con opción de deshacer.
- Reglas automáticas por comercio para autocompletar categoría/tipo.
- Plantillas de transacciones recurrentes con generación mensual.
- Historial local de cambios recientes en el módulo.

La aplicación está diseñada con enfoque **multiusuario**, aislamiento por usuario mediante **RLS**, y control por **rol/suscripción**.

---

## 2) Tecnología y arquitectura

### Frontend

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Componentes divididos por dominio (managers)

### Backend

- Supabase Auth (email/password + OAuth)
- Supabase PostgreSQL
- RLS (Row Level Security)
- Triggers y funciones SQL para sincronización y control

### Imágenes

- Cloudinary para carga de archivos (paneles y entidades con imagen)

### Patrón de datos

- Server Components para lectura inicial y render de páginas
- Client Components para operaciones interactivas (CRUD, modales, filtros, paginación visual)

---

## 3) Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase activo
- (Opcional) Cuenta Cloudinary

---

## 4) Instalación local

```bash
npm install
npm run dev
```

URL local por defecto: `http://localhost:3000`

Build producción:

```bash
npm run build
```

---

## 5) Variables de entorno

Crear `.env.local` en la raíz de `frontend`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Upload de imágenes
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

# Opcionales de suscripción/billing
NEXT_PUBLIC_MONTHLY_CHECKOUT_URL=
NEXT_PUBLIC_BILLING_PORTAL_URL=
NEXT_PUBLIC_PAUSE_SUBSCRIPTION_URL=
NEXT_PUBLIC_CANCEL_SUBSCRIPTION_URL=
NEXT_PUBLIC_WHATSAPP_UPGRADE_URL=
NEXT_PUBLIC_DELETE_ACCOUNT_URL=
```

Notas:

- Si `CLOUDINARY_URL` no está definido, la carga de imágenes fallará en runtime.
- Las variables `NEXT_PUBLIC_*` quedan expuestas al cliente por diseño de Next.js.

---

## 6) Base de datos y scripts SQL

### Orden recomendado en Supabase SQL Editor

1. `supabase/schema.sql`
2. (Opcional, incremental) `supabase/savings-goals-prioridades-plazos.sql`
3. (Pro recomendado) `supabase/transactions-pro-features.sql`
4. (Opcional, datos de prueba)
    - `supabase/seed-9-metas-ahorros.sql`
    - `supabase/seed-2-years-all-panels.sql`

### Qué define `schema.sql`

- Enums: rol y nivel/estado de suscripción.
- Tablas principales:
   - `profiles`
   - `transactions`
   - `budgets`
   - `savings_goals`
   - `savings_contributions`
   - `upcoming_bills`
   - `investments`
   - `categories`
- Índices por usuario/fecha/categoría para mejorar consultas.
- Triggers `updated_at`.
- Trigger de sincronización de `auth.users` → `profiles`.
- Funciones de control (`is_admin_user`, `can_manage_categories`, etc.).
- Políticas RLS por tabla.

### Migración de prioridades y plazos

`savings-goals-prioridades-plazos.sql` agrega/asegura:

- `priority_level` (`alta|media|baja`)
- `goal_term` (`corto|mediano|largo`)
- constraints de validación

---

## 7) Autenticación y control de acceso

### Flujo general

- Ruta pública inicial: `/login`.
- Si no hay sesión: redirección a login (middleware/proxy).
- Si hay sesión en `/login`: redirección a `/`.
- Perfil se sincroniza automáticamente al crear usuario.

### OAuth

En Supabase:

1. **Authentication → Providers**
2. Habilitar Google/GitHub
3. Configurar Client ID / Secret
4. Validar callback URL
5. Revisar `Site URL` y `Redirect URLs`

### Admin

Para promover admin:

1. Crear usuario normal primero
2. Ejecutar bloque de promoción admin en `schema.sql`
3. Verificar:
    - `profiles.role = admin`
    - metadata de auth con rol admin

---

## 8) Módulos funcionales

### Dashboard

- Tarjetas superiores (saldo, ingresos, gastos)
- Desglose de gastos por categoría
- Transacciones recientes
- Metas de ahorro compactas
- Próximas facturas

### Transacciones

- CRUD de movimientos
- Exportación CSV/Excel/PDF
- Edición masiva por selección
- Eliminación masiva con deshacer
- Reglas automáticas por comercio (persistidas)
- Plantillas recurrentes (persistidas)
- Historial de cambios por usuario (persistido)
- Filtros por tipo, período y búsqueda
- Totales agregados (ingresos, gastos, neto)

### Presupuestos

- CRUD de presupuestos por categoría/mes
- Cálculo consumido vs límite
- Resumen de total presupuestado/gastado/disponible

### Ahorros

- CRUD de metas
- Prioridad y plazo por meta
- Aportes por meta
- Historial de aportaciones

### Facturas

- CRUD de facturas
- Estado, urgencia, recurrencia
- Listado filtrable

### Inversiones

- CRUD de inversiones
- Resumen invertido/actual/PnL
- Distribución del portafolio

### Informes

- Tendencia de gastos
- Distribución por categoría
- Comparativo ingresos vs gastos
- Tabla de transacciones recientes
- Exportaciones

---

## 9) Reglas UX implementadas (límites y paginación)

### Dashboard

- **Metas de ahorro:** muestra últimas 5.
- **Próximas facturas:** solo pendientes del mes actual (máx 5).
- **Transacciones recientes:** solo semana actual.

### Ahorros

- Historial de aportaciones estilo transacción.
- Paginación visual: `12` inicial + botón `Cargar más` (+12).
- `Ver todo` del historial enlaza a `/transacciones`.

### Facturas

- Lista principal con `12` inicial + `Cargar más` (+12).
- Reset de paginación al cambiar búsqueda/filtros.

### Informes

- Resumen reciente: `20` inicial + `Cargar más` (+20).
- Reset al cambiar rango/filtros.
- `Ver todo` enlaza a `/transacciones`.

### Transacciones (módulo completo)

- Tabla principal: `20` inicial + `Cargar más` (+20).
- Reset al cambiar búsqueda/filtro/período.

### Presupuestos

- Se retiró panel embebido de categorías desde esta vista.

### Navbar/Sidebar

- `Categorías` ubicado justo después de `Panel`.

---

## 10) Seeds de datos y pruebas

### `seed-9-metas-ahorros.sql`

Objetivo:

- Insertar 9 metas adicionales para probar comportamiento de “ver más”.

### `seed-2-years-all-panels.sql`

Objetivo:

- Generar dataset integral de 24 meses para todos los paneles.

Incluye:

- Perfil base (ingreso mensual)
- Categorías base por módulo
- 12 metas de ahorro
- 24 meses de aportes de ahorro
- Recalculado de avance/estado de metas
- 24 meses de transacciones
- 24 meses de presupuestos (upsert)
- Histórico y próximos vencimientos en facturas
- Inversiones con antigüedad variada

#### Importante

- Cambiar `v_target_email` antes de ejecutar.
- El script limpia datos financieros del usuario objetivo para regenerar datos consistentes.
- Se diseñó para ejecutarse en SQL Editor con rol `postgres` (no depende de `auth.uid()`).

---

## 11) Estructura de carpetas

### Rutas (`src/app`)

- `/` Panel
- `/transacciones`
- `/presupuestos`
- `/ahorros`
- `/facturas`
- `/inversiones`
- `/informes`
- `/categorias`
- `/perfil`, `/configuracion`, `/notificaciones`

### Componentes (`src/components`)

- `TransactionsManager.tsx`
- `BudgetManager.tsx`
- `SavingsManager.tsx`
- `BillsManager.tsx`
- `InvestmentsManager.tsx`
- `ReportsManager.tsx`
- widgets de dashboard (`TopCards`, `SpendingBreakdown`, `SavingsGoals`, `UpcomingBills`, etc.)

### Utilidades (`src/utils`)

- `supabase/client.ts`, `supabase/server.ts`
- `export.ts` (CSV/Excel/PDF)
- `formatters.ts`
- `categories.ts`
- `uploadImage.ts`

### SQL (`supabase`)

- `schema.sql`
- migraciones puntuales
- seeds de prueba

---

## 12) Flujo recomendado de desarrollo

1. Crear rama de trabajo.
2. Ejecutar app local (`npm run dev`).
3. Aplicar cambios de UI/comportamiento.
4. Validar con datos reales/seeds.
5. Ejecutar build (`npm run build`).
6. Revisar regresiones en módulos impactados.

---

## 13) Validación y calidad

Comandos:

```bash
npm run lint
npm run build
```

Checklist mínimo:

1. Login/logout y redirecciones correctas.
2. CRUD en transacciones, presupuestos, ahorros, facturas e inversiones.
3. Exportaciones funcionando.
4. `Cargar más` en módulos configurados.
5. `Ver todo` navegando a destino correcto.
6. Build sin errores.

---

## 14) Troubleshooting

### Error SQL: `auth.uid()` devuelve null en seed

Contexto:

- Ocurre cuando ejecutas script en SQL Editor con rol `postgres`.

Solución:

- Resolver usuario por `auth.users` usando email (`v_target_email`) y usar `v_user_id` explícito.

### No carga imágenes

Verificar:

- `CLOUDINARY_URL` configurado.
- Endpoint `api/upload-image` activo.
- Reiniciar servidor luego de cambiar `.env.local`.

### No aparecen datos

Verificar:

- Usuario objetivo correcto en seeds.
- RLS: sesión activa del mismo usuario.
- Ejecución previa de `schema.sql`.

### Problemas de OAuth

Verificar:

- Callback URL exacta en proveedor y Supabase.
- `Site URL`/`Redirect URLs` correctas.
- Credenciales activas del proveedor.

### Build falla en CI/local

Verificar:

- Variables de entorno requeridas.
- Dependencias instaladas.
- Tipos y rutas de imports actualizados.

---

## 15) Operación y mantenimiento

Recomendaciones:

- Mantener scripts SQL versionados y auditables.
- Evitar seeds destructivos en ambientes productivos.
- Usar seeds de entorno (`dev`, `staging`, `demo`) separados.
- Revisar periódicamente índices y consultas más pesadas.
- Documentar cada cambio de UX con impacto en negocio (límites, filtros, paginación).

---

## Referencias internas

- Esquema principal: `supabase/schema.sql`
- Seed integral: `supabase/seed-2-years-all-panels.sql`
- Seed metas: `supabase/seed-9-metas-ahorros.sql`
- Migración de prioridades/plazos: `supabase/savings-goals-prioridades-plazos.sql`
- Migración pro de transacciones: `supabase/transactions-pro-features.sql`
- Protección de rutas: `src/proxy.ts`

---

Si necesitas, se puede agregar una sección adicional de **Deployment (Vercel + Supabase)** con checklist de producción (dominio, callbacks OAuth, secretos y verificación post-despliegue).
