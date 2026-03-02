<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reviews — customer ratings left after a completed reservation.
 *
 * Design decisions:
 * - Unique constraint on [reservation_id, user_id] enforces "one review per reservation
 *   per user". The business rule (only completed reservations) is enforced in
 *   ReviewFormRequest + ReviewService, not at DB level (avoids complex CHECK constraints).
 * - `rating` TINYINT with CHECK constraint (1-5) via `unsignedTinyInteger` + range note.
 *   MySQL will accept values 0-255; the 1-5 range is validated in the FormRequest.
 *   An application-level DB check could be added via a raw statement in the migration
 *   if stricter enforcement is desired.
 * - `photos` JSON array of up to 3 storage URLs.
 * - `status` string column matches ReviewStatus enum (pending_moderation / published / rejected).
 * - `owner_reply` and `replied_at` allow the business to respond publicly.
 * - FK to reservations is restrictOnDelete: reviews are historical records.
 * - FK to users is restrictOnDelete: same as reservations.
 * - FK to businesses is restrictOnDelete and included for fast dashboard queries.
 * - No softDeletes: rejected reviews are garbage-collected by a scheduled job;
 *   published reviews are historical records protected by restrictOnDelete.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('reservation_id')->constrained('reservations')->restrictOnDelete();
            $table->foreignUlid('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignUlid('business_id')->constrained('businesses')->restrictOnDelete();
            $table->unsignedTinyInteger('rating');                // 1-5 stars; enforced in FormRequest
            $table->text('comment')->nullable();
            $table->json('photos')->nullable();                   // up to 3 storage URLs
            $table->string('status')->default('pending_moderation'); // ReviewStatus enum
            $table->text('owner_reply')->nullable();              // business response
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();

            $table->unique(['reservation_id', 'user_id'], 'reviews_reservation_user_unique');
            $table->index('business_id');
            $table->index('user_id');
            $table->index('status');
            $table->index(['business_id', 'status']);             // published reviews query
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
