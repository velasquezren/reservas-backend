<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OTP Codes — short-lived codes for passwordless phone authentication.
 *
 * Design decisions:
 * - `phone` is stored directly (not as FK to users) because an OTP can be requested
 *   before the user record exists — the shadow account is created on successful
 *   verification, not on OTP request.
 * - `expires_at` is explicit rather than relying on created_at + TTL math in queries;
 *   makes expiry checks a simple WHERE clause.
 * - `used_at` tracks when the code was consumed. NULL means still valid (if not expired).
 * - `attempts` counts failed verification attempts to enforce lockout before rate limit
 *   at the request level (max 3 attempts).
 * - No softDeletes — expired/used codes can be pruned by a scheduled job.
 * - No autoincrement id — ULID keeps this table consistent with the rest of the schema.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('phone');                              // +591 XXXXXXXX
            $table->string('code', 6);                           // 6-digit numeric code
            $table->timestamp('expires_at');                     // now() + 10 minutes
            $table->timestamp('used_at')->nullable();            // set on successful verify
            $table->unsignedTinyInteger('attempts')->default(0); // failed verify attempts
            $table->timestamps();

            // Index for the lookup pattern: WHERE phone = ? AND used_at IS NULL AND expires_at > NOW()
            $table->index(['phone', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};
