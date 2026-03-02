---
name: laravel-service-action
description: Create Services and Actions for this Laravel project. Use this skill when implementing business logic. Services handle multi-step workflows with multiple dependencies (ReservationService, OtpAuthService, PromotionService, WaitlistService). Actions handle a single atomic operation (CreateReservationAction, ApplyPromotionAction, CompleteReservationAction). Covers pessimistic locking, transactional integrity, and dependency injection.
argument-hint: "service or action name and purpose"
---

# Services & Actions Architecture — Reservas Project

## When to Use a Service vs an Action

| | Service | Action |
|---|---|---|
| Complexity | Multi-step, multiple dependencies | Single atomic operation |
| Reusability | Called from multiple places | Called from one controller |
| Transaction | Orchestrates the transaction | Executes within a transaction |
| Example | `ReservationService::create(...)` | `CreateReservationAction::execute(...)` |

A Service may call one or more Actions internally. Actions never call other Actions.

## Service Structure

```php
// app/Services/ReservationService.php
namespace App\Services;

final class ReservationService
{
    public function __construct(
        private readonly CreateReservationAction $createAction,
        private readonly ApplyPromotionAction    $applyPromo,
        private readonly WaitlistService         $waitlist,
    ) {}

    public function create(array $data, User $user): Reservation
    {
        return DB::transaction(function () use ($data, $user) {
            // 1. Check availability with pessimistic lock
            // 2. Apply promotion if promo_code provided
            // 3. Delegate atomic creation to Action
            // 4. Return the created reservation
        });
    }
}
```

## Action Structure

```php
// app/Actions/CreateReservationAction.php
namespace App\Actions;

final class CreateReservationAction
{
    public function execute(array $validated, User $user): Reservation
    {
        return Reservation::create([
            'user_id'           => $user->id,
            'item_id'           => $validated['item_id'],
            'scheduled_date'    => $validated['scheduled_date'],
            'start_time'        => $validated['start_time'],
            'duration_minutes'  => $validated['duration_minutes'],
            'party_size'        => $validated['party_size'],
            'notes'             => $validated['notes'] ?? null,
            'source'            => $validated['source'] ?? ReservationSource::App,
            'status'            => ReservationStatus::Pending,
            'price_snapshot'    => $this->buildPriceSnapshot($validated),
        ]);
    }
}
```

## ReservationService — Availability Check with Pessimistic Locking

This is the most critical service in the system. Use `lockForUpdate()` to prevent race conditions:

```php
public function checkAvailability(string $itemId, string $date, string $startTime, int $durationMinutes): bool
{
    $endTime = Carbon::parse($startTime)->addMinutes($durationMinutes)->format('H:i:s');

    $conflicting = Reservation::query()
        ->where('item_id', $itemId)
        ->where('scheduled_date', $date)
        ->whereIn('status', [ReservationStatus::Pending, ReservationStatus::Confirmed])
        ->where(function (Builder $q) use ($startTime, $endTime) {
            // Overlap: existing.start < new.end AND existing.end > new.start
            $q->whereRaw('start_time < ?', [$endTime])
              ->whereRaw("ADDTIME(start_time, SEC_TO_TIME(duration_minutes * 60)) > ?", [$startTime]);
        })
        ->lockForUpdate()  // Pessimistic lock — MUST be inside a DB::transaction()
        ->exists();

    return ! $conflicting;
}
```

Always wrap `lockForUpdate()` calls inside `DB::transaction()`.

## OtpAuthService

```php
final class OtpAuthService
{
    private const OTP_TTL_MINUTES    = 10;
    private const RATE_LIMIT_MAX     = 3;
    private const RATE_LIMIT_MINUTES = 15;

    public function sendOtp(string $phone): void
    {
        // 1. Rate limit check (Cache key: "otp_attempts:{phone}")
        $key    = "otp_attempts:{$phone}";
        $hits   = Cache::get($key, 0);

        if ($hits >= self::RATE_LIMIT_MAX) {
            throw new TooManyOtpAttemptsException($phone);
        }

        // 2. Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // 3. Store hashed OTP in cache
        Cache::put("otp:{$phone}", bcrypt($otp), now()->addMinutes(self::OTP_TTL_MINUTES));

        // 4. Increment rate limit counter
        Cache::put($key, $hits + 1, now()->addMinutes(self::RATE_LIMIT_MINUTES));

        // 5. Dispatch OTP via WhatsApp/SMS notification
        OtpNotification::dispatch($phone, $otp);
    }

    public function verifyOtp(string $phone, string $code): PersonalAccessToken
    {
        $stored = Cache::get("otp:{$phone}");

        if (! $stored || ! Hash::check($code, $stored)) {
            throw new InvalidOtpException();
        }

        Cache::forget("otp:{$phone}");

        // Shadow account creation (silent, no events)
        $user = User::firstOrCreate(
            ['phone' => $phone],
            ['name' => 'Usuario ' . substr($phone, -4)]
        );

        return $user->createToken(request()->input('device_name', 'unknown'))->plainTextToken;
    }
}
```

## PromotionService — Validation Rules

```php
public function validate(string $promoCode, Reservation $reservation): Promotion
{
    $promo = Promotion::where('code', $promoCode)
        ->where('is_active', true)
        ->where('starts_at', '<=', now())
        ->where('ends_at', '>=', now())
        ->firstOrFail();

    // Global usage limit
    if ($promo->max_uses !== null && $promo->used_count >= $promo->max_uses) {
        throw new PromotionExhaustedException();
    }

    // Per-user usage limit
    if ($promo->max_uses_per_user !== null) {
        $userUsage = $reservation->user->reservations()
            ->where('applied_promo_id', $promo->id)
            ->count();

        if ($userUsage >= $promo->max_uses_per_user) {
            throw new PromotionUserLimitException();
        }
    }

    // Applicability check (specific items or categories)
    $this->assertApplicable($promo, $reservation);

    return $promo;
}
```

## WaitlistService — Position Recalculation

```php
public function notifyNext(Reservation $cancelledReservation): void
{
    $next = Waitlist::query()
        ->where('item_id', $cancelledReservation->item_id)
        ->where('scheduled_date', $cancelledReservation->scheduled_date)
        ->where('start_time', $cancelledReservation->start_time)
        ->orderBy('position')
        ->first();

    if ($next) {
        $next->user->notify(new WaitlistSlotAvailableNotification($cancelledReservation));
    }
}

public function recalculatePositions(string $itemId, string $date, string $startTime): void
{
    Waitlist::query()
        ->where('item_id', $itemId)
        ->where('scheduled_date', $date)
        ->where('start_time', $startTime)
        ->orderBy('created_at')
        ->get()
        ->each(function (Waitlist $entry, int $index) {
            $entry->update(['position' => $index + 1]);
        });
}
```

## Checklist

- [ ] All Services are `final` classes
- [ ] Services and Actions are constructor-injected (never `new`)
- [ ] `checkAvailability` uses `lockForUpdate()` inside `DB::transaction()`
- [ ] OTP rate limit uses Cache with TTL, never DB polling
- [ ] `OtpAuthService::verifyOtp` uses `firstOrCreate` for shadow accounts
- [ ] PromotionService validates: active, date range, global limit, per-user limit, applicability
- [ ] Actions build `price_snapshot` JSON at creation time
