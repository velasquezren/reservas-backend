<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Items — catalog entries for a business (reservable spaces + menu products).
 *
 * Design decisions:
 * - `type` (ItemType enum) distinguishes reservable spaces from menu items.
 *   Both live in the same table to simplify catalog management and promotions.
 * - `capacity` is NULL for menu items (has no meaning); required for reservable items.
 *   Enforced in business logic (ReservationService), not at DB level, for flexibility.
 * - `base_price` stored as centavos (Bs × 100). PricingRules can override this.
 * - `variants` JSON column holds optional variant definitions (size S/M/L, cook level)
 *   without requiring a separate normalization table for simple use cases.
 * - FK to categories is restrictOnDelete: prevents deleting a category used by active items.
 * - softDeletes: items with historical reservation records must not be hard-deleted.
 * - Index on [business_id, status] covers the most common catalog query.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('business_id')->constrained('businesses')->restrictOnDelete();
            $table->foreignUlid('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('type')->default('reservable');       // ItemType enum
            $table->string('status')->default('active');         // ItemStatus enum
            $table->unsignedBigInteger('base_price');            // centavos (Bs × 100)
            $table->unsignedSmallInteger('capacity')->nullable(); // only for reservable items
            $table->unsignedSmallInteger('duration_minutes')->nullable(); // default slot duration
            $table->json('variants')->nullable();                // optional size/option variants
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['business_id', 'slug']);
            $table->index('business_id');
            $table->index('status');
            $table->index(['business_id', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
