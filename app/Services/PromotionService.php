<?php

namespace App\Services;

use App\Exceptions\PromotionExhaustedException;
use App\Exceptions\PromotionNotApplicableException;
use App\Exceptions\PromotionNotFoundException;
use App\Exceptions\PromotionUserLimitException;
use App\Models\Item;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class PromotionService
{
    /**
     * Find, validate, and return a promotion for the given code + business + user.
     *
     * Validates in order:
     *   1. Promotion exists, is active, and is within its validity window.
     *   2. Global usage limit not exceeded.
     *   3. Per-user usage limit not exceeded.
     *   4. Promotion applies to at least one item in $itemIds.
     *
     * @param  string[]  $itemIds  IDs of all items in the reservation (reservable + menu)
     *
     * @throws PromotionNotFoundException
     * @throws PromotionExhaustedException
     * @throws PromotionUserLimitException
     * @throws PromotionNotApplicableException
     */
    public function findAndValidate(
        string $promoCode,
        string $businessId,
        User   $user,
        array  $itemIds,
    ): Promotion {
        // 1. Find active, non-expired promotion for this business
        $promo = Promotion::query()
            ->where('business_id', $businessId)
            ->where('code', $promoCode)
            ->where('is_active', true)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->first();

        if (! $promo) {
            throw new PromotionNotFoundException();
        }

        // 2. Global usage limit
        if ($promo->max_uses !== null && $promo->current_uses >= $promo->max_uses) {
            throw new PromotionExhaustedException();
        }

        // 3. Per-user usage limit — count non-cancelled reservations using this promo
        if ($promo->max_uses_per_user !== null) {
            $userUsage = DB::table('reservations')
                ->where('user_id', $user->id)
                ->where('applied_promo_id', $promo->id)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($userUsage >= $promo->max_uses_per_user) {
                throw new PromotionUserLimitException();
            }
        }

        // 4. Applicability check
        $this->assertApplicable($promo, $itemIds);

        return $promo;
    }

    /**
     * Atomically increment the promotion's used counter after a successful commit.
     * Must be called OUTSIDE the reservation transaction (after commit).
     */
    public function incrementUsage(Promotion $promo): void
    {
        Promotion::where('id', $promo->id)->increment('current_uses');
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * @param  string[]  $itemIds
     *
     * @throws PromotionNotApplicableException
     */
    private function assertApplicable(Promotion $promo, array $itemIds): void
    {
        // No restriction rows → applies to the entire reservation
        if ($promo->applicables()->doesntExist()) {
            return;
        }

        // Resolve category IDs for all items (single query)
        $categoryIds = Item::whereIn('id', $itemIds)->pluck('category_id');

        $covered = $promo->applicables()
            ->where(function ($q) use ($itemIds, $categoryIds) {
                $q->where(function ($q) use ($itemIds) {
                    $q->where('applicable_type', 'App\\Models\\Item')
                      ->whereIn('applicable_id', $itemIds);
                })->orWhere(function ($q) use ($categoryIds) {
                    $q->where('applicable_type', 'App\\Models\\Category')
                      ->whereIn('applicable_id', $categoryIds);
                });
            })
            ->exists();

        if (! $covered) {
            throw new PromotionNotApplicableException();
        }
    }
}
