<?php

namespace App\Notifications;

use App\Enums\NotificationChannel;
use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Sent to the first user in a waitlist when a slot becomes available.
 * Full implementation (WhatsApp driver) in Phase 4.
 */
class WaitlistSlotAvailableNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly Reservation $reservation)
    {
    }

    public function via(object $notifiable): array
    {
        return [
            NotificationChannel::Database->value,
            // NotificationChannel::WhatsApp->value,  // enabled in Phase 4
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'             => 'waitlist_slot_available',
            'reservation_id'   => $this->reservation->id,
            'item_id'          => $this->reservation->item_id,
            'item_name'        => $this->reservation->item?->name,
            'scheduled_date'   => $this->reservation->scheduled_date->toDateString(),
            'start_time'       => $this->reservation->start_time,
            'business_id'      => $this->reservation->business_id,
            'message'          => 'Un espacio se ha liberado. ¡Reserva ahora!',
        ];
    }
}
