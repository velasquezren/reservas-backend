<?php

namespace App\Enums;

enum ItemType: string
{
    /** Reservable space: table, private room, court, spa chair, etc. */
    case Reservable = 'reservable';

    /** Menu product: dish, beverage, combo — used as pre-order on a reservation */
    case MenuItem = 'menu_item';

    public function isReservable(): bool
    {
        return $this === self::Reservable;
    }

    public function isMenuItem(): bool
    {
        return $this === self::MenuItem;
    }

    public function label(): string
    {
        return match ($this) {
            self::Reservable => 'Reservable',
            self::MenuItem   => 'Ítem de menú',
        };
    }
}
