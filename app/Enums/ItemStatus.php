<?php

namespace App\Enums;

enum ItemStatus: string
{
    case Active   = 'active';
    case Inactive = 'inactive';

    /** Draft items are not yet published and invisible to clients */
    case Draft    = 'draft';

    public function isBookable(): bool
    {
        return $this === self::Active;
    }

    public function label(): string
    {
        return match ($this) {
            self::Active   => 'Activo',
            self::Inactive => 'Inactivo',
            self::Draft    => 'Borrador',
        };
    }
}
