<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Waitlists — users queued for a fully-booked item/slot.
 *
 * Design decisions:
 * - `position` is a computed rank maintained by WaitlistService; stored as an integer
 *   for fast ORDER BY, recalculated when any entry above is removed.
 * - `notified_at` marks when the system sent the "slot available" notification
 *   so we can skip already-notified entries on subsequent vacancy events.
 * - `expires_at` allows entries to auto-expire (e.g. 24h after notification with no
 *   follow-up reservation) — enforced by a scheduled job.
 * - Unique constraint on [item_id, scheduled_date, start_time, user_id] prevents a
 *   user from joining the same slot's waitlist twice.
 * - FK to users is restrictOnDelete (same reasoning as reservations).
 * - FK to items is restrictOnDelete.
 * - No softDeletes: entries are removed cleanly when a reservation is made or expired.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waitlists', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('item_id')->constrained('items')->restrictOnDelete();
            $table->foreignUlid('business_id')->constrained('businesses')->restrictOnDelete();
            $table->date('scheduled_date');
            $table->time('start_time');
            $table->unsignedSmallInteger('party_size')->default(1);
            $table->unsignedSmallInteger('position');             // 1-based rank in queue
            $table->timestamp('notified_at')->nullable();         // when slot-available was sent
            $table->timestamp('expires_at')->nullable();          // auto-expire deadline
            $table->timestamps();

            $table->unique(
                ['item_id', 'scheduled_date', 'start_time', 'user_id'],
                'waitlists_slot_user_unique'
            );
            $table->index('user_id');
            $table->index('item_id');
            $table->index('business_id');
            $table->index(['item_id', 'scheduled_date', 'start_time', 'position']); // position lookup
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlists');
    }
};
