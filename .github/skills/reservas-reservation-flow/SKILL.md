---
name: reservas-reservation-flow
description: Implement the complete reservation lifecycle for the Reservas system. Use this skill when creating, confirming, cancelling, or completing reservations. Covers anti double-booking with pessimistic locking, overlap detection, party_size vs capacity validation, confirmation_code generation, pre-order menu items, waitlist integration, status transitions, and the full ReservationService flow.
argument-hint: "reservation operation: create, cancel, confirm, complete, waitlist"
---

# Reservation Flow — Complete Lifecycle

## Create Reservation — Full Flow

```
[Client] POST /api/v1/reservations
    │
    ▼
[StoreReservationRequest] → validate input, authorize business is active
    │
    ▼
[ReservationService::create()]
    ├─ 1. Load item with capacity (lockForUpdate)
    ├─ 2. Validate party_size <= item.capacity
    ├─ 3. Validate item.status === active && item.type === reservable
    ├─ 4. Check slot availability (overlap detection)  ← CRITICAL
    ├─ 5. Apply pricing rules → calculate base_price
    ├─ 6. Apply promotion code (if provided) → discount_amount
    ├─ 7. Build price_snapshot JSON
    ├─ 8. CreateReservationAction::execute() → persists Reservation
    ├─ 9. Attach menu items to reservation_items (if any)
    └─ 10. Dispatch ReservationCreatedEvent
    │
    ▼
[ReservationResource] → return 201
```

## Overlap Detection — The Critical Query

An overlap exists when: `existing.start < new.end AND existing.end > new.start`

```php
public function hasOverlappingReservation(
    string $itemId,
    string $date,
    string $startTime,
    int    $durationMinutes,
    ?string $excludeId = null   // used when editing an existing reservation
): bool {
    $newStart = $startTime;
    $newEnd   = Carbon::parse($startTime)
                    ->addMinutes($durationMinutes)
                    ->format('H:i:s');

    return DB::transaction(function () use ($itemId, $date, $newStart, $newEnd, $excludeId) {
        return Reservation::query()
            ->where('item_id', $itemId)
            ->where('scheduled_date', $date)
            ->whereIn('status', [
                ReservationStatus::Pending->value,
                ReservationStatus::Confirmed->value,
            ])
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->where(function (Builder $q) use ($newStart, $newEnd) {
                $q->whereRaw('start_time < ?', [$newEnd])
                  ->whereRaw(
                      "DATE_ADD(CONCAT(scheduled_date, ' ', start_time), INTERVAL duration_minutes MINUTE) > ?",
                      ["{$date} {$newStart}"]
                  );
            })
            ->lockForUpdate()   // Must be inside DB::transaction()
            ->exists();
    });
}
```

**Important**: `lockForUpdate()` prevents another concurrent request from reading the same rows between the check and the insert. Always wrap in `DB::transaction()`.

## Party Size vs Capacity Validation

```php
$item = Item::lockForUpdate()->findOrFail($data['item_id']);

if ($item->status !== ItemStatus::Active) {
    throw new ItemNotAvailableException();
}

if ($item->type !== ItemType::Reservable) {
    throw new ItemNotReservableException();
}

if ($data['party_size'] > $item->capacity) {
    throw new CapacityExceededException(
        "El espacio tiene capacidad para {$item->capacity} personas, solicitaste {$data['party_size']}."
    );
}
```

## Price Snapshot — Build at Creation Time

The snapshot captures the price in effect at the moment of reservation:

```php
private function buildPriceSnapshot(Item $item, string $date, string $time): array
{
    $effectivePrice = $this->pricingRuleService->resolve($item, $date, $time);

    return [
        'item_id'        => $item->id,
        'item_name'      => $item->name,
        'base_price'     => $item->base_price,
        'effective_price'=> $effectivePrice,
        'currency'       => 'BOB',
        'captured_at'    => now('America/La_Paz')->toIso8601String(),
    ];
}
```

