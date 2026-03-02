<?php

namespace App\Enums;

enum ReviewStatus: string
{
    /** Default state — awaiting content moderation before going live */
    case PendingModeration = 'pending_moderation';

    case Published = 'published';
    case Rejected  = 'rejected';

    public function isVisible(): bool
    {
        return $this === self::Published;
    }

    public function label(): string
    {
        return match ($this) {
            self::PendingModeration => 'Pendiente moderación',
            self::Published         => 'Publicada',
            self::Rejected          => 'Rechazada',
        };
    }
}
