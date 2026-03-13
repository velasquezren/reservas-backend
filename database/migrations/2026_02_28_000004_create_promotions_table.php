<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Promotions — discount rules owned by a business.
 *
 * Design decisions:
 * - `code` is nullable: promotions can be auto-applied by date/targeting without
 *   requiring a promo code input. When present, it is scoped unique per-business
 *   (different businesses may use the same code string).
 * - `discount_type` string column matches DiscountType enum (percentage / fixed_amount).
 * - `discount_value` centavos for fixed_amount type; integer percentage (0-100) for
 *   percentage type. Storing both types in the same column avoids a polymorphic design.
 * - `max_uses` NULL = unlimited global uses.
 * - `max_uses_per_user` NULL = unlimited per-user.
 * - `current_uses` denormalized counter updated atomically (increment) to avoid
 *   expensive COUNT() queries on every apply attempt.
 * - softDeletes: past promotions with reservation references must not be hard-deleted.
 * - Index on [business_id, starts_at, ends_at] covers the validity window check.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('business_id')->constrained('businesses')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('code')->nullable();                   // promo code string
            $table->string('discount_type');                      // DiscountType enum
            $table->unsignedBigInteger('discount_value');         // centavos or % integer
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->unsignedInteger('max_uses')->nullable();      // NULL = unlimited
            $table->unsignedSmallInteger('max_uses_per_user')->nullable(); // NULL = unlimited
            $table->unsignedInteger('current_uses')->default(0);  // atomically incremented
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            // A business cannot have two active promotions sharing the same code
            $table->unique(['business_id', 'code'], 'promotions_business_code_unique');
            $table->index('business_id');
            $table->index(['business_id', 'starts_at', 'ends_at']); // validity window check
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};
