<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Promotion Applicables — polymorphic targeting for promotions.
 *
 * Design decisions:
 * - Polymorphic relation allows a promotion to target: the whole booking
 *   (no rows here), specific categories, or specific items — without separate tables.
 * - `applicable_type` stores the Eloquent morph map key (e.g. 'category', 'item').
 * - `applicable_id` stores the target ULID.
 * - When NO rows exist for a promotion_id, the promotion applies to the entire reservation.
 * - When rows exist, the discount applies only to reservation_items whose item_id
 *   matches an item row, OR whose item.category_id matches a category row.
 *   Resolution is handled in PromotionService.
 * - FK to promotions is cascadeOnDelete: applicability rules are meaningless without
 *   their parent promotion.
 * - No softDeletes, no separate timestamps needed — these are configuration rows.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_applicables', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->string('applicable_type');                    // morph map key: 'item'|'category'
            $table->ulid('applicable_id');                       // target ULID
            $table->timestamps();

            $table->unique(
                ['promotion_id', 'applicable_type', 'applicable_id'],
                'promotion_applicables_unique'
            );
            $table->index(['applicable_type', 'applicable_id']); // standard morph index
            $table->index('promotion_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_applicables');
    }
};
