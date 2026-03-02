<?php

namespace App\Enums;

enum ReservationSource: string
{
    case App    = 'app';
    case Web    = 'web';

    /** Created by staff for a customer who walked in */
    case WalkIn = 'walk_in';

    /** Created by staff based on a phone call */
    case Phone  = 'phone';

    public function label(): string
    {
        return match ($this) {
            self::App    => 'App móvil',
            self::Web    => 'Web',
            self::WalkIn => 'Walk-in',
            self::Phone  => 'Teléfono',
        };
    }
}
