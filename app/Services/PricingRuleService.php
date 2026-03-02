<?php

namespace App\Services;

use App\Models\Item;
use Illuminate\Support\Carbon;

/**
 * Resolves the effective price for a reservable item at a given date/time,
 * applying the highest-specificity matching pricing rule.
 *
 * Precedence (most → least specific):
 *   1. specific_date  — exact calendar date (carnival, holidays)
 *   2. day_of_week + time range
 *   3. day_of_week only
 *   4. time range only
 *   5. item.base_price (fallback)
 */
final class PricingRuleService
{
    public function resolve(Item $item, string $date, string $time): int
    {
        $carbon = Carbon::parse("{$date} {$time}", 'America/La_Paz');

        // Eager-load rules once, apply matching logic in PHP to avoid N+1
        $rules = $item->pricingRules()->active()->get();

        // We use PHP-side matching so we can compute specificity without extra columns
        $matched = $rules
            ->filter(fn ($rule) => $this->matches($rule, $carbon))
            ->sortByDesc(fn ($rule) => $this->specificity($rule))
            ->first();

        return $matched?->override_price ?? $item->base_price;
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private function matches($rule, Carbon $carbon): bool
    {
        // Specific date check
        if ($rule->specific_date !== null) {
            return $rule->specific_date->isSameDay($carbon);
        }

        // Day-of-week check (0 = Sunday, 6 = Saturday)
        $dayMatch  = $rule->day_of_week === null
            || $rule->day_of_week === (int) $carbon->dayOfWeek;

        // Time range check
        $timeMatch = true;
        if ($rule->starts_at !== null && $rule->ends_at !== null) {
            $t         = $carbon->format('H:i:s');
            $timeMatch = $t >= $rule->starts_at && $t <= $rule->ends_at;
        }

        return $dayMatch && $timeMatch;
    }

    /**
     * Higher number = higher specificity = wins when multiple rules match.
     */
    private function specificity($rule): int
    {
        if ($rule->specific_date !== null) {
            return 100; // tier 1
        }

        if ($rule->day_of_week !== null && $rule->starts_at !== null) {
            return 50;  // tier 2
        }

        if ($rule->day_of_week !== null) {
            return 30;  // tier 3
        }

        if ($rule->starts_at !== null) {
            return 10;  // tier 4
        }

        return 0;
    }
}
