<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'reservation_id',
        'user_id',
        'business_id',
        'rating',
        'comment',
        'photos',
        'status',
        'owner_reply',
        'replied_at',
    ];

    protected function casts(): array
    {
        return [
            'status'     => ReviewStatus::class,
            'rating'     => 'integer',
            'photos'     => 'array',
            'replied_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopePublished(Builder $query): void
    {
        $query->where('status', ReviewStatus::Published->value);
    }

    public function scopePendingModeration(Builder $query): void
    {
        $query->where('status', ReviewStatus::PendingModeration->value);
    }

    public function scopeForBusiness(Builder $query, string $businessId): void
    {
        $query->where('business_id', $businessId);
    }
}
