---
name: reservas-promotions
description: Implement the promotions and discount system for the Reservas platform. Use this skill when creating promotions, applying promo codes to reservations, validating discount rules, or querying promotion analytics. Covers percentage vs fixed_amount discounts, usage limits (global and per-user), applicability to specific items/categories via polymorphic relation, discount amount calculation in centavos, and the promo_snapshot stored on the reservation.
argument-hint: "promotion feature: create, apply, validate, analytics"
---

# Promotions & Discounts — Reservas System

## Promotion Data Model

```
promotions
├── id (ulid)
├── business_id → businesses (restrictOnDelete)
├── name
├── description (nullable)
├── code (nullable, unique per business) — promo code users enter
├── type: 'percentage' | 'fixed_amount'
├── value (unsignedInteger) — percentage (0-100) OR centavos
├── starts_at (datetime)
├── ends_at (datetime)
├── max_uses (unsignedInteger, nullable) — global limit
├── max_uses_per_user (unsignedInteger, nullable)
├── used_count (unsignedInteger, default 0) — denormalized counter
├── is_active (boolean, default true)
├── deleted_at (softDeletes)
└── timestamps

promotion_applicables (pivot — polymorphic)
├── id (ulid)
├── promotion_id → promotions (cascadeOnDelete)
├── applicable_type ('App\\Models\\Item' | 'App\\Models\\Category')
├── applicable_id (ulid)
└── timestamps
```

If `promotion_applicables` has no rows for a promotion → promotion applies to the **entire reservation** (all items).

## PromotionService — Validate on Apply

```php
final class PromotionService
{
    public function findAndValidate(
        string      $promoCode,
        string      $businessId,
        User        $user,
        Reservation $reservation    // partially built, not yet persisted
    ): Promotion {
        // 1. Find active, non-expired promotion for this business
        $promo = Promotion::query()
            ->where('business_id', $businessId)
            ->where('code', $promoCode)
            ->where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where('ends_at',   '>=', now())
            ->firstOr(fn() => throw new PromotionNotFoundException());

        // 2. Global usage limit
        if ($promo->max_uses !== null && $promo->used_count >= $promo->max_uses) {
            throw new PromotionExhaustedException("Código agotado.");
        }

        // 3. Per-user usage limit
        if ($promo->max_uses_per_user !== null) {
            $userUsage = DB::table('reservations')
                ->where('user_id', $user->id)
                ->where('applied_promo_id', $promo->id)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($userUsage >= $promo->max_uses_per_user) {
                throw new PromotionUserLimitException("Límite de usos por usuario alcanzado.");
            }
        }

        // 4. Applicability (does this promo apply to the items in the reservation?)
        $this->assertApplicable($promo, $reservation);

        return $promo;
    }

    private function assertApplicable(Promotion $promo, Reservation $reservation): void
    {
        // No restriction rows → applies to everything
        $applicableCount = $promo->applicables()->count();
        if ($applicableCount === 0) {
            return;
        }

        // Check if any reservation item is covered
        $itemIds     = collect($reservation->items)->pluck('item_id');
        $categoryIds = Item::whereIn('id', $itemIds)->pluck('category_id');

        $covered = $promo->applicables()
            ->where(function ($q) use ($itemIds, $categoryIds) {
                $q->where(function ($q) use ($itemIds) {
                    $q->where('applicable_type', 'App\\Models\\Item')
                      ->whereIn('applicable_id', $itemIds);
                })->orWhere(function ($q) use ($categoryIds) {
                    $q->where('applicable_type', 'App\\Models\\Category')
                      ->whereIn('applicable_id', $categoryIds);
                });
            })
            ->exists();

        if (! $covered) {
            throw new PromotionNotApplicableException("El código no aplica a los ítems seleccionados.");
        }
    }
}
```

## Discount Calculation (DiscountType Enum)

Uses the `calculate()` method from `DiscountType` enum (see `laravel-enum` skill):

```php
public function calculateDiscount(Promotion $promo, int $baseAmountCentavos): int
{
    return $promo->type->calculate($baseAmountCentavos, $promo->value);
}

// DiscountType::Percentage->calculate(10000, 20) = 2000  (20% of Bs 100.00)
// DiscountType::FixedAmount->calculate(10000, 1500) = 1500  (Bs 15.00 off, never exceeds base)
```

## ApplyPromotionAction

```php
final class ApplyPromotionAction
{
    public function execute(Promotion $promo, int $baseAmount): array
    {
        $discount = $promo->type->calculate($baseAmount, $promo->value);

        return [
            'discount_amount' => $discount,
            'total_amount'    => $baseAmount - $discount,
            'promo_snapshot'  => [
                'id'            => $promo->id,
                'code'          => $promo->code,
                'name'          => $promo->name,
                'type'          => $promo->type->value,
                'value'         => $promo->value,
                'discount_applied' => $discount,
                'applied_at'    => now('America/La_Paz')->toIso8601String(),
            ],
        ];
    }
}
```

## Incrementing used_count (Atomic)

After the reservation is **successfully committed**, increment atomically:

```php
// Inside ReservationService::create() after DB::transaction() commits
if ($reservation->applied_promo_id) {
    Promotion::where('id', $reservation->applied_promo_id)
             ->increment('used_count');
}
```

Use `increment()` (single SQL UPDATE), not `$promo->used_count++; $promo->save()`.

## Promotion Stored on Reservation

Additional columns on `reservations`:

```
applied_promo_id  (ulid, nullable, FK to promotions — nullOnDelete)
discount_amount   (unsignedBigInteger, default 0)  — centavos
promo_snapshot    (json, nullable)                 — immutable snapshot
```

## Promotion Immutability Rules

- Once a promotion has `used_count > 0`, only `ends_at` and `is_active` may be modified
- Never update `type`, `value`, or `code` of a used promotion — create a new one
- `promo_snapshot` on the reservation is never updated after creation

## Validation Errors Reference

| Exception | HTTP | Message |
|---|---|---|
| `PromotionNotFoundException` | 422 | Código de descuento no válido. |
| `PromotionExhaustedException` | 422 | Código agotado. |
| `PromotionUserLimitException` | 422 | Límite de usos por usuario alcanzado. |
| `PromotionNotApplicableException` | 422 | El código no aplica a los ítems seleccionados. |
| `PromotionExpiredException` | 422 | El código ha expirado. |

## Checklist

- [ ] `code` is unique per business (unique index on `[business_id, code]`)
- [ ] `value` is stored as integer: percentage as 0-100 OR centavos for fixed
- [ ] `used_count` incremented with `increment()` after successful reservation commit
- [ ] `max_uses` and `max_uses_per_user` defaulted to `null` (no limit)
- [ ] Applicability: no rows in `promotion_applicables` = applies to everything
- [ ] `promo_snapshot` JSON built in `ApplyPromotionAction` and never modified
- [ ] `discount_amount` stored as centavos integer
- [ ] `DiscountType::calculate()` clips fixed discounts to never exceed `baseAmount`
- [ ] Promotion validation happens INSIDE `DB::transaction()` in `ReservationService`
- [ ] Expired promotions: `where('ends_at', '>=', now())` — not just `is_active`
