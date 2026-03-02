<?php

namespace App\Services;

use App\Exceptions\InvalidOtpException;
use App\Exceptions\TooManyOtpAttemptsException;
use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

final class OtpAuthService
{
    private const OTP_TTL_MINUTES    = 10;
    private const RATE_LIMIT_MAX     = 3;
    private const RATE_LIMIT_MINUTES = 15;

    // ─── Send ─────────────────────────────────────────────────────────────────

    /**
     * Generate and dispatch (WhatsApp/SMS) a 6-digit OTP for the given phone.
     *
     * Rate limit: max 3 sends per phone per 15-minute window (atomic counter).
     *
     * @throws TooManyOtpAttemptsException
     */
    public function sendOtp(string $phone): void
    {
        $this->enforceRateLimit($phone);

        $code = $this->generateCode();

        // Store bcrypt hash in cache — plain code is never persisted
        Cache::put(
            "otp:{$phone}",
            Hash::make($code),
            now()->addMinutes(self::OTP_TTL_MINUTES)
        );

        // Also persist a record for audit / attempt tracking
        OtpCode::create([
            'phone'      => $phone,
            'code'       => Hash::make($code),       // hashed — never plain
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
        ]);

        // En local: log el código para pruebas sin WhatsApp/SMS
        if (app()->environment('local')) {
            Log::info("[OTP LOCAL] Teléfono: {$phone} — Código: {$code}");
        }

        // Dispatch notification — WhatsApp primary, SMS fallback
        // Notification::sendNow(new AnonymousNotifiable()->route('whatsapp', $phone), new OtpNotification($code));
    }

    // ─── Verify ───────────────────────────────────────────────────────────────

    /**
     * Verify an OTP code and return a Sanctum plain-text token.
     *
     * On success:
     * - Creates a "shadow account" if the user doesn't exist yet.
     * - Sets phone_verified_at on first verification.
     * - Issues an independent Sanctum token for the device.
     *
     * @throws InvalidOtpException
     * @return array{user: \App\Models\User, token: string}
     */
    public function verifyOtp(string $phone, string $code, string $deviceName = 'unknown'): array
    {
        $hashed = Cache::get("otp:{$phone}");

        if (! $hashed || ! Hash::check($code, $hashed)) {
            throw new InvalidOtpException();
        }

        // Single-use: delete immediately after successful verify
        Cache::forget("otp:{$phone}");

        // Shadow account — silently create if first-time login
        $user = User::firstOrCreate(
            ['phone' => $phone],
            [
                'name'              => 'Usuario ' . substr($phone, -4),
                'phone_verified_at' => now(),
            ]
        );

        // If existing user hasn't verified phone yet, mark now
        if ($user->phone_verified_at === null) {
            $user->update(['phone_verified_at' => now()]);
        }

        // Reset rate-limit counter on successful verify
        Cache::forget("otp_attempts:{$phone}");

        $token = $user->createToken($deviceName)->plainTextToken;

        return ['user' => $user, 'token' => $token];
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * @throws TooManyOtpAttemptsException
     */
    private function enforceRateLimit(string $phone): void
    {
        $key      = "otp_attempts:{$phone}";
        $attempts = Cache::get($key, 0);

        if ($attempts >= self::RATE_LIMIT_MAX) {
            throw new TooManyOtpAttemptsException($phone);
        }

        // Atomic: set TTL window only on the first attempt
        if ($attempts === 0) {
            Cache::put($key, 1, now()->addMinutes(self::RATE_LIMIT_MINUTES));
        } else {
            Cache::increment($key);
        }
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    // ─── Phone Normalization ──────────────────────────────────────────────────

    /**
     * Normalize a Bolivian phone string to E.164 format (+591XXXXXXXX).
     */
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (str_starts_with($digits, '591')) {
            return '+' . $digits;
        }

        return '+591' . $digits;
    }
}
