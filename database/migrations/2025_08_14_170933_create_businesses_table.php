<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Businesses — the multi-tenant root entity.
 *
 * Design decisions:
 * - `slug` provides a URL-safe unique identifier for public-facing routes.
 * - `timezone` defaults to America/La_Paz (UTC-4, Bolivia); stored per-business
 *   to allow future multi-region expansion.
 * - `average_rating` and `total_reviews` are denormalized aggregates updated by
 *   ReviewObserver — avoids expensive AVG()/COUNT() on every catalog page load.
 * - `settings` JSON holds configurable options (reservation duration defaults,
 *   reminder lead-time, etc.) without requiring extra columns.
 * - softDeletes: a deleted business preserves all historical reservation records.
 * - `status` uses a plain string column (never MySQL ENUM) matching BusinessStatus.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('timezone')->default('America/La_Paz');
            $table->string('status')->default('active');             // BusinessStatus enum
            $table->text('description')->nullable();
            $table->string('logo_url')->nullable();
            $table->decimal('average_rating', 3, 2)->default(0.00); // updated by ReviewObserver
            $table->unsignedInteger('total_reviews')->default(0);    // updated by ReviewObserver
            $table->json('settings')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
