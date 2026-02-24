# Manual de Usuario – FinancePro

Este manual está pensado para personas usuarias de la aplicación (no técnicas).
Aquí encontrarás cómo entrar, qué hace cada módulo, cómo registrar información y cómo interpretar los datos principales.

Si quieres una versión resumida de arranque, revisa también [GUIA-RAPIDA.md](GUIA-RAPIDA.md).

---

## 1. ¿Qué es FinancePro?

FinancePro es una aplicación para organizar tus finanzas personales desde un solo lugar.
Puedes:

- registrar ingresos y gastos,
- controlar presupuestos mensuales,
- crear metas de ahorro,
- gestionar facturas por vencer,
- llevar seguimiento de inversiones,
- ver reportes y tendencias.

---

## 2. Primer ingreso

### 2.1 Iniciar sesión o registrarte

En la pantalla de acceso puedes:

- entrar con correo y contraseña,
- registrarte con correo,
- usar Google o GitHub (si está habilitado).

Si te registras por correo, puede que debas confirmar tu email antes de entrar.

### 2.2 Ingreso mensual inicial

Al entrar por primera vez, la app puede pedirte tu **ingreso mensual**.
Este dato se usa para calcular:

- saldo esperado del mes,
- comparativos de gasto,
- algunos resúmenes del panel.

Si no lo defines, algunas tarjetas pueden verse menos precisas.

---

## 3. Navegación principal

En la barra lateral encontrarás:

1. **Panel**
2. **Categorías**
3. **Transacciones**
4. **Presupuestos**
5. **Ahorros**
6. **Inversiones**
7. **Informes**
8. **Facturas**
9. **Notificaciones**

También tienes acceso a:

- **Perfil**,
- **Configuración**,
- **Suscripción** (según tu plan),
- botón para cerrar sesión.

---

## 4. Panel (inicio)

El Panel resume lo más importante del momento.

### 4.1 Qué verás

- **Tarjetas superiores:** saldo, ingresos y gastos.
- **Desglose de gastos:** en forma de distribución por categoría.
- **Transacciones recientes:** solo de la semana actual.
- **Metas de ahorro:** se muestran las últimas 5.
- **Próximas facturas:** pendientes del mes actual (máximo 5).

### 4.2 Para qué sirve

Es la vista rápida para saber:

- cómo vas este mes,
- si hay gastos desbalanceados,
- si tienes vencimientos próximos,
- si tus metas de ahorro avanzan.

---

## 5. Transacciones

Este módulo es el historial completo de movimientos.

### 5.1 Crear transacción

1. Clic en **Nueva Transacción**.
2. Elige tipo: ingreso o gasto.
3. Completa comercio, categoría, monto y fecha.
4. Guarda.

### 5.2 Editar o eliminar

- Usa los botones de acción en cada fila.
- Al eliminar, se solicita confirmación.

### 5.3 Filtros y búsqueda

Puedes filtrar por:

- tipo (ingreso/gasto),
- periodo (mes actual, mes pasado, año, todo),
- texto (comercio o categoría).

### 5.4 Paginación

- Se muestran 20 registros iniciales.
- Botón **Cargar más** agrega 20 adicionales.

### 5.5 Edición masiva

Puedes seleccionar varias transacciones y aplicar cambios conjuntos:

- categoría,
- tipo,
- fecha.

También puedes eliminar varias al mismo tiempo.

### 5.6 Deshacer acciones

Después de crear, eliminar o editar masivamente, aparece una opción de **Deshacer** por unos segundos.
Esto permite revertir acciones críticas rápidamente.

### 5.7 Reglas automáticas por comercio

Puedes crear reglas como:

- "uber" → categoría **Transporte**,
- "nomina" → tipo **Ingreso**.

Al escribir un comercio en una nueva transacción, la app sugiere y aplica la regla.

Si tu entorno tiene activada la versión Pro en base de datos, estas reglas se sincronizan con tu cuenta.

### 5.8 Recurrentes

Puedes guardar plantillas para movimientos repetitivos y generar las transacciones del mes actual con un clic.

Con versión Pro activa, las plantillas quedan guardadas en la nube para tu usuario.

### 5.9 Historial de cambios

El módulo de transacciones mantiene una bitácora reciente con:

- fecha/hora,
- acción realizada,
- detalle del cambio.

Con versión Pro activa, este historial también queda persistido por usuario.

### 5.10 Exportar

Puedes exportar la vista filtrada a:

- CSV,
- Excel,
- PDF.

---

## 6. Presupuestos

Aquí defines límites por categoría y mes.

### 6.1 Crear presupuesto

1. Clic en **Crear Nuevo Presupuesto**.
2. Elige categoría.
3. Define límite mensual.
4. Asigna mes.
5. Guarda.

### 6.2 Seguimiento

Cada tarjeta muestra:

- cuánto has gastado,
- cuánto era el límite,
- porcentaje consumido,
- barra de progreso.

### 6.3 Filtro temporal

Puedes revisar:

- mes actual,
- mes pasado,
- todos los meses.

---

## 7. Ahorros

Gestiona metas, aportes y avance total.

### 7.1 Metas de ahorro

Para cada meta defines:

- título,
- categoría,
- prioridad (alta, media, baja),
- plazo (corto, mediano, largo),
- monto objetivo,
- fecha objetivo (opcional),
- imagen (opcional).

### 7.2 Aportes

