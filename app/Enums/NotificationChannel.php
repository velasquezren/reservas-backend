<?php

namespace App\Enums;

enum NotificationChannel: string
{
    /** Stored in the notifications table for in-app inbox */
    case Database = 'database';

    /** Sent via custom HTTP driver (WhatsApp Business API) */
    case WhatsApp = 'whatsapp';

    /** Standard Laravel mail channel */
    case Mail = 'mail';

    public function label(): string
    {
        return match ($this) {
            self::Database  => 'In-App',
            self::WhatsApp  => 'WhatsApp',
            self::Mail      => 'Correo',
        };
    }
}
