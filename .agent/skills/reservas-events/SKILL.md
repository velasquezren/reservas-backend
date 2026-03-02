---
name: reservas-events
description: Understand how Events are structured and queried in the Reservas software without a dedicated 'events' table. Use this skill when displaying events, banners, or special announcements in the frontend apps (Next.js). Explains how Events are essentially 'Promotions' with zero discount, and how to query/filter them via the API.
argument-hint: "events, banners, announcements, querying events vs promotions"
---

# Events Architecture — Reservas System

If you are looking for an `events` table or an `Event` Eloquent model in the backend, **they do not exist.** 

In the Reservas ecosystem, **Events and Promotions share the exact same database table (`promotions`) and Eloquent Model (`App\Models\Promotion`)**.

## How are Events differentiated from Promotions?

The distinction lies entirely in the **`discount_type`** column:

*   **Promociones (Discounts):** Have a valid `discount_type` (either `percentage` or `fixed_amount` from the `DiscountType` Enum). Customers can apply their `code` to a reservation to get money taken off.
*   **Eventos (Announcements/Banners):** Have `discount_type === null` (and consequently `discount_value === null`). They do NOT apply discounts, they do NOT require the customer to input a code to save money. They simply announce something happening at the business (e.g., "Live DJ this Friday", "Valentine's Dinner Menu").

## Fetching Events vs. Promotions in Next.js

When you fetch the data from the Laravel API, you will receive a single list of objects from the `/api/v1/promotions` (or similar) endpoint.

To show them separated in your Next.js application, you must filter them by the `discount_type` property:

```tsx
// In Next.js (TypeScript)

type PromotionOrEvent = {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  discount_type: 'percentage' | 'fixed_amount' | null; // Important!
  discount_value: number | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  banner_url: string | null;
};

// ... inside your React Component ...

// 1. Filter Promos (Real Discounts)
const promos = data.filter((item: PromotionOrEvent) => item.discount_type !== null);

// 2. Filter Events (Banners/Announcements)
const events = data.filter((item: PromotionOrEvent) => item.discount_type === null);
```

> **Note:** In the React/Inertia Admin Panel, the frontend explicitly converts a dropdown selection of `"none"` into `null` before sending the POST/PUT request to the Laravel backend. In your Next.js forms, ensure you also send `discount_type: null` when creating an event.

## Displaying Events in Next.js

Since events don't have a discount, they are primarily visual. When rendering an event card in Next.js, prioritize the following properties:

1.  **`banner_url`**: The most important element for an event. Display this image prominently.
2.  **`name`**: The title of the event (e.g., "Noche de Rock").
3.  **`description`**: The details of the event.
4.  **`starts_at` / `ends_at`**: The period the event is active. Unlike a promotion, an event's active period is usually shown directly to the user so they know when it occurs.

Do **NOT** try to show a "Discount" or a "Promo Code input box" for these items in the reservation flow.

## Interacting with the Reservation API

When a customer makes a reservation in Next.js:
*   They can optionally send `applied_promo_code` if they are using a true **Promotion**.
*   They **DO NOT** send an event ID or event code. Events are purely informational for the user's screen and have no bearing on the financial calculation `PromotionService::findAndValidate()` performs. If someone tries to send an Event's code (if it happens to have one) to get a discount, the backend `PromotionService` should either fail the `DiscountType` calculation or yield a 0 discount.

## Summary Checklist for Next.js Developers

- [ ] Fetch from the `promotions` API endpoint.
- [ ] Filter items using `item.discount_type === null` to get your "Events" array.
- [ ] Render Events heavily focusing on `banner_url`, `name`, and dates.
- [ ] Hide the "Discount" UI for events.
- [ ] Do not pass event codes to the reservation checkout process.
