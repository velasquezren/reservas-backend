<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reservation Items — pre-ordered menu items attached to a reservation.
 *
 * Design decisions:
 * - Only items with type = 'menu_item' should appear here; enforced in
 *   ReservationService, not at DB level (avoiding a computed-column constraint).
 * - `unit_price` stores the price at the time the item was added to the reservation
 *   (snapshot). This is distinct from items.base_price which can change.
 * - `variant_snapshot` JSON captures the specific variant chosen (e.g. size=L,
 *   temperature=cold) so the kitchen order is unambiguous.
 * - FK to reservations is cascadeOnDelete: reservation_items have no meaning without
 *   their parent reservation.
 * - FK to items is restrictOnDelete: do not allow deleting a menu item that appears
 *   in existing reservation orders (historical integrity).
 * - No softDeletes, no timestamps: these are line-items in an immutable order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('reservation_id')->constrained('reservations')->cascadeOnDelete();
            $table->foreignUlid('item_id')->constrained('items')->restrictOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->unsignedBigInteger('unit_price');             // centavos at time of order
            $table->json('variant_snapshot')->nullable();         // chosen variant options
            $table->text('notes')->nullable();                    // per-item customer notes
            $table->timestamps();

            $table->index('reservation_id');
            $table->index('item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_items');
    }
};