## Pricing Rules Precedence (Most Specific Wins)

1. **Specific date** (e.g., 2025-02-16 Carnival) → highest priority
2. **Day of week + time range** (e.g., Friday 18:00–22:00)
3. **Day of week** (e.g., all Saturdays)
4. **Time range only** (e.g., happy hour)
5. **Base price** (fallback)

```php
public function resolve(Item $item, string $date, string $time): int
{
    $carbon = Carbon::parse("{$date} {$time}", 'America/La_Paz');

    return $item->pricingRules()
        ->active()
        ->get()
        ->sortByDesc('specificity_weight')   // computed attribute or stored column
        ->first(fn($rule) => $rule->matches($carbon))
        ?->price ?? $item->base_price;
}
```

## Status Transitions — Enforce in Service

```php
public function transition(Reservation $reservation, ReservationStatus $newStatus): void
{
    if (! $reservation->status->canTransitionTo($newStatus)) {
        throw new InvalidStatusTransitionException(
            "Cannot move from {$reservation->status->label()} to {$newStatus->label()}"
        );
    }

    $reservation->update([
        'status'                   => $newStatus,
        "{$newStatus->value}_at"   => now(), // confirmed_at, cancelled_at, completed_at
    ]);
}
```

Valid transitions (see `laravel-enum` skill for full state machine):
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `completed`, `no_show`, `cancelled`

## Pre-Order Menu Items (reservation_items)

```php
// After creating the reservation
foreach ($data['items'] ?? [] as $orderItem) {
    $menuItem = Item::where('type', ItemType::MenuItem)->findOrFail($orderItem['item_id']);

    $reservation->menuItems()->attach($menuItem->id, [
        'id'         => Str::ulid(),
        'quantity'   => $orderItem['quantity'],
        'unit_price' => $menuItem->base_price,         // snapshot
        'subtotal'   => $menuItem->base_price * $orderItem['quantity'],
    ]);
}
```

## Waitlist Flow

**Join waitlist** (when slot is fully booked):

```php
public function joinWaitlist(string $itemId, string $date, string $startTime, User $user): Waitlist
{
    $position = Waitlist::where('item_id', $itemId)
                        ->where('scheduled_date', $date)
                        ->where('start_time', $startTime)
                        ->max('position') + 1;

    return Waitlist::create([
        'item_id'        => $itemId,
        'user_id'        => $user->id,
        'scheduled_date' => $date,
        'start_time'     => $startTime,
        'position'       => $position,
    ]);
}
```

**On cancellation** → `ReservationObserver` dispatches `WaitlistNotificationJob`:

```php
// WaitlistNotificationJob::handle()
$next = Waitlist::where('item_id', $reservation->item_id)
                ->where('scheduled_date', $reservation->scheduled_date)
                ->where('start_time', $reservation->start_time)
                ->orderBy('position')
                ->lockForUpdate()
                ->first();

if ($next) {
    $next->user->notify(new WaitlistSlotAvailableNotification($reservation));
    // Do NOT auto-create reservation — user must confirm
}
```

**Leave waitlist** recalculates positions:

```php
$entry->delete();
$this->waitlistService->recalculatePositions($itemId, $date, $startTime);
```

## Checklist

- [ ] Overlap check uses `lockForUpdate()` inside `DB::transaction()`
- [ ] `party_size <= item.capacity` validated in service (not only FormRequest)
- [ ] `item.type === reservable` validated before creating reservation
- [ ] `item.status === active` validated
- [ ] `price_snapshot` JSON built and stored at creation, never updated
- [ ] Status transitions validated via `canTransitionTo()`
- [ ] `confirmed_at` / `cancelled_at` / `completed_at` timestamps set on transition
- [ ] `confirmation_code` generated by Observer (not in service code)
- [ ] Menu items stored in `reservation_items` with price snapshot
- [ ] Waitlist notified via Job (async) on cancellation
