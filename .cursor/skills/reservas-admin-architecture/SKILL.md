---
name: reservas-admin-architecture
description: Guía al agente para trabajar en el panel administrativo de Reservas (Laravel 12 + React/Inertia), con separación estricta entre promociones y eventos a nivel de base de datos, API y UI, y mejoras técnicas de arquitectura.
---

# Arquitectura del admin de Reservas (Laravel 12 + React/Inertia)

Este skill explica cómo debe razonar y actuar el agente cuando trabaja en este proyecto.

## 1. Contexto del proyecto

- Proyecto Laravel 12 orientado a **gestión administrativa de reservas**.
- Frontend montado sobre **React + Inertia** en `resources/js`.
- Rutas de frontend generadas con el sistema de `wayfinder` (`resources/js/wayfinder` y `resources/js/routes/**`).
- API REST en `App\Http\Controllers\Api\V1\...`, con recursos en `App\Http\Resources\Api\V1\...`.
- Ya existe un dominio de **promociones** (`Promotion`, `PromotionService`, `PromotionController`, `PromotionResource`, migraciones de `promotions`).

Cuando el usuario pida cambios de arquitectura, modelos, migraciones, controladores o páginas de React, asume este contexto.

## 2. Principio clave: separar Promociones y Eventos

### 2.1. Estado actual detectado

- La página `resources/js/pages/promotions/index.tsx` mezcla “Promociones” y “Eventos” en una sola lista de `promotions`, separándolos por `discount_type`:
  - Promos: `discount_type && discount_type !== 'none'`.
  - Eventos: `!discount_type || discount_type === 'none'`.
- Eso provoca que “eventos” estén **sobre el modelo de promociones** y compartan la misma tabla y API.

### 2.2. Objetivo de diseño

Al trabajar en este proyecto, siempre que haya que tocar algo relacionado con promociones/eventos:

- **Promociones**:
  - Entidad propia: modelo `Promotion`, tabla `promotions`, migraciones ya existentes.
  - Atributos típicos:
    - `name`, `description`, `code`.
    - `discount_type` (`percentage`, `fixed_amount`), `discount_value`.
    - `starts_at`, `ends_at`.
    - `max_uses`, `max_uses_per_user`, `current_uses`.
    - `is_active`.
    - Opcionalmente: `banner_path` para ilustrar la promo, pero con enfoque de descuento.

- **Eventos**:
  - Entidad separada, NO reutiliza `discount_type` / `discount_value` como truco.
  - Se recomienda:
    - Modelo `Event` (`App\Models\Event`).
    - Tabla `events` con campos como:
      - `id`, `business_id` (relación con negocio si aplica).
      - `name`, `description`.
      - `starts_at`, `ends_at`.
      - `is_active`.
      - `banner_path` o `banner_url` para portada.
  - Podrán tener relación con promociones, pero si se necesita, se modela explícitamente (por ejemplo, tabla pivote `event_promotion`).

### 2.3. Reglas cuando el usuario pida separarlos

Cuando el usuario pida “separar promociones y eventos” o algo relacionado:

1. **Base de datos**:
   - Crear migración para `events` (si no existe).
   - Añadir modelo `Event` con `HasFactory` y relaciones necesarias.
   - Si actualmente se usan registros de `promotions` con `discount_type = 'none'` como eventos:
     - Proponer una migración/command para mover esos datos a `events`.

2. **Backend (Laravel)**:
   - Crear `App\Http\Controllers\Api\V1\EventController` con endpoints estándar:
     - `index`, `store`, `show`, `update`, `destroy`.
   - Crear `App\Http\Resources\Api\V1\EventResource`.
   - Opcionalmente, crear un `EventService` para encapsular lógica de negocio.
   - Registrar rutas API bajo algo como:
     - `/api/v1/admin/businesses/{business}/events`.

3. **Frontend (React + Inertia)**:
   - Mantener **páginas separadas**:
     - `resources/js/pages/promotions/index.tsx` solo para promociones.
     - Crear `resources/js/pages/events/index.tsx` (si aún no existe) solo para eventos.
   - Definir rutas de `wayfinder` específicas:
     - `resources/js/routes/api/v1/admin/promotions/index.ts` (ya existe, solo promociones).
     - Crear `resources/js/routes/api/v1/admin/events/index.ts` para eventos.
   - En lugar de filtrar `promotions` en el frontend para simular eventos, usar llamadas a la nueva API de eventos.

