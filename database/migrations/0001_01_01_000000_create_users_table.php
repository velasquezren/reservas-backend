<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Users — phone-first, passwordless (OTP).
 *
 * Design decisions:
 * - ULID primary key: time-sortable, shorter than UUID, compatible with Sanctum.
 * - `phone` is the unique identifier; email is optional (shadow accounts).
 * - No password column — auth is 100% OTP via WhatsApp/SMS.
 * - `phone_verified_at` marks when the user first confirmed their phone via OTP.
 * - softDeletes: preserves referential integrity (reservations, reviews still point to
 *   deleted users for historical/legal purposes).
 * - sessions.user_id is a plain string(26) without a FK constraint so that
 *   session records survive even when no user is authenticated (guest sessions).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name')->nullable();          // optional on shadow-account creation
            $table->string('phone')->unique();           // +591 XXXXXXXX — primary identifier
            $table->string('email')->nullable()->unique();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        // Sessions — user_id stored as string to match ULID; no FK so guest sessions work.
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id', 26)->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};
