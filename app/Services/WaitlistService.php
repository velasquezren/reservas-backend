<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\Waitlist;
use App\Notifications\WaitlistSlotAvailableNotification;

final class WaitlistService
{
    /**
     * Add a user to the waitlist for the given item/slot.
     * Position is max(existing positions) + 1.
     */
    public function join(
        string $itemId,
        string $businessId,
        string $date,
        string $startTime,
        string $userId,
        int    $partySize = 1,
    ): Waitlist {
        $nextPosition = (int) Waitlist::where('item_id', $itemId)
            ->where('scheduled_date', $date)
            ->where('start_time', $startTime)
            ->max('position') + 1;

        return Waitlist::create([
            'user_id'        => $userId,
            'item_id'        => $itemId,
            'business_id'    => $businessId,
            'scheduled_date' => $date,
            'start_time'     => $startTime,
            'party_size'     => $partySize,
            'position'       => $nextPosition,
        ]);
    }

    /**
     * Remove a waitlist entry and recalculate positions for remaining entries.
     */
    public function leave(Waitlist $entry): void
    {
        $itemId    = $entry->item_id;
        $date      = $entry->scheduled_date->toDateString();
        $startTime = $entry->start_time;

        $entry->delete();

        $this->recalculatePositions($itemId, $date, $startTime);
    }

    /**
     * Notify the first (position = 1) non-notified user in the waitlist
     * for the slot of the cancelled reservation.
     *
     * Called by WaitlistNotificationJob.
     * Does NOT auto-create a reservation — user must confirm.
     */
    public function notifyNext(Reservation $cancelledReservation): void
    {
        $next = Waitlist::where('item_id', $cancelledReservation->item_id)
            ->where('scheduled_date', $cancelledReservation->scheduled_date)
            ->where('start_time', $cancelledReservation->start_time)
            ->whereNull('notified_at')
            ->orderBy('position')
            ->lockForUpdate()
            ->first();

        if (! $next) {
            return;
        }

        $next->user->notify(new WaitlistSlotAvailableNotification($cancelledReservation));

        $next->update(['notified_at' => now()]);
    }

    /**
     * Reorder all entries for a slot sequentially by created_at after a leave.
     */
    public function recalculatePositions(string $itemId, string $date, string $startTime): void
    {
        Waitlist::where('item_id', $itemId)
            ->where('scheduled_date', $date)
            ->where('start_time', $startTime)
            ->orderBy('created_at')
            ->get()
            ->each(function (Waitlist $entry, int $index) {
                $entry->update(['position' => $index + 1]);
            });
    }

    /**
     * Return the queue position of a specific user in a slot (null if not found).
     */
    public function positionOf(string $itemId, string $date, string $startTime, string $userId): ?int
    {
        return Waitlist::where('item_id', $itemId)
            ->where('scheduled_date', $date)
            ->where('start_time', $startTime)
            ->where('user_id', $userId)
            ->value('position');
    }
}
