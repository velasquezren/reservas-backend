# Reservas — Guía Definitiva Next.js (Flujo Cliente)

> **Solo flujo cliente**: reservar mesa, ver menú, aplicar promos, ver eventos.  
> Sin CRUD admin. Sin panel de gestión.

---

## Índice

1. [Configuración Base](#1-configuración-base)
2. [Arquitectura de Carpetas](#2-arquitectura-de-carpetas)
3. [API Client (Fetch Wrapper)](#3-api-client)
4. [TypeScript — Tipos Completos](#4-tipos-typescript)
5. [Flujo Completo Paso a Paso](#5-flujo-completo-paso-a-paso)
6. [PASO 1 — Seleccionar Restaurante](#paso-1--seleccionar-restaurante)
7. [PASO 2 — Ver Menú y Mesas](#paso-2--ver-menú-y-mesas)
8. [PASO 3 — Seleccionar Mesa + Fecha + Hora](#paso-3--seleccionar-mesa--fecha--hora)
9. [PASO 4 — Pre-ordenar del Menú (Opcional)](#paso-4--pre-ordenar-del-menú-opcional)
10. [PASO 5 — Aplicar Código Promocional (Opcional)](#paso-5--aplicar-código-promocional-opcional)
11. [PASO 6 — Enviar Reserva](#paso-6--enviar-reserva)
12. [PASO 7 — Pantalla de Confirmación](#paso-7--pantalla-de-confirmación)
13. [Funciones Complementarias](#funciones-complementarias)
14. [Manejo de Errores](#manejo-de-errores)
15. [Contratos API — Request/Response Completos](#contratos-api)

---

## 1. Configuración Base

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Base URL de TODOS los endpoints:** `{NEXT_PUBLIC_API_URL}`

**Headers requeridos en TODOS los requests:**

```
Accept: application/json
Content-Type: application/json
```

> **No se necesita autenticación** para el flujo de reserva del cliente.  
> El backend crea una "shadow account" automáticamente con el teléfono del cliente.

---

## 2. Arquitectura de Carpetas

```
src/
├── app/
│   ├── page.tsx                          # Lista de restaurantes
│   ├── [businessSlug]/
│   │   ├── page.tsx                      # Detalle restaurante + categorías + items
│   │   ├── reservar/
│   │   │   └── page.tsx                  # Formulario de reserva (wizard multi-step)
│   │   ├── eventos/
│   │   │   └── page.tsx                  # Eventos del restaurante
│   │   └── reviews/
│   │       └── page.tsx                  # Reseñas públicas
│   └── confirmacion/
│       └── [reservationId]/
│           └── page.tsx                  # Pantalla de confirmación post-reserva
├── lib/
│   ├── api.ts                            # Fetch wrapper
│   └── types.ts                          # Tipos TypeScript
├── hooks/
│   ├── use-businesses.ts
│   ├── use-business.ts
│   ├── use-items.ts
│   ├── use-events.ts
│   ├── use-promotions.ts
│   ├── use-reviews.ts
│   └── use-reservation.ts
└── components/
    ├── business-card.tsx
    ├── category-tabs.tsx
    ├── item-card.tsx
    ├── table-selector.tsx
    ├── date-time-picker.tsx
    ├── party-size-input.tsx
    ├── menu-pre-order.tsx
    ├── promo-code-input.tsx
    ├── reservation-summary.tsx
    ├── reservation-confirmation.tsx
    ├── event-card.tsx
    └── review-card.tsx
```

---

## 3. API Client

```ts
// src/lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error: ApiError = {
      message: body.message ?? `Error ${res.status}`,
      errors: body.errors,
    };
    throw error;
  }

  return res.json();
}

// ── Helpers tipados ──────────────────────────────────────────────────

export const api = {
  // Restaurantes
  getBusinesses: (page = 1) =>
    apiFetch<PaginatedResponse<Business>>(`/businesses?page=${page}`),

  getBusiness: (id: string) =>
    apiFetch<{ data: Business }>(`/businesses/${id}`),

  // Categorías + Items
  getCategories: (businessId: string) =>
    apiFetch<{ data: Category[] }>(`/businesses/${businessId}/categories`),

  getItems: (businessId: string, page = 1) =>
    apiFetch<PaginatedResponse<Item>>(`/businesses/${businessId}/items?page=${page}`),

  getItem: (businessId: string, itemId: string) =>
    apiFetch<{ data: Item }>(`/businesses/${businessId}/items/${itemId}`),

  // Disponibilidad de mesas (NUEVO)
  getAvailability: (businessId: string, params: AvailabilityParams) => {
    const qs = new URLSearchParams({
      date: params.date,
      start_time: params.start_time,
      ...(params.duration ? { duration: String(params.duration) } : {}),
      ...(params.party_size ? { party_size: String(params.party_size) } : {}),
    });
    return apiFetch<AvailabilityResponse>(
      `/businesses/${businessId}/availability?${qs}`,
    );
  },

  // Eventos
  getEvents: (businessId: string, page = 1) =>
    apiFetch<PaginatedResponse<Event>>(`/admin/businesses/${businessId}/events?page=${page}`),

  // Promociones (válidas y activas)
  getPromotions: (businessId: string, page = 1) =>
    apiFetch<PaginatedResponse<Promotion>>(`/admin/businesses/${businessId}/promotions?page=${page}`),

  // Reviews públicas
  getReviews: (businessId: string, page = 1) =>
    apiFetch<PaginatedResponse<Review>>(`/reviews?business_id=${businessId}&page=${page}`),

  // ── RESERVA (endpoint principal) ──────────────────────────────────
  createReservation: (businessId: string, payload: CreateReservationPayload) =>
    apiFetch<{ data: Reservation }>(`/businesses/${businessId}/reservations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
```

---

## 4. Tipos TypeScript

```ts
// src/lib/types.ts

// ── Paginación Laravel ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

// ── Business ────────────────────────────────────────────────────────
export interface Business {
  id: string;              // ULID
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;        // "America/La_Paz"
  status: "active" | "inactive" | "suspended";
  description: string | null;
  logo_url: string | null;
  average_rating: number;  // 0.0 - 5.0
  total_reviews: number;
  categories: Category[];  // Incluido en show()
  created_at: string;      // ISO 8601
}

// ── Category ────────────────────────────────────────────────────────
export interface Category {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  items: Item[];           // Incluido cuando se carga la relación
  created_at: string;
}

// ── Item (Mesa o Ítem de Menú) ──────────────────────────────────────
export interface Item {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  type: "reservable" | "menu_item";    // "reservable" = mesa, "menu_item" = comida/bebida
  status: "active" | "inactive" | "draft";
  base_price: number;                  // En CENTAVOS (ej: 5000 = 50.00 BOB)
  base_price_formatted: string;        // "Bs 50.00"
  capacity: number | null;             // Solo para type="reservable" (máx personas)
  duration_minutes: number | null;     // Duración por defecto del slot
  variants: Record<string, unknown> | null;  // Variantes (tamaño, extras, etc.)
  sort_order: number;
  category: Category | null;
  pricing_rules: PricingRule[];        // Reglas de precio dinámico
  created_at: string;
}

// ── Pricing Rule ────────────────────────────────────────────────────
export interface PricingRule {
  id: string;
  item_id: string;
  name: string | null;
  override_price: number;              // En centavos
  override_price_formatted: string;
  specific_date: string | null;        // "2026-03-14" para fecha específica
  day_of_week: number | null;          // 0=Dom, 1=Lun, ..., 6=Sáb
  starts_at: string | null;            // "18:00:00"
  ends_at: string | null;              // "23:00:00"
  is_active: boolean;
}

// ── Promotion ───────────────────────────────────────────────────────
export interface Promotion {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  code: string;                        // Código que el cliente escribe
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;              // % (ej: 15) o centavos (ej: 2000 = Bs 20)
  starts_at: string;                   // ISO 8601
  ends_at: string;                     // ISO 8601
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number;
  is_active: boolean;
  is_valid: boolean;                   // Computado: activo + dentro de fechas + usos disponibles
  created_at: string;
}

// ── Event ───────────────────────────────────────────────────────────
export interface Event {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  starts_at: string | null;            // ISO 8601
  ends_at: string | null;
  is_active: boolean;
  banner_url: string | null;           // URL completa de la imagen
  created_at: string | null;
  updated_at: string | null;
}

// ── Review ──────────────────────────────────────────────────────────
export interface Review {
  id: string;
  business_id: string;
  rating: number;                      // 1-5
  comment: string | null;
  photos: string[];                    // URLs de fotos
  status: "pending_moderation" | "published" | "rejected";
  owner_reply: string | null;
  replied_at: string | null;
  user: User | null;
  created_at: string;
  updated_at: string;
}

// ── Reservation ─────────────────────────────────────────────────────
export interface Reservation {
  id: string;
  confirmation_code: string;           // Código único para el cliente (ej: "RES-A1B2C3")
  status: "pending" | "confirmed" | "completed" | "no_show" | "cancelled";
  status_label: string;                // "Pendiente", "Confirmada", etc.
  source: "app" | "web" | "walk_in" | "phone";
  scheduled_date: string;              // "2026-03-15"
  start_time: string;                  // "19:30"
  duration_minutes: number;
  party_size: number;
  notes: string | null;
  total_amount: number;                // Centavos (incluye todo: mesa + menú - descuento)
  total_formatted: string;             // "Bs 150.00"
  discount_amount: number;             // Centavos descontados
  discount_formatted: string;          // "Bs 20.00"
  price_snapshot: PriceSnapshot;
  promo_snapshot: PromoSnapshot | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  item: Item | null;                   // La mesa reservada
  user: User | null;
  business: Business | null;
  reservation_items: ReservationItem[];// Items pre-ordenados
  review: Review | null;
  created_at: string;
  updated_at: string;
}

export interface PriceSnapshot {
  item_id: string;
  item_name: string;
  base_price: number;
  effective_price: number;
  currency: string;                    // "BOB"
  captured_at: string;
}

export interface PromoSnapshot {
  promo_id: string;
  promo_code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  captured_at: string;
}

export interface ReservationItem {
  id: string;
  item_id: string;
  quantity: number;
  unit_price: number;                  // Centavos
  subtotal: number;                    // Centavos (unit_price × quantity)
  subtotal_formatted: string;          // "Bs 30.00"
  variant_snapshot: Record<string, unknown> | null;
  notes: string | null;
  item: Item | null;
}

export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  phone_verified_at: string | null;
  created_at: string;
}

// ── Payload para crear reserva ──────────────────────────────────────
export interface CreateReservationPayload {
  customer_name: string;               // Requerido
  customer_phone: string;              // Requerido (ej: "+59170000000")
  customer_email?: string;             // Opcional
  item_id: string;                     // ULID de la mesa (type=reservable)
  scheduled_date: string;              // "2026-03-15" (>= hoy)
  start_time: string;                  // "19:30" (formato H:i)
  party_size: number;                  // >= 1, <= capacity de la mesa
  duration_minutes?: number;           // Opcional (15-480 min, default del item)
  notes?: string;                      // Opcional, máx 500 chars
  promo_code?: string;                 // Opcional, máx 50 chars
  items?: PreOrderItem[];              // Opcional: pre-pedido de menú
}

export interface PreOrderItem {
  item_id: string;                     // ULID de un item type=menu_item
  quantity: number;                    // >= 1
  notes?: string;                      // Personalización, máx 255 chars
}

// ── Disponibilidad de Mesas ─────────────────────────────────────────
export interface AvailabilityParams {
  date: string;                        // "YYYY-MM-DD", >= hoy
  start_time: string;                  // "HH:mm"
  duration?: number;                   // Minutos (15-480), opcional
  party_size?: number;                 // Filtra por capacidad, opcional
}

export interface AvailabilitySlot {
  table: Item;
  is_available: boolean;               // true = libre y con capacidad suficiente
  is_occupied: boolean;                // true = tiene reserva en ese horario
  fits_party: boolean;                 // true = capacity >= party_size
  slot: {
    date: string;
    start_time: string;
    duration_minutes: number;
    end_time: string;
  };
}

export interface AvailabilityResponse {
  data: AvailabilitySlot[];
  summary: {
    total_tables: number;
    available_tables: number;
    occupied_tables: number;
    date: string;
    start_time: string;
  };
}
```

---

## 5. Flujo Completo Paso a Paso

```
┌─────────────────────────────────────────────────────────────┐
│  FLUJO DE RESERVA — CLIENTE NEXT.JS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ① Elegir Restaurante                                      │
│     GET /businesses                                         │
│       ↓                                                     │
│  ② Ver Menú y Mesas                                        │
│     GET /businesses/{id}  (con categories + items)          │
│     GET /businesses/{id}/items                              │
│       ↓                                                     │
│  ③ Seleccionar Mesa + Fecha + Hora + Personas              │
│     (filtrar items donde type = "reservable")               │
│     (validar party_size <= capacity)                        │
│       ↓                                                     │
│  ④ Pre-ordenar del Menú (opcional)                         │
│     (filtrar items donde type = "menu_item")                │
│     (agregar al carrito con quantity)                        │
│       ↓                                                     │
│  ⑤ Aplicar Código Promo (opcional)                         │
│     (el cliente escribe el código, se valida al enviar)     │
│       ↓                                                     │
│  ⑥ Enviar Reserva                                          │
│     POST /businesses/{id}/reservations                      │
│     body: { customer_name, customer_phone, item_id, ... }   │
│       ↓                                                     │
│  ⑦ Pantalla Confirmación                                   │
│     Mostrar: confirmation_code, resumen, total, descuento   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## PASO 1 — Seleccionar Restaurante

### Endpoint

```
GET /businesses?page=1
```

### Response

```json
{
  "data": [
    {
      "id": "01HXYZ...",
      "name": "Restaurante El Pahuichi",
      "slug": "el-pahuichi",
      "phone": "+59133445566",
      "email": "info@elpahuichi.com",
      "address": "Av. San Martín #123, Santa Cruz",
      "timezone": "America/La_Paz",
      "status": "active",
      "description": "Comida típica cruceña...",
      "logo_url": "https://...",
      "average_rating": 4.5,
      "total_reviews": 128,
      "categories": [],
      "created_at": "2026-01-15T10:00:00-04:00"
    }
  ],
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
  "meta": { "current_page": 1, "last_page": 3, "per_page": 20, "total": 54 }
}
```

### UI Sugerida

- Grid de tarjetas con logo, nombre, rating (estrellas), dirección.
- Click → navega a `/{businessSlug}` o `/{businessId}`.
- Scroll infinito o botón "Cargar más" con paginación.

---

## PASO 2 — Ver Menú y Mesas

### Endpoints (paralelos)

```
GET /businesses/{businessId}
```

> El `show()` carga `categories.items` automáticamente.

**O por separado:**

```
GET /businesses/{businessId}/categories
GET /businesses/{businessId}/items?page=1
```

### Separar Items por Tipo

```ts
// En tu componente o hook:
const tables = items.filter((i) => i.type === "reservable" && i.status === "active");
const menuItems = items.filter((i) => i.type === "menu_item" && i.status === "active");
```

**`type = "reservable"`** → Son las MESAS (tienen `capacity` y `duration_minutes`).  
**`type = "menu_item"`** → Son platos/bebidas (tienen `base_price`, sin capacity).

### Item Response Ejemplo

```json
{
  "id": "01HABC...",
  "name": "Mesa VIP Terraza",
  "type": "reservable",
  "status": "active",
  "base_price": 10000,
  "base_price_formatted": "Bs 100.00",
  "capacity": 6,
  "duration_minutes": 120,
  "description": "Mesa para 6 personas con vista...",
  "image_url": "https://...",
  "pricing_rules": [
    {
      "name": "Viernes noche",
      "override_price": 15000,
      "override_price_formatted": "Bs 150.00",
      "day_of_week": 5,
      "starts_at": "18:00:00",
      "ends_at": "23:00:00",
      "is_active": true
    }
  ],
  "category": {
    "id": "01HCAT...",
    "name": "Mesas VIP"
  }
}
```

### UI Sugerida

- Tabs por categoría (usando `categories` con `sort_order`).
- Cards de mesas mostrando: nombre, imagen, capacidad, precio base, pricing rules como tags ("Viernes noche: Bs 150").
- Cards de menú mostrando: nombre, imagen, precio, descripción.

---

## PASO 3 — Seleccionar Mesa + Fecha + Hora

### NUEVO: Consultar Disponibilidad de Mesas en Tiempo Real

Antes de que el cliente elija una mesa, **consulta cuáles están libres**:

```
GET /businesses/{businessId}/availability?date=2026-03-15&start_time=19:30&party_size=4
```

**Parámetros de query:**

| Param        | Tipo     | Requerido | Descripción                                |
|--------------|----------|-----------|--------------------------------------------|
| `date`       | `string` | Sí        | `YYYY-MM-DD`, >= hoy                       |
| `start_time` | `string` | Sí        | `HH:mm` (24h)                              |
| `duration`   | `number` | No        | Minutos (15-480), default de cada mesa      |
| `party_size` | `number` | No        | Filtra mesas que no tienen suficiente capacidad |

**Response:**

```json
{
  "data": [
    {
      "table": {
        "id": "01HABC...",
        "name": "Mesa 1 - Interior",
        "type": "reservable",
        "capacity": 4,
        "base_price": 5000,
        "base_price_formatted": "Bs 50.00",
        "image_url": "https://...",
        "pricing_rules": [...]
      },
      "is_available": true,
      "is_occupied": false,
      "fits_party": true,
      "slot": {
        "date": "2026-03-15",
        "start_time": "19:30",
        "duration_minutes": 90,
        "end_time": "21:00"
      }
    },
    {
      "table": {
        "id": "01HDEF...",
        "name": "Mesa 2 - Terraza",
        "type": "reservable",
        "capacity": 2,
        "base_price": 3000,
        "base_price_formatted": "Bs 30.00"
      },
      "is_available": false,
      "is_occupied": true,
      "fits_party": false,
      "slot": {
        "date": "2026-03-15",
        "start_time": "19:30",
        "duration_minutes": 90,
        "end_time": "21:00"
      }
    }
  ],
  "summary": {
    "total_tables": 15,
    "available_tables": 9,
    "occupied_tables": 6,
    "date": "2026-03-15",
    "start_time": "19:30"
  }
}
```

**Flujo correcto en Next.js:**

```ts
// 1. El cliente elige fecha + hora + personas
// 2. Llamas al endpoint de disponibilidad
const { data: slots, summary } = await api.getAvailability(businessId, {
  date: "2026-03-15",
  start_time: "19:30",
  party_size: 4,
});

// 3. Filtrar mesas disponibles
const available = slots.filter((s) => s.is_available);
const occupied = slots.filter((s) => s.is_occupied);

// 4. Mostrar las mesas: verdes = disponibles, rojas/grises = ocupadas
// 5. El cliente solo puede hacer click en las disponibles
```

**UI Sugerida para el Selector de Mesas:**

```tsx
{slots.map((slot) => (
  <button
    key={slot.table.id}
    disabled={!slot.is_available}
    onClick={() => setSelectedTable(slot.table)}
    className={cn(
      "border rounded-lg p-4",
      slot.is_available
        ? "border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer"
        : "border-red-300 bg-red-50 opacity-60 cursor-not-allowed",
    )}
  >
    <p className="font-bold">{slot.table.name}</p>
    <p>Capacidad: {slot.table.capacity} personas</p>
    <p>{slot.table.base_price_formatted}</p>
    {!slot.is_available && (
      <span className="text-red-600 text-sm">
        {slot.is_occupied ? "Ocupada" : `Capacidad insuficiente (máx ${slot.table.capacity})`}
      </span>
    )}
    {slot.is_available && (
      <span className="text-green-600 text-sm">Disponible</span>
    )}
  </button>
))}
```

> **Importante:** Cada vez que el cliente cambia la fecha, hora, o número de personas, debes volver a llamar a `getAvailability()` para actualizar las mesas.

---

### Datos que se Capturan

| Campo              | Tipo     | Validación                              |
|--------------------|----------|-----------------------------------------|
| `item_id`          | `string` | ULID de la mesa seleccionada            |
| `scheduled_date`   | `string` | Formato `YYYY-MM-DD`, >= hoy            |
| `start_time`       | `string` | Formato `HH:mm` (24h)                   |
| `party_size`       | `number` | >= 1, <= `mesa.capacity`                |
| `duration_minutes` | `number` | Opcional (15–480), default del item      |

### Lógica de Precio Dinámico (Frontend Preview)

El backend resuelve el precio real, pero puedes mostrar un preview en el frontend:

```ts
function previewPrice(item: Item, date: string, time: string): number {
  const d = new Date(`${date}T${time}`);
  const dayOfWeek = d.getDay(); // 0=Dom, 6=Sáb

  // Buscar regla con mayor especificidad
  const activeRules = item.pricing_rules.filter((r) => r.is_active);

  // Tier 1: fecha específica
  const specificDate = activeRules.find((r) => r.specific_date === date);
  if (specificDate) return specificDate.override_price;

  // Tier 2: día + hora
  const dayAndTime = activeRules.find(
    (r) =>
      r.day_of_week === dayOfWeek &&
      r.starts_at && r.ends_at &&
      time >= r.starts_at.slice(0, 5) &&
      time <= r.ends_at.slice(0, 5),
  );
  if (dayAndTime) return dayAndTime.override_price;

  // Tier 3: solo día
  const dayOnly = activeRules.find(
    (r) => r.day_of_week === dayOfWeek && !r.starts_at,
  );
  if (dayOnly) return dayOnly.override_price;

  // Tier 4: solo hora
  const timeOnly = activeRules.find(
    (r) =>
      r.day_of_week === null &&
      r.starts_at && r.ends_at &&
      time >= r.starts_at.slice(0, 5) &&
      time <= r.ends_at.slice(0, 5),
  );
  if (timeOnly) return timeOnly.override_price;

  // Tier 5: precio base
  return item.base_price;
}

// Uso:
const priceCentavos = previewPrice(selectedTable, "2026-03-15", "19:30");
const priceFormatted = `Bs ${(priceCentavos / 100).toFixed(2)}`;
```

### Validar Capacidad en Frontend

```ts
if (partySize > selectedTable.capacity) {
  setError(`Esta mesa es para máximo ${selectedTable.capacity} personas.`);
  return;
}

## PASO 4 — Pre-ordenar del Menú (Opcional)

El cliente puede agregar platos/bebidas a su reserva.

### Filtrar Items de Menú

```ts
const menuItems = allItems.filter(
  (i) => i.type === "menu_item" && i.status === "active",
);
```

### Estructura del Carrito

```ts
interface CartItem {
  item_id: string;
  name: string;          // Para mostrar en UI
  quantity: number;
  unit_price: number;    // Centavos
  notes?: string;        // "Sin cebolla", "Extra salsa"
}

// Estado del carrito
const [cart, setCart] = useState<CartItem[]>([]);

// Agregar item
function addToCart(item: Item, quantity: number, notes?: string) {
  setCart((prev) => {
    const existing = prev.find((c) => c.item_id === item.id);
    if (existing) {
      return prev.map((c) =>
        c.item_id === item.id ? { ...c, quantity: c.quantity + quantity } : c,
      );
    }
    return [...prev, { item_id: item.id, name: item.name, quantity, unit_price: item.base_price, notes }];
  });
}

// Calcular subtotal del carrito
function cartSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
}
```

### Convertir Carrito al Payload

```ts
function cartToPayload(cart: CartItem[]): PreOrderItem[] {
  return cart.map(({ item_id, quantity, notes }) => ({
    item_id,
    quantity,
    ...(notes ? { notes } : {}),
  }));
}
```

### UI Sugerida

- Grid de items de menú agrupados por categoría.
- Botón "+" para agregar, counter para cantidad.
- Input de notas por item (personalización).
- Sidebar o bottom sheet con resumen del carrito.
- Subtotal del carrito actualizado en tiempo real.

---

## PASO 5 — Aplicar Código Promocional (Opcional)

### No hay endpoint de validación previa

El código promo se valida **al momento de crear la reserva**. No hay un endpoint separado para validar promos.

### Mostrar Promos Disponibles (Opcional)

Si quieres mostrar promos visibles del restaurante:

```
GET /admin/businesses/{businessId}/promotions?page=1
```

> **Nota:** Este endpoint está bajo `auth:sanctum`. Si no tienes autenticación, puedes mostrar promos desde la data del business o un endpoint público que agregues.

### UI Sugerida

- Input de texto para código promo con botón "Aplicar".
- Si hay promos públicas visibles: banner o carrusel mostrándolas.
- El descuento real se muestra DESPUÉS de enviar la reserva (response).
- Mostrar tipos de descuento:
  - `percentage`: "15% de descuento"
  - `fixed_amount`: "Bs 20.00 de descuento" (valor en centavos / 100)

---

## PASO 6 — Enviar Reserva

### Endpoint

```
POST /businesses/{businessId}/reservations
Content-Type: application/json
```

### Payload Completo

```json
{
  "customer_name": "Juan Pérez",
  "customer_phone": "+59170000000",
  "customer_email": "juan@email.com",
  "item_id": "01HABC123456789",
  "scheduled_date": "2026-03-15",
  "start_time": "19:30",
  "party_size": 4,
  "duration_minutes": 120,
  "notes": "Mesa cerca de la ventana por favor",
  "promo_code": "MARZO15",
  "items": [
    {
      "item_id": "01HMENU111111111",
      "quantity": 2,
      "notes": "Sin cebolla"
    },
    {
      "item_id": "01HMENU222222222",
      "quantity": 1
    }
  ]
}
```

### Validación Backend (lo que puede fallar)

| Campo              | Regla                                 | Error                                              |
|--------------------|---------------------------------------|----------------------------------------------------|
| `customer_name`    | required, string, max:255             | "El nombre es requerido."                          |
| `customer_phone`   | required, string, max:20              | "El teléfono es requerido."                        |
| `customer_email`   | nullable, email, max:255              | "El email no es válido."                           |
| `item_id`          | required, ULID, exists:items          | "Debes seleccionar una mesa."                      |
| `scheduled_date`   | required, date, >= today              | "No se pueden hacer reservas en el pasado."        |
| `start_time`       | required, format H:i                  | "La hora debe tener formato HH:mm."               |
| `party_size`       | required, int, >= 1                   | "El número de personas debe ser al menos 1."       |
| `duration_minutes` | nullable, int, 15–480                 | "La duración debe ser entre 15 y 480 minutos."     |
| `notes`            | nullable, string, max:500             | "Las notas no pueden superar 500 caracteres."      |
| `promo_code`       | nullable, string, max:50              | (errores de promo, ver tabla abajo)                |
| `items.*.item_id`  | required_with:items, ULID, exists     | "El ítem del menú no existe."                      |
| `items.*.quantity` | required_with:items, int, >= 1        | "La cantidad debe ser al menos 1."                 |

### Errores de Negocio (Excepciones)

| Excepción                                   | HTTP | Mensaje                                               |
|---------------------------------------------|------|-------------------------------------------------------|
| `BusinessNotAcceptingReservationsException`  | 422  | "El negocio no está aceptando reservas actualmente."  |
| `ItemNotAvailableException`                  | 422  | "El ítem no está disponible."                         |
| `ItemNotReservableException`                 | 422  | "Este ítem no es de tipo reservable."                 |
| `CapacityExceededException`                  | 422  | "El espacio tiene capacidad para X personas."         |
| `SlotNotAvailableException`                  | 409  | "El horario seleccionado ya está ocupado."            |
| `PromotionNotFoundException`                 | 404  | "Código promocional no encontrado."                   |
| `PromotionExhaustedException`                | 422  | "La promoción ha alcanzado su límite de usos."        |
| `PromotionUserLimitException`                | 422  | "Ya usaste esta promoción el máximo permitido."       |
| `PromotionNotApplicableException`            | 422  | "La promoción no aplica a los ítems seleccionados."   |

### Llamada desde Next.js

```ts
async function handleSubmit() {
  setLoading(true);
  setError(null);

  try {
    const payload: CreateReservationPayload = {
      customer_name: formData.name,
      customer_phone: formData.phone,
      customer_email: formData.email || undefined,
      item_id: selectedTable.id,
      scheduled_date: formData.date,       // "2026-03-15"
      start_time: formData.time,           // "19:30"
      party_size: formData.partySize,
      duration_minutes: formData.duration || undefined,
      notes: formData.notes || undefined,
      promo_code: formData.promoCode || undefined,
      items: cart.length > 0 ? cartToPayload(cart) : undefined,
    };

    const { data: reservation } = await api.createReservation(businessId, payload);

    // Éxito → navegar a confirmación
    router.push(`/confirmacion/${reservation.id}`);
  } catch (err) {
    const apiErr = err as ApiError;

    if (apiErr.errors) {
      // Errores de validación → mostrar por campo
      setFieldErrors(apiErr.errors);
    } else {
      // Error de negocio → mostrar mensaje general
      setError(apiErr.message);
    }
  } finally {
    setLoading(false);
  }
}
```

---

## PASO 7 — Pantalla de Confirmación

### Response de la Reserva Creada

```json
{
  "data": {
    "id": "01HRES789...",
    "confirmation_code": "RES-A1B2C3",
    "status": "pending",
    "status_label": "Pendiente",
    "source": "web",
    "scheduled_date": "2026-03-15",
    "start_time": "19:30",
    "duration_minutes": 120,
    "party_size": 4,
    "notes": "Mesa cerca de la ventana por favor",
    "total_amount": 22000,
    "total_formatted": "Bs 220.00",
    "discount_amount": 3000,
    "discount_formatted": "Bs 30.00",
    "price_snapshot": {
      "item_id": "01HABC...",
      "item_name": "Mesa VIP Terraza",
      "base_price": 10000,
      "effective_price": 15000,
      "currency": "BOB",
      "captured_at": "2026-03-05T14:30:00-04:00"
    },
    "promo_snapshot": {
      "promo_id": "01HPROMO...",
      "promo_code": "MARZO15",
      "discount_type": "percentage",
      "discount_value": 15,
      "captured_at": "2026-03-05T14:30:00-04:00"
    },
    "confirmed_at": null,
    "cancelled_at": null,
    "completed_at": null,
    "item": {
      "id": "01HABC...",
      "name": "Mesa VIP Terraza",
      "type": "reservable",
      "capacity": 6,
      "image_url": "https://..."
    },
    "reservation_items": [
      {
        "id": "01HRI111...",
        "item_id": "01HMENU111...",
        "quantity": 2,
        "unit_price": 3500,
        "subtotal": 7000,
        "subtotal_formatted": "Bs 70.00",
        "notes": "Sin cebolla"
      },
      {
        "id": "01HRI222...",
        "item_id": "01HMENU222...",
        "quantity": 1,
        "unit_price": 5000,
        "subtotal": 5000,
        "subtotal_formatted": "Bs 50.00",
        "notes": null
      }
    ],
    "created_at": "2026-03-05T14:30:00-04:00",
    "updated_at": "2026-03-05T14:30:00-04:00"
  }
}
```

### Desglose de Precio para Mostrar

```ts
function ReservationSummary({ reservation }: { reservation: Reservation }) {
  const tablePrice = reservation.price_snapshot.effective_price;
  const menuTotal = reservation.reservation_items.reduce((s, i) => s + i.subtotal, 0);
  const subtotal = tablePrice + menuTotal;
  const discount = reservation.discount_amount;
  const total = reservation.total_amount;

  return (
    <div>
      <h2>¡Reserva Confirmada!</h2>
      <p>Código: <strong>{reservation.confirmation_code}</strong></p>
      <p>Estado: {reservation.status_label}</p>

      <h3>Detalles</h3>
      <p>Mesa: {reservation.item?.name}</p>
      <p>Fecha: {reservation.scheduled_date}</p>
      <p>Hora: {reservation.start_time}</p>
      <p>Personas: {reservation.party_size}</p>
      <p>Duración: {reservation.duration_minutes} min</p>

      <h3>Resumen de Precio</h3>
      <p>Mesa: {formatMoney(tablePrice)}</p>
      {reservation.reservation_items.map((ri) => (
        <p key={ri.id}>
          {ri.quantity}x Item — {ri.subtotal_formatted}
        </p>
      ))}
      {discount > 0 && (
        <p>Descuento ({reservation.promo_snapshot?.promo_code}): -{formatMoney(discount)}</p>
      )}
      <p><strong>Total: {reservation.total_formatted}</strong></p>
    </div>
  );
}

function formatMoney(centavos: number): string {
  return `Bs ${(centavos / 100).toFixed(2)}`;
}
```

### UI Sugerida

- Icono de check verde grande.
- Código de confirmación destacado (que puedan copiar).
- Resumen completo: mesa, fecha, hora, personas, pre-pedido.
- Desglose de montos con descuento resaltado en verde.
- Botón "Compartir por WhatsApp" con texto pre-formateado.
- Instrucciones: "Presenta este código al llegar al restaurante."

---

## Funciones Complementarias

### Ver Eventos del Restaurante

```
GET /admin/businesses/{businessId}/events?page=1
```

```ts
// Solo mostrar activos y vigentes
const upcomingEvents = events.filter(
  (e) => e.is_active && new Date(e.ends_at!) >= new Date(),
);
```

**UI:** Carrusel/banner de eventos con imagen (`banner_url`), nombre, fecha, descripción.

---

### Ver Reviews Públicas

```
GET /reviews?business_id={businessId}&page=1
```

**Nota:** Solo retorna reviews con `status = "published"`.

```json
{
  "data": [
    {
      "rating": 5,
      "comment": "Excelente atención y comida...",
      "photos": ["https://..."],
      "owner_reply": "¡Gracias por visitarnos!",
      "user": { "name": "María G." },
      "created_at": "2026-02-20T..."
    }
  ]
}
```

**UI:** Lista con estrellas, comentario, fotos, reply del dueño. Average rating en la cabecera.

---

### OTP (Autenticación Opcional)

Si en el futuro quieres que el usuario se autentique para ver sus reservas:

**Enviar OTP:**
```
POST /otp/send
{ "phone": "+59170000000" }
```

**Verificar OTP:**
```
POST /otp/verify
{ "phone": "+59170000000", "code": "123456" }
→ { "token": "1|abc123...", "user": { ... } }
```

Guardar token → usar como `Authorization: Bearer {token}` para endpoints protegidos.

> **Para el flujo de reserva NO necesitas OTP.** El `GuestReservationController` no requiere auth.

---

## Manejo de Errores

### Estructura de Error de Laravel

```json
// Error de validación (422)
{
  "message": "The customer name field is required. (and 2 more errors)",
  "errors": {
    "customer_name": ["The customer name field is required."],
    "scheduled_date": ["No se pueden hacer reservas en el pasado."],
    "party_size": ["El número de personas debe ser al menos 1."]
  }
}

// Error de negocio (422/409/404)
{
  "message": "El horario seleccionado ya está ocupado."
}
```

### Hook de Manejo de Errores

```ts
interface FormErrors {
  general: string | null;
  fields: Record<string, string[]>;
}

function useFormErrors() {
  const [errors, setErrors] = useState<FormErrors>({ general: null, fields: {} });

  function handleApiError(err: unknown) {
    const apiErr = err as ApiError;
    if (apiErr.errors) {
      setErrors({ general: null, fields: apiErr.errors });
    } else {
      setErrors({ general: apiErr.message, fields: {} });
    }
  }

  function clearErrors() {
    setErrors({ general: null, fields: {} });
  }

  function fieldError(field: string): string | undefined {
    return errors.fields[field]?.[0];
  }

  return { errors, handleApiError, clearErrors, fieldError };
}
```

### Errores Clave que el UI Debe Manejar

| Escenario                         | Cómo Detectar                        | Acción UI                                      |
|-----------------------------------|--------------------------------------|-------------------------------------------------|
| Slot ya ocupado                   | status 409 o message "ya está ocupado" | Mostrar "Horario no disponible, intenta otro." |
| Capacidad excedida                | message "capacidad para X"           | Sugerir mesa más grande o reducir personas.     |
| Promo no encontrada               | status 404 + "no encontrado"         | "Código promo inválido."                        |
| Promo agotada                     | message "límite de usos"             | "Esta promoción ya no está disponible."         |
| Restaurante cerrado               | message "no está aceptando"          | "Este restaurante no acepta reservas ahora."    |
| Validación de campos              | `errors` object present              | Mostrar errores junto a cada campo.             |

---

## Contratos API

### Resumen Rápido de Endpoints del Cliente

| #  | Método | Ruta                                          | Auth | Descripción                   |
|----|--------|-----------------------------------------------|------|-------------------------------|
| 1  | GET    | `/businesses`                                 | No   | Listar restaurantes activos   |
| 2  | GET    | `/businesses/{id}`                            | No   | Detalle + categorías + items  |
| 3  | GET    | `/businesses/{id}/categories`                 | No   | Categorías con items          |
| 4  | GET    | `/businesses/{id}/items`                      | No   | Items paginados               |
| 5  | GET    | `/businesses/{id}/items/{itemId}`             | No   | Detalle de un item            |
| 6  | GET    | `/businesses/{id}/availability?date=...`      | No   | **Disponibilidad de mesas**   |
| 7  | POST   | `/businesses/{id}/reservations`               | No   | **Crear reserva (guest)**     |
| 8  | GET    | `/reviews?business_id={id}`                   | No   | Reviews públicas              |
| 9  | GET    | `/admin/businesses/{id}/events`               | Sí*  | Eventos del restaurante       |
| 10 | GET    | `/admin/businesses/{id}/promotions`           | Sí*  | Promociones válidas           |

> *Los endpoints de eventos y promociones están bajo `auth:sanctum`. Si quieres que el cliente los vea sin auth, necesitas agregar rutas públicas en el backend.

### Todos los Prefijos Usan:
```
Base: {NEXT_PUBLIC_API_URL} = http://tu-dominio.com/api/v1
```

---

## Checklist de Implementación Next.js

```
□ Configurar NEXT_PUBLIC_API_URL en .env.local
□ Crear lib/api.ts (fetch wrapper)
□ Crear lib/types.ts (tipos TypeScript)
□ Página Home: listar restaurantes (GET /businesses)
□ Página Restaurante: mostrar detalle + categorías + items
□ Separar items: mesas (reservable) vs menú (menu_item)
□ Consultar disponibilidad: GET /businesses/{id}/availability
□ Componente TableSelector: mesas verdes/rojas según disponibilidad
□ Componente DateTimePicker: fecha >= hoy, hora formato HH:mm
□ Componente PartySizeInput: validar contra capacity
□ Componente MenuPreOrder: carrito de items de menú
□ Componente PromoCodeInput: input + feedback
□ Componente ReservationSummary: desglose de precios
□ Submit: POST /businesses/{id}/reservations
□ Manejar todos los errores (validación + negocio)
□ Página Confirmación: código, resumen, precio
□ Sección Eventos: carrusel/banner
□ Sección Reviews: lista con ratings
□ Formatear precios: centavos → "Bs X.XX"
□ Timezone: todo en America/La_Paz
```

---

## Notas Importantes

1. **Precios en centavos**: La API devuelve y recibe precios como enteros en centavos. `10000` = `Bs 100.00`. Siempre dividir entre 100 para mostrar.

2. **No se necesita token para reservar**: El endpoint `POST /businesses/{id}/reservations` es público. El backend crea una "shadow account" con el teléfono.

3. **Timezone Bolivia**: Todas las fechas/horas usan `America/La_Paz` (UTC-4). No hay horario de verano.

4. **ULIDs como IDs**: Todos los IDs son ULIDs de 26 caracteres (ej: `01HXYZ...`), no integers.

5. **El precio final lo calcula el backend**: El `previewPrice()` del frontend es solo para UX. El precio real viene en la response.

6. **Promo se valida al crear**: No hay endpoint de "verificar promo" — se valida en el POST y el error viene en la response.

7. **Overlap detection**: Si dos personas intentan la misma mesa/hora, el backend usa pessimistic locking. El segundo recibe error 409.

8. **Phone format**: Acepta hasta 20 chars. Para Bolivia generalmente es `+591XXXXXXXX` (8 dígitos después del código).
