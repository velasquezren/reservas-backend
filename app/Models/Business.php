<?php

namespace App\Models;

use App\Enums\BusinessStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    use HasFactory, SoftDeletes, HasUlids;

    protected $fillable = [
        'name',
        'slug',
        'phone',
        'email',
        'address',
        'timezone',
        'status',
        'description',
        'logo_url',
        'average_rating',
        'total_reviews',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'status'         => BusinessStatus::class,
            'average_rating' => 'decimal:2',
            'settings'       => 'array',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(Promotion::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    // ─── Local Scopes ─────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): void
    {
        $query->where('status', BusinessStatus::Active->value);
    }

    public function scopeSuspended(Builder $query): void
    {
        $query->where('status', BusinessStatus::Suspended->value);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function canAcceptReservations(): bool
    {
        return $this->status->canAcceptReservations();
    }
}
