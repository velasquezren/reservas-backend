<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case Pending   = 'pending';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case NoShow    = 'no_show';
    case Cancelled = 'cancelled';

    /** Returns true if this status blocks a timeslot (prevents other bookings) */
    public function isActive(): bool
    {
        return in_array($this, [self::Pending, self::Confirmed]);
    }

    /** Returns true if this is a terminal state (no further transitions) */
    public function isTerminal(): bool
    {
        return in_array($this, [self::Completed, self::NoShow, self::Cancelled]);
    }

    /**
     * Valid state-machine transitions:
     *   pending   → confirmed | cancelled
     *   confirmed → completed | no_show | cancelled
     *   completed | no_show | cancelled → (none)
     */
    public function canTransitionTo(self $next): bool
    {
        return match ($this) {
            self::Pending   => in_array($next, [self::Confirmed, self::Cancelled]),
            self::Confirmed => in_array($next, [self::Completed, self::NoShow, self::Cancelled]),
            default         => false,
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
