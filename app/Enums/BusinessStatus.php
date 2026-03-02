<?php

namespace App\Enums;

enum BusinessStatus: string
{
    case Active    = 'active';
    case Inactive  = 'inactive';
    case Suspended = 'suspended';

    /** Only active businesses may accept new reservations */
    public function canAcceptReservations(): bool
    {
        return $this === self::Active;
    }

    /** Suspended businesses are hidden from the public catalog */
    public function isVisibleInCatalog(): bool
    {
        return $this !== self::Suspended;
    }

    public function label(): string
    {
        return match ($this) {
            self::Active    => 'Activo',
            self::Inactive  => 'Inactivo',
            self::Suspended => 'Suspendido',
        };
    }
}
