<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Model;

class PromotionApplicable extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'promotion_id',
        'applicable_type',
        'applicable_id',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    /**
     * Polymorphic target: either an Item or a Category.
     */
    public function applicable(): MorphTo
    {
        return $this->morphTo();
    }
}
