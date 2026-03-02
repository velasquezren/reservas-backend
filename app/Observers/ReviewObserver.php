<?php

namespace App\Observers;

use App\Enums\ReviewStatus;
use App\Models\Review;
use App\Services\AnalyticsService;

class ReviewObserver
{
    /**
     * Recalculate denormalized rating aggregates on the business
     * whenever a review is saved (created or updated).
     */
    public function saved(Review $review): void
    {
        $this->recalculate($review);
    }

    /**
     * Recalculate after a review is deleted (rejected reviews cleaned up).
     */
    public function deleted(Review $review): void
    {
        $this->recalculate($review);
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private function recalculate(Review $review): void
    {
        $business = $review->business;

        // Only published reviews count toward the public rating
        $stats = $business
            ->reviews()
            ->published()
            ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as total')
            ->first();

        // withoutTimestamps prevents touching updated_at on the business row
        \App\Models\Business::withoutTimestamps(fn () => $business->update([
            'average_rating' => round((float) ($stats->avg_rating ?? 0), 2),
            'total_reviews'  => (int) ($stats->total ?? 0),
        ]));

        // Invalidate analytics cache so weekly_ratings stays fresh.
        app(AnalyticsService::class)->forgetBusiness($business->id);
    }
}