Desde cada meta puedes registrar aportes.
Cada aporte actualiza el avance de la meta.

### 7.3 Historial de aportes

Se muestra en formato tabla, tipo transacción.

- Visual inicial: 12 filas.
- Botón **Cargar más**: suma 12.
- **Ver todo** redirige al módulo de transacciones.

### 7.4 “Ver todas” metas

Si tienes muchas metas:

- se muestran destacadas al inicio,
- las demás se cargan por bloques para mantener la pantalla ligera.

---

## 8. Facturas

Ideal para evitar vencimientos olvidados.

### 8.1 Qué puedes registrar

- título,
- categoría,
- descripción,
- monto,
- fecha de vencimiento,
- estado,
- urgencia,
- recurrencia.

### 8.2 Listado y carga incremental

- Vista inicial: 12 facturas.
- **Cargar más**: agrega 12.
- Si filtras o buscas, la lista vuelve al inicio para mantener orden.

### 8.3 Estados sugeridos

- Pendiente
- Urgente
- Pagado

---

## 9. Inversiones

Control de tus posiciones y rendimiento.

### 9.1 Registrar inversión

Para cada inversión puedes guardar:

- nombre,
- tipo,
- valor invertido,
- valor actual,
- fecha de inicio,
- imagen,
- notas.

### 9.2 Indicadores

El módulo muestra:

- total invertido,
- valor actual,
- ganancia/pérdida,
- distribución del portafolio.

---

## 10. Informes

Módulo de análisis visual.

### 10.1 Qué incluye

- tendencia de gastos mensuales,
- distribución por categoría,
- ingresos vs gastos,
- tabla de transacciones recientes.

### 10.2 Rango de tiempo

Puedes elegir:

- últimos 3, 6 o 12 meses,
- ventana anual configurable,
- rango personalizado (desde/hasta).

### 10.3 Tabla de recientes

- inicial: 20 movimientos,
- **Cargar más**: +20,
- **Ver todo** lleva a Transacciones.

### 10.4 Exportación

Disponible en:

- CSV,
- Excel,
- PDF.

---

## 11. Categorías

Permite organizar mejor tus datos por módulo:

- transacciones,
- presupuestos,
- facturas,
- ahorros.

Dependiendo de tu rol/plan, podrás:

- ver categorías,
- crear,
- editar,
- eliminar.

---

## 12. Notificaciones

Centraliza alertas importantes como:

- facturas próximas,
- movimientos recientes,
- alertas de presupuesto,
- eventos de seguridad/sistema.

Puedes:

- marcar como leídas,
- filtrar,
- abrir el detalle relacionado.

---

## 13. Perfil y Configuración

### 13.1 Perfil

- nombre,
- avatar,
- teléfono,
- seguridad (cambio de contraseña).

### 13.2 Configuración

- idioma,
- moneda,
- formato de fecha,
- preferencias de notificaciones,
- tema visual,
- gestión de suscripción (si aplica).

---

## 14. Consejos de uso

1. Registra transacciones con frecuencia (ideal: diario).
2. Mantén categorías consistentes para mejores reportes.
3. Revisa facturas cada semana.
4. Actualiza aportes de ahorro en cuanto los hagas.
5. Usa informes mensualmente para detectar fugas de gasto.

---

## 15. Problemas comunes (en lenguaje simple)

### “No veo datos en pantalla”

- Verifica que estés en la cuenta correcta.
- Revisa que realmente existan movimientos cargados.
- Aplica menos filtros para validar.

### “No puedo subir imagen”

- Puede ser un problema temporal de conexión.
- Intenta con otra imagen o vuelve a intentar más tarde.

### “No me aparece una sección”

- Algunas opciones dependen de rol o plan.

### “No puedo entrar”

- Revisa correo/contraseña.
- Si te registraste por email, confirma tu correo.

---

## 16. Buenas prácticas de seguridad

- Usa contraseña robusta.
- No compartas tu cuenta.
- Cierra sesión en equipos compartidos.
- Cambia tu contraseña periódicamente.

---

## 17. Soporte

Si necesitas ayuda:

- revisa la sección de soporte dentro de la app,
- comparte capturas y pasos exactos del problema,
- indica módulo y hora aproximada del incidente.

---

## 18. Capturas recomendadas para documentación

Para que el manual sea más visual, conviene agregar estas capturas en este orden:

1. Login / registro.
2. Panel principal completo.
3. Crear transacción.
4. Lista de transacciones con filtros.
5. Crear presupuesto.
6. Módulo de ahorros (metas + historial).
7. Módulo de facturas con estado.
8. Informes (gráficas + tabla reciente).
9. Perfil y configuración.

Estructura sugerida en el repositorio:

- `frontend/docs/screenshots/login.png`
- `frontend/docs/screenshots/panel.png`
- `frontend/docs/screenshots/transacciones-form.png`
- `frontend/docs/screenshots/transacciones-lista.png`
- `frontend/docs/screenshots/presupuestos.png`
- `frontend/docs/screenshots/ahorros.png`
- `frontend/docs/screenshots/facturas.png`
- `frontend/docs/screenshots/informes.png`
- `frontend/docs/screenshots/perfil-configuracion.png`

---

### Resumen rápido

Si solo recuerdas 5 cosas:

1. Transacciones = base de todo.
2. Presupuestos = control por categoría.
3. Ahorros = metas y aportes.
4. Facturas = vencimientos y urgencias.
5. Informes = análisis y decisiones.
