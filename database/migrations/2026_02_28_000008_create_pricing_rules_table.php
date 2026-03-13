<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pricing Rules — dynamic per-item price overrides.
 *
 * Design decisions:
 * - Three mutually-exclusive priority tiers (higher specificity wins):
 *     1. `specific_date`  — exact calendar date (e.g. Carnaval Cruceño, feriado)
 *     2. `day_of_week`    — recurring day (0=Sunday … 6=Saturday, NULL = any day)
 *     3. `time_range`     — time window within a day (starts_at / ends_at as TIME)
 *   Precedence must be resolved in PricingService, not at DB level.
 * - `override_price` stored as centavos. A NULL means "no override on this field",
 *   allowing partial-match rules.
 * - FK cascadeOnDelete: pricing rules have no meaning without their parent item.
 * - No softDeletes: expired/replaced rules are simply deleted; item history uses
 *   the `price_snapshot` on reservations (immutable at booking time).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('item_id')->constrained('items')->cascadeOnDelete();
            $table->string('name')->nullable();                   // human-readable label
            $table->unsignedBigInteger('override_price');         // centavos
            $table->date('specific_date')->nullable();            // tier 1: exact date override
            $table->unsignedTinyInteger('day_of_week')->nullable(); // tier 2: 0=Sun … 6=Sat
            $table->time('starts_at')->nullable();                // tier 3: time-range start
            $table->time('ends_at')->nullable();                  // tier 3: time-range end
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('item_id');
            $table->index('specific_date');
            $table->index('day_of_week');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rules');
    }
};
