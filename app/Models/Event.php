<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class Event extends Model
{
    use HasFactory, SoftDeletes, HasUlids;

    protected $fillable = [
        'business_id',
        'name',
        'description',
        'starts_at',
        'ends_at',
        'is_active',
        'banner_path',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at'   => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    public function scopeUpcomingOrCurrent(Builder $query): void
    {
        $now = Carbon::now();

        $query->where(function (Builder $q) use ($now) {
            $q->where('starts_at', '<=', $now)
              ->where(function (Builder $inner) use ($now) {
                  $inner->whereNull('ends_at')
                        ->orWhere('ends_at', '>=', $now);
              });
        });
    }
}

