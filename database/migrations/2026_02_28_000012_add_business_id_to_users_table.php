<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds business_id to users so that business owners are linked to their business.
 *
 * Design:
 * - Nullable: most users are customers (no business).
 * - restrictOnDelete: if a business is deleted (soft-deleted), existing user links persist.
 * - Run AFTER create_businesses_table so the FK can be satisfied.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->char('business_id', 26)
                  ->nullable()
                  ->after('email')
                  ->comment('Set when the user is the owner/admin of a business.');

            $table->foreign('business_id')
                  ->references('id')
                  ->on('businesses')
                  ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
            $table->dropColumn('business_id');
        });
    }
};
