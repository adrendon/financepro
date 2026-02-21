# QA de Publicación (Móvil)

Fecha: 2026-02-21
Alcance: validación final visual/funcional para 320px, 375px y 390px.

## 1) Estado técnico actual

- Build de producción: OK (`npm run build`)
- Lint: OK con 1 warning no bloqueante (`no-img-element` en ProfileManager)
- Reglas premium activas:
  - `Informes`: Premium o Admin
  - `Transacciones`: accesible
  - Crear/editar categorías: Premium o Admin

## 2) Checklist visual por viewport

Ejecutar en DevTools con anchos: **320**, **375**, **390**.

### Navegación

- [ ] Sidebar en móvil permanece en modo colapsado (solo íconos).
- [ ] No hay recorte horizontal en menú ni en footer de sidebar.
- [ ] `Transacciones` visible en navegación.

### Informes

- [ ] Donut "Distribución por Categoría" no desborda el monto central.
- [ ] Leyenda de categorías no rompe layout (1 col en móvil).
- [ ] Gráfica de tendencia y comparativa permiten scroll horizontal sin cortar barras.

### Presupuestos

- [ ] Tarjetas resumen no desbordan valores grandes.
- [ ] Botón "Crear Nuevo Presupuesto" se adapta a ancho móvil.
- [ ] Modal de crear/editar permite scroll vertical completo.

### Ahorros

- [ ] Acciones de cabecera no se montan entre sí.
- [ ] KPIs con montos largos no desbordan.
- [ ] Modales de meta y aportación tienen scroll interno funcional.

### Facturas

- [ ] Botones de cabecera se apilan correctamente en móvil.
- [ ] Tabla sigue siendo usable con scroll horizontal.
- [ ] Modal de nueva/edición tiene scroll interno completo.

### Detalle de factura

- [ ] Botones de acción (editar/pagar/eliminar) se ven en grid móvil sin solaparse.
- [ ] Monto principal no desborda en valores altos.
- [ ] Modal de edición no corta campos en pantallas pequeñas.

### Inversiones

- [ ] Botón "Nueva inversión" se adapta en móvil.
- [ ] KPIs (invertido/actual/p&l) no desbordan.
- [ ] Tarjetas de inversión no recortan nombre/notas.
- [ ] Modal de inversión tiene scroll interno completo.

## 3) Checklist de acceso por plan

Usar un usuario por cada caso: Free, Premium y Admin.

- [ ] Free: entra a `Transacciones` sin redirección.
- [ ] Free: al entrar a `Informes` redirige a `Upgrade` con `feature=reports`.
- [ ] Free: en `Categorías` no aparece botón de crear/editar/eliminar.
- [ ] Premium: entra a `Informes` sin redirección.
- [ ] Premium: puede crear/editar/eliminar categorías.
- [ ] Admin: acceso total a rutas de administración.

## 4) Smoke test antes de publicar

- [ ] Login Google y GitHub crean/sincronizan nombre/correo/avatar en perfil.
- [ ] Crear, editar y eliminar en: transacciones, presupuestos, ahorros, facturas, inversiones.
- [ ] Exportes (`CSV/Excel/PDF`) funcionan en escritorio y móvil.
- [ ] No hay errores en consola durante navegación crítica.

## 5) Go/No-Go

- **GO**: todos los checks anteriores completos.
- **NO-GO**: cualquier desborde visual severo, redirección premium incorrecta o error de guardado en módulos críticos.
