<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, SoftDeletes, HasUlids, HasApiTokens;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'password',
        'business_id',
        'phone_verified_at',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'email_verified_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function waitlists(): HasMany
    {
        return $this->hasMany(Waitlist::class);
    }
}
