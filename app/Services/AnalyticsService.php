<?php

namespace App\Services;

use App\Enums\ReviewStatus;
use App\Models\Reservation;
use App\Models\ReservationItem;
use App\Models\Review;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Dashboard analytics service.
 *
 * Every metric group uses ONE query with conditional aggregations (selectRaw).
 * Results are cached in Redis by businessId + date range for configurable TTL.
 * Money values are returned as integers (centavos); callers divide by 100.
 */
final class AnalyticsService
{
    public function getDashboard(string $businessId, Carbon $from, Carbon $to): array
    {
        $cacheKey = "analytics:{$businessId}:{$from->toDateString()}:{$to->toDateString()}";
        $ttl      = (int) config('analytics.cache_ttl', 300);

        if ($ttl === 0) {
            return $this->buildDashboard($businessId, $from, $to);
        }

        return Cache::remember($cacheKey, $ttl, fn () => $this->buildDashboard($businessId, $from, $to));
    }

    /** Forget cached analytics for a business (all date ranges). */
    public function forgetBusiness(string $businessId): void
    {
        // pattern-based deletion — works with Redis; no-op on file/array driver
        $pattern = "analytics:{$businessId}:*";
        if (method_exists(Cache::store(), 'deletePatternAsync')) {
            // phpredis / predis extension
            Cache::store()->deletePattern($pattern);
        }
        // fallback: individual cache keys cannot be glob-deleted on non-Redis drivers
        // Use Cache::tags(['analytics', $businessId])->flush() in a Redis-tags setup
    }

    // ─── Private builders ─────────────────────────────────────────────────────

    private function buildDashboard(string $businessId, Carbon $from, Carbon $to): array
    {
        return [
            'date_range'       => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'status_breakdown' => $this->statusBreakdown($businessId, $from, $to),
            'revenue'          => $this->revenue($businessId),
            'rates'            => $this->noShowAndCancellationRates($businessId, $from, $to),
            'top_items'        => $this->topMenuItems($businessId, $from, $to),
            'peak_hours'       => $this->peakHours($businessId, $from, $to),
            'weekly_ratings'   => $this->weeklyRatings($businessId),
            'source_breakdown' => $this->sourceConversion($businessId, $from, $to),
        ];
    }

