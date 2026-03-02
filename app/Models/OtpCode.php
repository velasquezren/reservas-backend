<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class OtpCode extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'phone',
        'code',
        'expires_at',
        'used_at',
        'attempts',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at'    => 'datetime',
            'attempts'   => 'integer',
        ];
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    /**
     * OTP codes that are still valid: not used and not expired.
     */
    public function scopeValid(Builder $query): void
    {
        $query->whereNull('used_at')
              ->where('expires_at', '>', Carbon::now());
    }

    /**
     * OTP codes for a specific phone number.
     */
    public function scopeForPhone(Builder $query, string $phone): void
    {
        $query->where('phone', $phone);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }

    public function isValid(): bool
    {
        return ! $this->isUsed() && ! $this->isExpired();
    }

    public function markAsUsed(): bool
    {
        return $this->update(['used_at' => Carbon::now()]);
    }
}
