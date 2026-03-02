---
name: reservas-auth-otp
description: Implement the OTP-based authentication flow for the Reservas system. Use this skill when working on authentication, OTP sending/verification, Sanctum token management, shadow accounts, rate limiting, or the phone number validation for Bolivia. Covers the full flow: phone input → OTP send (WhatsApp/SMS) → OTP verify → Sanctum token + shadow account creation.
argument-hint: "auth flow step or controller method"
---

# OTP Authentication — Reservas System

## Authentication Philosophy

**Zero friction. No passwords.** Authentication flow:

```
1. Client sends phone (+591 XXXXXXXX)
2. System sends 6-digit OTP via WhatsApp/SMS
3. Client sends phone + OTP code + device_name
4. System validates OTP → creates/finds User → issues Sanctum token
5. Token returned to client — valid 30 days (configurable)
```

## Phone Number Format

Bolivian phones only: `+591` followed by 8 digits.

```php
// Validation rule
'phone' => ['required', 'string', 'regex:/^\+591[0-9]{8}$/'],
```

Normalize to E.164 before storing: strip spaces, dashes, parentheses.

```php
public static function normalize(string $phone): string
{
    $digits = preg_replace('/\D/', '', $phone);
    if (str_starts_with($digits, '591')) {
        return '+' . $digits;
    }
    return '+591' . $digits;
}
```

## OTP Specifications

| Property | Value |
|---|---|
| Length | 6 digits, zero-padded |
| Valid for | 10 minutes |
| Rate limit | Max 3 sends per phone per 15 minutes |
| Storage | Cache (Redis), stored as bcrypt hash |
| Channel | WhatsApp (primary), SMS (fallback) |

## Rate Limiting Implementation

```php
// Cache key pattern
$attemptKey = "otp_attempts:{$phone}";

// Check before sending
$attempts = Cache::get($attemptKey, 0);
if ($attempts >= 3) {
    throw new TooManyOtpAttemptsException("Demasiados intentos. Espere 15 minutos.");
}

// Increment counter
Cache::put($attemptKey, $attempts + 1, now()->addMinutes(15));
```

The rate limit window resets after 15 minutes, not per individual attempt. Do NOT use `Cache::increment` + `Cache::put` separately—use an atomic approach:

```php
// Atomic: only set TTL on first attempt
if ($attempts === 0) {
    Cache::put($attemptKey, 1, now()->addMinutes(15));
} else {
    Cache::increment($attemptKey);
}
```

## OTP Storage (Hashed)

```php
// Store
$otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
Cache::put("otp:{$phone}", Hash::make($otp), now()->addMinutes(10));

// Verify
$hashed = Cache::get("otp:{$phone}");
if (! $hashed || ! Hash::check($code, $hashed)) {
    throw new InvalidOtpException("OTP inválido o expirado.");
}
Cache::forget("otp:{$phone}"); // Single use — delete immediately after verify
```

## Shadow Account Creation

When OTP is valid, the user is created silently if they don't exist:

```php
$user = User::firstOrCreate(
    ['phone' => $phone],
    [
        'name'              => 'Usuario ' . substr($phone, -4),
        'phone_verified_at' => now(),
    ]
);
```

- No event dispatched on shadow account creation (`firstOrCreate` does not fire `created` observers on "find" path)
- If user already exists, `phone_verified_at` is NOT overwritten (user already verified)
- `email` remains null until user explicitly adds it in profile settings

## Sanctum Token Issuance

```php
$tokenName  = $request->input('device_name', 'unknown-device');
$plainToken = $user->createToken($tokenName)->plainTextToken;
```

Token expiration — set in `config/sanctum.php`:

```php
'expiration' => env('SANCTUM_TOKEN_EXPIRATION_DAYS', 30) * 60 * 24, // minutes
```

Multiple devices each get an independent token. Logout revokes only the current device's token:

```php
// Logout current device
$request->user()->currentAccessToken()->delete();

// Logout all devices (optional endpoint)
$request->user()->tokens()->delete();
```

## Controller Implementation

```php
// app/Http/Controllers/Api/V1/OtpController.php
final class OtpController extends Controller
{
    public function __construct(private readonly OtpAuthService $service) {}

    public function send(SendOtpRequest $request): JsonResponse
    {
        $this->service->sendOtp($request->validated('phone'));

        return response()->json(['message' => 'OTP enviado correctamente.']);
    }

    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        $token = $this->service->verifyOtp(
            $request->validated('phone'),
            $request->validated('code'),
            $request->validated('device_name', 'unknown')
        );

        return response()->json(['token' => $token]);
    }
}
```

## FormRequests

```php
// SendOtpRequest
public function rules(): array
{
    return [
        'phone' => ['required', 'string', 'regex:/^\+591[0-9]{8}$/'],
    ];
}

// VerifyOtpRequest
public function rules(): array
{
    return [
        'phone'       => ['required', 'string', 'regex:/^\+591[0-9]{8}$/'],
        'code'        => ['required', 'string', 'digits:6'],
        'device_name' => ['nullable', 'string', 'max:255'],
    ];
}
```

## Exception Reference

| Exception | HTTP Code | When |
|---|---|---|
| `TooManyOtpAttemptsException` | 429 | Exceeded 3 sends in 15 minutes |
| `InvalidOtpException` | 422 | Code is wrong or expired |

Register in `bootstrap/app.php`:

```php
$exceptions->render(function (TooManyOtpAttemptsException $e) {
    return response()->json(['message' => $e->getMessage()], 429);
});
$exceptions->render(function (InvalidOtpException $e) {
    return response()->json(['message' => $e->getMessage()], 422);
});
```

## Checklist

- [ ] Phone validated with regex `/^\+591[0-9]{8}$/`
- [ ] OTP is 6 digits, zero-padded, `random_int` (not `rand`)
- [ ] OTP stored as `Hash::make()` in Cache with 10-min TTL
- [ ] Rate limit: max 3 per phone per 15 minutes (atomic increment)
- [ ] OTP deleted from cache immediately after successful verification
- [ ] Shadow account via `firstOrCreate` — no password field
- [ ] Sanctum token includes `device_name`
- [ ] Token expiration configurable via `SANCTUM_TOKEN_EXPIRATION_DAYS` env
- [ ] `TooManyOtpAttemptsException` → HTTP 429
- [ ] `InvalidOtpException` → HTTP 422
