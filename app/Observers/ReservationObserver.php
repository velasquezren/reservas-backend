<?php

namespace App\Observers;

use App\Enums\ReservationStatus;
use App\Jobs\WaitlistNotificationJob;
use App\Models\Reservation;
use App\Services\AnalyticsService;
use Illuminate\Support\Str;

class ReservationObserver
{
    /**
     * Generate a unique 8-char uppercase confirmation code before insert.
     * Retries on the (astronomically unlikely) collision scenario.
     */
    public function creating(Reservation $reservation): void
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (Reservation::where('confirmation_code', $code)->exists());

        $reservation->confirmation_code = $code;
    }

    /**
     * When a reservation transitions to `cancelled`, notify the first
     * user on the waitlist for that slot so they can book it.
     */
    public function updated(Reservation $reservation): void
    {
        if (! $reservation->wasChanged('status')) {
            return;
        }

        if ($reservation->status === ReservationStatus::Cancelled) {
            WaitlistNotificationJob::dispatch($reservation);
        }

        // Invalidate analytics cache whenever the status changes so that
        // dashboard metrics (completed count, revenue, peak hours) stay fresh.
        app(AnalyticsService::class)->forgetBusiness($reservation->business_id);
    }
}
