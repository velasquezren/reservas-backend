<?php

namespace App\Actions;

use App\Enums\ReservationStatus;
use App\Exceptions\InvalidStatusTransitionException;
use App\Models\Reservation;
use Illuminate\Support\Carbon;

/**
 * Single-purpose atomic action: transition a reservation to `completed`.
 *
 * Validates the status machine before persisting.
 */
final class CompleteReservationAction
{
    /**
     * @throws InvalidStatusTransitionException
     */
    public function execute(Reservation $reservation): Reservation
    {
        if (! $reservation->status->canTransitionTo(ReservationStatus::Completed)) {
            throw new InvalidStatusTransitionException(
                "No se puede completar una reserva en estado: {$reservation->status->label()}"
            );
        }

        $reservation->update([
            'status'       => ReservationStatus::Completed,
            'completed_at' => Carbon::now('America/La_Paz'),
        ]);

        return $reservation->fresh();
    }
}
