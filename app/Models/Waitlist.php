<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class Waitlist extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'item_id',
        'business_id',
        'scheduled_date',
        'start_time',
        'party_size',
        'position',
        'notified_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'notified_at'    => 'datetime',
            'expires_at'     => 'datetime',
            'position'       => 'integer',
            'party_size'     => 'integer',
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

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopeForBusiness(Builder $query, string $businessId): void
    {
        $query->where('business_id', $businessId);
    }

    /**
     * Entries that have NOT yet been notified, ordered by position (first in queue first).
     */
    public function scopePending(Builder $query): void
    {
        $query->whereNull('notified_at')->orderBy('position');
    }

    /**
     * Entries for a specific item+slot, ordered by queue position.
     */
    public function scopeForSlot(Builder $query, string $itemId, string $date, string $time): void
    {
        $query->where('item_id', $itemId)
              ->where('scheduled_date', $date)
              ->where('start_time', $time)
              ->orderBy('position');
    }
}
