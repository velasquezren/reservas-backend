---
name: laravel-eloquent-model
description: Create Eloquent models for this project following strict conventions. Use this skill when generating or reviewing Models. Covers $fillable, $casts with PHP 8.1 backed Enums, ULID keys, relationships with proper return types, local scopes (scopeActive, scopeForBusiness, scopeUpcoming, scopePast), Observers for side-effects, and desnormalized computed attributes updated via Observer or Job.
argument-hint: "model name"
---

# Eloquent Model Standards — Reservas Project

## Key Configuration

Every model must declare:

```php
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Reservation extends Model
{
    use HasFactory, SoftDeletes, HasUlids; // HasUlids if this table uses ulid PKs

    protected $fillable = [/* explicit list */];
}
```

Never use `$guarded = []`. Every assignable column must be listed explicitly in `$fillable`.

## $casts — Enums, Dates, JSON

```php
protected function casts(): array
{
    return [
        // PHP 8.1 backed enums
        'status'  => ReservationStatus::class,
        'source'  => ReservationSource::class,
        'type'    => ItemType::class,

        // Dates
        'scheduled_date' => 'date',
        'confirmed_at'   => 'datetime',
        'cancelled_at'   => 'datetime',

        // JSON snapshots (cast to array for access, never mutate)
        'price_snapshot' => 'array',
        'promo_snapshot'  => 'array',
    ];
}
```

## Money Accessors

Money is stored as integers (centavos). Provide read-only accessors for display, but always persist as integer:

```php
public function getBasePriceFormattedAttribute(): string
{
    return 'Bs ' . number_format($this->base_price / 100, 2);
}
```

Never store floats. Arithmetic on money must stay in integers.

## Relationships — Return Types Always

```php
// BelongsTo
public function business(): BelongsTo
{
    return $this->belongsTo(Business::class);
}

// HasMany
public function reservations(): HasMany
{
    return $this->hasMany(Reservation::class);
}

// BelongsToMany with pivot
public function items(): BelongsToMany
{
    return $this->belongsToMany(Item::class, 'reservation_items')
                ->withPivot(['quantity', 'unit_price', 'subtotal'])
                ->withTimestamps();
}

// MorphTo / MorphMany for polymorphic
public function applicable(): MorphTo
{
    return $this->morphTo();
}
```

## Required Local Scopes per Model

These scopes must exist on models that have the corresponding column:

```php
// Models with `status` column
public function scopeActive(Builder $query): void
{
    $query->where('status', 'active');
}

// Models belonging to a business
public function scopeForBusiness(Builder $query, string $businessId): void
{
    $query->where('business_id', $businessId);
}

// Reservation-specific scopes
public function scopeUpcoming(Builder $query): void
{
    $query->where('scheduled_date', '>=', today())
          ->whereIn('status', [ReservationStatus::Pending, ReservationStatus::Confirmed]);
}

public function scopePast(Builder $query): void
{
    $query->where('scheduled_date', '<', today())
          ->orWhereIn('status', [ReservationStatus::Completed, ReservationStatus::NoShow]);
}
```

## Observers — When to Use

Register Observers for **side-effects** that should always happen when a model event fires, regardless of who triggers the mutation:

| Model | Observer | What It Does |
|---|---|---|
| `Reservation` | `ReservationObserver` | `creating`: generate `confirmation_code` (ULIDv4 or random 8-char uppercase); `updated`: if status changed to `cancelled`, dispatch `WaitlistNotificationJob` |
| `Review` | `ReviewObserver` | `saved`/`deleted`: recalculate and update `businesses.average_rating` + `total_reviews` (use `withoutTimestamps`) |

```php
// app/Observers/ReservationObserver.php
public function creating(Reservation $reservation): void
{
    $reservation->confirmation_code = strtoupper(Str::random(8));
}

public function updated(Reservation $reservation): void
{
    if ($reservation->wasChanged('status') &&
        $reservation->status === ReservationStatus::Cancelled) {
        WaitlistNotificationJob::dispatch($reservation);
    }
}
```

Register observers in `AppServiceProvider::boot()`:
```php
Reservation::observe(ReservationObserver::class);
Review::observe(ReviewObserver::class);
```

## Computed / Desnormalized Attributes

`Business` must have `average_rating` (decimal 2 places) and `total_reviews` (integer) as real database columns, updated by `ReviewObserver`:

```php
// In ReviewObserver::saved() and ::deleted()
$business = $review->reservation->item->business;
$stats = $business->reviews()->published()->selectRaw('AVG(rating) as avg, COUNT(*) as total')->first();
$business->withoutTimestamps()->update([
    'average_rating' => round($stats->avg ?? 0, 2),
    'total_reviews'  => $stats->total ?? 0,
]);
```

## Checklist

- [ ] `HasUlids` trait on every model with `ulid` PK
- [ ] `SoftDeletes` only on: User, Business, Item, Category, Promotion
- [ ] All Enum columns cast to their Enum class
- [ ] All JSON snapshot columns cast to `'array'`
- [ ] `$fillable` is explicit — never `$guarded = []`
- [ ] Every relationship has a PHP return type declared
- [ ] `scopeForBusiness` exists on all tenant-scoped models
- [ ] Observers registered in AppServiceProvider