    /**
     * 1. Reservation counts by status.
     * Single query with conditional aggregations.
     */
    private function statusBreakdown(string $businessId, Carbon $from, Carbon $to): array
    {
        $row = Reservation::forBusiness($businessId)
            ->whereBetween('scheduled_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw("
                COUNT(*)                                                                      AS total,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END)                        AS pending,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END)                        AS confirmed,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)                        AS completed,
                SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END)                        AS no_show,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)                        AS cancelled
            ")
            ->first();

        return [
            'total'     => (int) $row->total,
            'pending'   => (int) $row->pending,
            'confirmed' => (int) $row->confirmed,
            'completed' => (int) $row->completed,
            'no_show'   => (int) $row->no_show,
            'cancelled' => (int) $row->cancelled,
        ];
    }

    /**
     * 2. Revenue — current month vs previous month.
     * Single query comparing two months via conditional sums.
     */
    private function revenue(string $businessId): array
    {
        $now  = now();
        $prev = $now->copy()->subMonth();

        $row = Reservation::forBusiness($businessId)
            ->whereIn('status', ['completed'])
            ->selectRaw("
                SUM(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                         THEN total_amount ELSE 0 END)       AS current_month_total,
                COUNT(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                           THEN 1 END)                       AS current_month_count,
                AVG(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                         THEN total_amount END)              AS current_month_avg,
                SUM(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                         THEN total_amount ELSE 0 END)       AS prev_month_total,
                COUNT(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                           THEN 1 END)                       AS prev_month_count
            ", [
                $now->month,  $now->year,      // current total
                $now->month,  $now->year,      // current count
                $now->month,  $now->year,      // current avg
                $prev->month, $prev->year,     // prev total
                $prev->month, $prev->year,     // prev count
            ])
            ->first();

        $currentTotal = (int) $row->current_month_total;
        $prevTotal    = (int) $row->prev_month_total;
        $growth       = $prevTotal > 0
            ? round(($currentTotal - $prevTotal) / $prevTotal * 100, 2)
            : null;

        return [
            'current_month' => [
                'total_centavos' => $currentTotal,
                'total'   => round($currentTotal / 100, 2),
                'count'   => (int) $row->current_month_count,
                'avg'     => round((float) $row->current_month_avg / 100, 2),
            ],
            'prev_month' => [
                'total_centavos' => $prevTotal,
                'total'   => round($prevTotal / 100, 2),
                'count'   => (int) $row->prev_month_count,
            ],
            'growth_percent' => $growth,
        ];
    }

    /**
     * 3. No-show and cancellation rates (%).
     */
    private function noShowAndCancellationRates(string $businessId, Carbon $from, Carbon $to): array
    {
        $row = Reservation::forBusiness($businessId)
            ->whereBetween('scheduled_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw("
                COUNT(*) AS total,
                ROUND(100.0 * SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS no_show_rate,
                ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS cancellation_rate
            ")
            ->first();

        return [
            'total'             => (int) $row->total,
            'no_show_rate'      => (float) $row->no_show_rate,
            'cancellation_rate' => (float) $row->cancellation_rate,
        ];
    }

    /**
     * 4. Top 10 pre-ordered menu items by quantity.
     */
    private function topMenuItems(string $businessId, Carbon $from, Carbon $to): array
    {
        return ReservationItem::query()
            ->whereHas('reservation', fn ($q) => $q
                ->forBusiness($businessId)
                ->whereBetween('scheduled_date', [$from->toDateString(), $to->toDateString()])
            )
            ->join('items', 'reservation_items.item_id', '=', 'items.id')
            ->selectRaw("
                items.id,
                items.name,
                SUM(reservation_items.quantity)  AS total_ordered,
                SUM(reservation_items.subtotal)  AS total_revenue
            ")
            ->groupBy('items.id', 'items.name')
            ->orderByDesc('total_ordered')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'item_id'       => $row->id,
                'name'          => $row->name,
                'total_ordered' => (int) $row->total_ordered,
                'total_revenue' => round((int) $row->total_revenue / 100, 2),
            ])
            ->all();
    }

    /**
     * 5. Peak hours — grouped by hour of day, ordered by reservation count.
     */
    private function peakHours(string $businessId, Carbon $from, Carbon $to): array
    {
        return Reservation::forBusiness($businessId)
            ->whereBetween('scheduled_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('status', ['completed', 'confirmed'])
            ->selectRaw("
                HOUR(start_time)  AS hour,
                COUNT(*)          AS reservation_count,
                SUM(party_size)   AS total_guests
            ")
            ->groupByRaw("HOUR(start_time)")
            ->orderByDesc('reservation_count')
            ->get()
            ->map(fn ($row) => [
                'hour'              => (int) $row->hour,
                'reservation_count' => (int) $row->reservation_count,
                'total_guests'      => (int) $row->total_guests,
            ])
            ->all();
    }

    /**
     * 6. Average rating by ISO week — last 8 weeks.
     */
    private function weeklyRatings(string $businessId): array
    {
        return Review::query()
            ->whereHas('reservation', fn ($q) => $q->forBusiness($businessId))
            ->where('status', ReviewStatus::Published->value)
            ->where('created_at', '>=', now()->subWeeks(8))
            ->selectRaw("
                YEARWEEK(created_at, 1)   AS year_week,
                MIN(created_at)           AS week_start,
                ROUND(AVG(rating), 2)     AS average_rating,
                COUNT(*)                  AS review_count
            ")
            ->groupByRaw("YEARWEEK(created_at, 1)")
            ->orderBy('year_week')
            ->get()
            ->map(fn ($row) => [
                'year_week'      => (int) $row->year_week,
                'week_start'     => Carbon::parse($row->week_start)->toDateString(),
                'average_rating' => (float) $row->average_rating,
                'review_count'   => (int) $row->review_count,
            ])
            ->all();
    }

    /**
     * 7. Source conversion — count and completion rate per reservation source.
     */
    private function sourceConversion(string $businessId, Carbon $from, Carbon $to): array
    {
        return Reservation::forBusiness($businessId)
            ->whereBetween('scheduled_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw("
                source,
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS conversion_rate
            ")
            ->groupBy('source')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'source'          => $row->source,
                'total'           => (int) $row->total,
                'completed'       => (int) $row->completed,
                'conversion_rate' => (float) $row->conversion_rate,
            ])
            ->all();
    }
}
