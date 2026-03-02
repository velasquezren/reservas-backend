<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class ReservationItem extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'reservation_id',
        'item_id',
        'quantity',
        'unit_price',
        'variant_snapshot',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity'         => 'integer',
            'unit_price'       => 'integer',
            'variant_snapshot' => 'array',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    // ─── Computed ─────────────────────────────────────────────────────────────

    /** Subtotal for this line in centavos */
    public function getSubtotalAttribute(): int
    {
        return $this->unit_price * $this->quantity;
    }

    public function getSubtotalFormattedAttribute(): string
    {
        return 'Bs ' . number_format($this->subtotal / 100, 2);
    }
}
