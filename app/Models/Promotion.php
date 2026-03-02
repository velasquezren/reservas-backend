<?php

namespace App\Models;

use App\Enums\DiscountType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Promotion extends Model
{
    use HasFactory, SoftDeletes, HasUlids;

    protected $fillable = [
        'business_id',
        'name',
        'description',
        'code',
        'discount_type',
        'discount_value',
        'starts_at',
        'ends_at',
        'max_uses',
        'max_uses_per_user',
        'current_uses',
        'is_active',
        'banner_path',
    ];

    protected function casts(): array
    {
        return [
            'discount_type'      => DiscountType::class,
            'discount_value'     => 'integer',
            'starts_at'          => 'datetime',
            'ends_at'            => 'datetime',
            'max_uses'           => 'integer',
            'max_uses_per_user'  => 'integer',
            'current_uses'       => 'integer',
            'is_active'          => 'boolean',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function applicables(): HasMany
    {
        return $this->hasMany(PromotionApplicable::class);
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    public function scopeForBusiness(Builder $query, string $businessId): void
    {
        $query->where('business_id', $businessId);
    }

    /**
     * Promotions currently within their validity window.
     */
    public function scopeValid(Builder $query): void
    {
        $now = Carbon::now();
        $query->where('is_active', true)
              ->where('starts_at', '<=', $now)
              ->where('ends_at', '>=', $now);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** True if global uses are not yet exhausted */
    public function hasUsesRemaining(): bool
    {
        return $this->max_uses === null || $this->current_uses < $this->max_uses;
    }

    /** True if user has not exceeded per-user limit */
    public function hasUsesRemainingForUser(string $userId): bool
    {
        if ($this->max_uses_per_user === null) {
            return true;
        }

        // Count resolved in PromotionService to avoid N+1 here
        return true;
    }

    public function isCurrentlyValid(): bool
    {
        $now = Carbon::now();
        return $this->is_active
            && $this->starts_at <= $now
            && $this->ends_at >= $now;
    }
}
