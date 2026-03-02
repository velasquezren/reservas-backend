<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory, SoftDeletes, HasUlids;

    protected $fillable = [
        'business_id',
        'name',
        'slug',
        'description',
        'image_url',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'  => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    /** Promotions that target this category specifically */
    public function promotionApplicables(): MorphMany
    {
        return $this->morphMany(PromotionApplicable::class, 'applicable');
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

    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('name');
    }
}
