<?php

namespace App\Models;

use App\Enums\ReservationSource;
use App\Enums\ReservationStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'item_id',
        'business_id',
        'confirmation_code',
        'status',
        'source',
        'scheduled_date',
        'start_time',
        'duration_minutes',
        'party_size',
        'notes',
        'total_amount',
        'discount_amount',
        'applied_promo_id',
        'price_snapshot',
        'promo_snapshot',
        'confirmed_at',
        'cancelled_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status'           => ReservationStatus::class,
            'source'           => ReservationSource::class,
            'scheduled_date'   => 'date',
            'confirmed_at'     => 'datetime',
            'cancelled_at'     => 'datetime',
            'completed_at'     => 'datetime',
            'total_amount'     => 'integer',
            'discount_amount'  => 'integer',
            'duration_minutes' => 'integer',
            'party_size'       => 'integer',
            'price_snapshot'   => 'array',
            'promo_snapshot'   => 'array',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function reservationItems(): HasMany
    {
        return $this->hasMany(ReservationItem::class);
    }

    public function appliedPromotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class, 'applied_promo_id');
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopeForBusiness(Builder $query, string $businessId): void
    {
        $query->where('business_id', $businessId);
    }

    public function scopeActive(Builder $query): void
    {
        $query->whereIn('status', [
            ReservationStatus::Pending->value,
            ReservationStatus::Confirmed->value,
        ]);
    }

    public function scopeUpcoming(Builder $query): void
    {
        $query->where('scheduled_date', '>=', today())
              ->whereIn('status', [
                  ReservationStatus::Pending->value,
                  ReservationStatus::Confirmed->value,
              ]);
    }

    public function scopePast(Builder $query): void
    {
        $query->where(function (Builder $q) {
            $q->where('scheduled_date', '<', today())
              ->orWhereIn('status', [
                  ReservationStatus::Completed->value,
                  ReservationStatus::NoShow->value,
              ]);
        });
    }

    public function scopeByStatus(Builder $query, ReservationStatus $status): void
    {
        $query->where('status', $status->value);
    }

    public function scopeBySource(Builder $query, ReservationSource $source): void
    {
        $query->where('source', $source->value);
    }

    // ─── Money Accessors ──────────────────────────────────────────────────────

    public function getTotalAmountFormattedAttribute(): string
    {
        return 'Bs ' . number_format($this->total_amount / 100, 2);
    }

    public function getDiscountAmountFormattedAttribute(): string
    {
        return 'Bs ' . number_format($this->discount_amount / 100, 2);
    }
}
