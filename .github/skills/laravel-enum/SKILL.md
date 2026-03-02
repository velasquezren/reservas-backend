---
name: laravel-enum
description: Create PHP 8.1+ backed enums for this Laravel project. Use this skill when defining or referencing any Enum. All enums are string-backed, placed in app/Enums/, and used as $casts in Eloquent models. Covers ReservationStatus, ItemType, DiscountType, ReviewStatus, BusinessStatus, NotificationChannel, ReservationSource, and the state-machine transition rules between statuses.
argument-hint: "enum name or context"
---

# PHP 8.1+ Backed Enums — Reservas Project

All enums live in `app/Enums/`. Every enum is `string`-backed. Never use class constants or plain strings for status fields.

## All Project Enums

```php
// app/Enums/ReservationStatus.php
namespace App\Enums;

enum ReservationStatus: string
{
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case NoShow    = 'no_show';
    case Cancelled = 'cancelled';

    /** Returns statuses considered "active" (block a timeslot) */
    public function isActive(): bool
    {
        return in_array($this, [self::Pending, self::Confirmed]);
    }

    /** Valid transitions from this status */
    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Pending   => in_array($next, [self::Confirmed, self::Cancelled]),
            self::Confirmed => in_array($next, [self::Completed, self::NoShow, self::Cancelled]),
            default         => false,  // terminal states
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending   => 'Pendiente',
            self::Confirmed => 'Confirmada',
            self::Completed => 'Completada',
            self::NoShow    => 'No se presentó',
            self::Cancelled => 'Cancelada',
        };
    }
}
```

```php
// app/Enums/BusinessStatus.php
namespace App\Enums;

enum BusinessStatus: string
{
    case Active    = 'active';
    case Inactive  = 'inactive';
    case Suspended = 'suspended';

    public function canAcceptReservations(): bool
    {
        return $this === self::Active;
    }
}
```

```php
// app/Enums/ItemType.php
namespace App\Enums;

enum ItemType: string
{
    case Reservable = 'reservable';   // mesa, cancha, espacio
    case MenuItem   = 'menu_item';   // plato, bebida, combo

    public function isReservable(): bool
    {
        return $this === self::Reservable;
    }
}
```

```php
// app/Enums/DiscountType.php
namespace App\Enums;

enum DiscountType: string
{
    case Percentage   = 'percentage';
    case FixedAmount  = 'fixed_amount';   // stored in centavos

    /** Calculate discount amount on a base value (in centavos) */
    public function calculate(int $baseAmount, int $value): int
    {
        return match ($this) {
            self::Percentage  => (int) round($baseAmount * $value / 100),
            self::FixedAmount => min($value, $baseAmount), // never exceed base
        };
    }
}
```

```php
// app/Enums/ReviewStatus.php
namespace App\Enums;

enum ReviewStatus: string
{
    case PendingModeration = 'pending_moderation';
    case Published         = 'published';
    case Rejected          = 'rejected';
}
```

```php
// app/Enums/NotificationChannel.php
namespace App\Enums;

enum NotificationChannel: string
{
    case Database  = 'database';
    case WhatsApp  = 'whatsapp';
    case Mail      = 'mail';
}
```

```php
// app/Enums/ReservationSource.php
namespace App\Enums;

enum ReservationSource: string
{
    case App     = 'app';
    case Web     = 'web';
    case WalkIn  = 'walk_in';
    case Phone   = 'phone';
}
```

```php
// app/Enums/ItemStatus.php
namespace App\Enums;

enum ItemStatus: string
{
    case Active   = 'active';
    case Inactive = 'inactive';
    case Draft    = 'draft';
}
```

## Usage in Eloquent $casts

```php
protected function casts(): array
{
    return [
        'status'  => ReservationStatus::class,
        'source'  => ReservationSource::class,
    ];
}
```

## Usage in Validation Rules

```php
use Illuminate\Validation\Rule;

'status' => ['required', Rule::enum(ReservationStatus::class)],
'source' => ['nullable', Rule::enum(ReservationSource::class)],
```

## State Machine — ReservationStatus Transitions

```
pending ──► confirmed ──► completed
       │            │
       └────────────┴──► cancelled
pending ──► cancelled
confirmed ──► no_show
```

Always validate transitions before updating:

```php
if (! $reservation->status->canTransitionTo($newStatus)) {
    throw new InvalidStatusTransitionException(
        "Cannot transition from {$reservation->status->value} to {$newStatus->value}"
    );
}
```

## Helpers for Checking Enum Values in Queries

```php
// Use ->value when passing enums to query builder
Reservation::where('status', ReservationStatus::Pending->value)->get();

// Or use whereIn with array_map
Reservation::whereIn('status', array_map(
    fn($s) => $s->value,
    [ReservationStatus::Pending, ReservationStatus::Confirmed]
))->get();
```

## Checklist

- [ ] All enums in `app/Enums/` namespace
- [ ] All enums are `string`-backed
- [ ] `canTransitionTo()` method on `ReservationStatus`
- [ ] `calculate()` method on `DiscountType`
- [ ] `canAcceptReservations()` on `BusinessStatus`
- [ ] Enum casts declared in every relevant Model
- [ ] `Rule::enum()` used in FormRequest validation
- [ ] Never use raw strings like `'pending'` — always use `ReservationStatus::Pending->value`
