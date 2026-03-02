<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Categories — logical groupings of items within a business.
 *
 * Design decisions:
 * - FK to businesses uses restrictOnDelete: deleting a business that still owns
 *   categories would leave orphaned catalog data; force the operator to clean up
 *   categories first (or the business softDelete path handles it).
 * - `sort_order` allows manual reordering in the admin UI without renaming slugs.
 * - softDeletes: a deleted category preserves items (items have their own softDelete).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('business_id')->constrained('businesses')->restrictOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['business_id', 'slug']);             // slug unique within a business
            $table->index('business_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
