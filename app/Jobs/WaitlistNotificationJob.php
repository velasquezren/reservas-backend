<?php

namespace App\Jobs;

use App\Models\Reservation;
use App\Services\WaitlistService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched by ReservationObserver when a reservation is cancelled.
 * Delegates to WaitlistService::notifyNext() which wraps its own
 * lockForUpdate() to safely pick the first queue entry.
 */
class WaitlistNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly Reservation $reservation)
    {
    }

    public function handle(WaitlistService $waitlistService): void
    {
        $waitlistService->notifyNext($this->reservation);
    }
}

