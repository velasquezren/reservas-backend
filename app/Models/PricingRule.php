<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class PricingRule extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'item_id',
        'name',
        'override_price',
        'specific_date',
        'day_of_week',
        'starts_at',
        'ends_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'override_price' => 'integer',
            'specific_date'  => 'date',
            'day_of_week'    => 'integer',
            'is_active'      => 'boolean',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    // ─── Money Accessor ───────────────────────────────────────────────────────

    public function getOverridePriceFormattedAttribute(): string
    {
        return 'Bs ' . number_format($this->override_price / 100, 2);
    }
}