4. **UI / Navegación**:
   - En el layout o menú lateral del admin, mostrar entradas distintas:
     - “Promociones” (códigos de descuento).
     - “Eventos” (campañas, temporadas, banners).
   - Los títulos de pantalla deben ser claros:
     - Pantalla de promociones: por ejemplo “Códigos de Descuento Activos”.
     - Pantalla de eventos: por ejemplo “Eventos y Campañas”.

## 3. Buenas prácticas técnicas a seguir en este proyecto

Al proponer o modificar código:

- **Controladores finos, servicios gordos**:
  - Mantener controladores ligeros (validación + delegar en servicios).
  - Encapsular reglas complejas en `App\Services\...` (por ejemplo, cálculo de disponibilidad de reservas, aplicaciones de promociones).

- **Form Requests**:
  - Utilizar `FormRequest` para validar entrada en `store/update` (por ejemplo `StorePromotionRequest`, `UpdatePromotionRequest`, `StoreEventRequest`, `UpdateEventRequest`).

- **Resources JSON**:
  - Usar siempre `JsonResource` para respuesta de API pública/admin (`PromotionResource`, `EventResource`).
  - Adaptar tipos TS en `resources/js` a la estructura exacta de esos resources.

- **TypeScript en frontend**:
  - Definir tipos para entidades clave en un lugar reutilizable, por ejemplo:
    - `resources/js/types/promotion.ts`
    - `resources/js/types/event.ts`
  - Mantener formularios fuertemente tipados (usar `useForm` de Inertia con tipos generics cuando sea posible).

## 4. Patrón para sugerir mejoras de UX/UI

Cuando el usuario pida “poner las cosas en su lugar” o “mejorar detalles técnicos”:

1. **Revisar jerarquía de navegación**:
   - Ver rutas y páginas existentes en `resources/js/pages` y `resources/js/routes`.
   - Proponer agrupación lógica de menús (Reservas, Usuarios, Promociones, Eventos, Configuración, etc.).

2. **Unificar componentes de UI**:
   - Reutilizar componentes compartidos (`Table`, `Dialog`, `Card`, `Tabs`, etc.).
   - Usar diseño consistente: mismos paddings, tamaños de tipografía y colores para estados (activo/inactivo, errores, etc.).

3. **Claridad de formularios**:
   - Para promociones: resaltar muy claro cuando es porcentaje vs monto fijo.
   - Para eventos: enfatizar fechas y banner, no campos de precio/discount.

4. **Mensajes y feedback**:
   - Proponer mensajes de éxito claros (`flash.success`) y errores amigables.
   - Aprovechar `Alert`, `Badge` y estados visuales para mostrar estatus.

## 5. Cómo debe actuar el agente paso a paso

Cuando el usuario pida ayuda en este proyecto:

1. **Identificar el dominio**:
   - Si menciona promociones/cupones/descuentos ⇒ trabajar con `Promotion` y sus APIs.
   - Si menciona eventos/campañas/banners ⇒ trabajar con entidad `Event` y sus APIs/páginas dedicadas.

2. **Explorar código relevante**:
   - Backend:
     - Modelos en `app/Models`.
     - Servicios en `app/Services`.
     - Controladores en `app/Http/Controllers/Web` y `app/Http/Controllers/Api/V1`.
     - Migraciones en `database/migrations`.
   - Frontend:
     - Páginas en `resources/js/pages`.
     - Rutas generadas en `resources/js/routes`.
     - Componentes de UI en `resources/js/components`.

3. **Proponer cambios consistentes**:
   - Si toca BD, diseñar primero modelos/campos y relaciones.
   - Después ajustar controladores/servicios/resources.
   - Finalmente adaptar React/Inertia (páginas, rutas y tipos TS).

4. **Verificación**:
   - Revisar que las nuevas rutas/campos no rompan las llamadas existentes.
   - Mantener la compatibilidad visual del panel (mismo estilo y componentes).

## 6. Ejemplo rápido de separación

### Antes (antipatrón detectado en `promotions/index.tsx`)

- Eventos se definen como:
  - `const events = promotions.filter(p => !p.discount_type || p.discount_type === 'none');`
- Es decir, se infiere la existencia de eventos a partir de la ausencia de descuento en `Promotion`.

### Después (patrón deseado)

- Promociones:
  - Se cargan desde `/api/v1/admin/businesses/{business}/promotions`.
  - Se tipan como `Promotion` en frontend y se muestran en `pages/promotions/index.tsx`.

- Eventos:
  - Se cargan desde `/api/v1/admin/businesses/{business}/events`.
  - Se tipan como `Event` en frontend y se muestran en `pages/events/index.tsx`.
  - El formulario de eventos no muestra campos de tipo/valor de descuento.

Siempre que el usuario pida refactors o nuevas funcionalidades en este área, seguir este patrón.

