<?php

namespace App\Models;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory, SoftDeletes, HasUlids;

    protected $fillable = [
        'business_id',
        'category_id',
        'name',
        'slug',
        'description',
        'image_url',
        'type',
        'status',
        'base_price',
        'capacity',
        'duration_minutes',
        'variants',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'type'             => ItemType::class,
            'status'           => ItemStatus::class,
            'base_price'       => 'integer',
            'capacity'         => 'integer',
            'duration_minutes' => 'integer',
            'sort_order'       => 'integer',
            'variants'         => 'array',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function pricingRules(): HasMany
    {
        return $this->hasMany(PricingRule::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function waitlists(): HasMany
    {
        return $this->hasMany(Waitlist::class);
    }

    /** Promotions that target this item specifically */
    public function promotionApplicables(): MorphMany
    {
        return $this->morphMany(PromotionApplicable::class, 'applicable');
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): void
    {
        $query->where('status', ItemStatus::Active->value);
    }

    public function scopeForBusiness(Builder $query, string $businessId): void
    {
        $query->where('business_id', $businessId);
    }

    public function scopeReservable(Builder $query): void
    {
        $query->where('type', ItemType::Reservable->value);
    }

    public function scopeMenuItems(Builder $query): void
    {
        $query->where('type', ItemType::MenuItem->value);
    }

    // ─── Money Accessor ───────────────────────────────────────────────────────

    public function getBasePriceFormattedAttribute(): string
    {
        return 'Bs ' . number_format($this->base_price / 100, 2);
    }
}
