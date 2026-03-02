---
name: reservas-analytics
description: Implement dashboard analytics endpoints for the Reservas admin panel. Use this skill when building reporting, metrics, or dashboard features. Covers SQL aggregations with selectRaw (single query per metric set), Redis caching with configurable TTL, month-over-month comparisons, no-show rates, peak hours, top menu items, weekly average ratings, and source conversion analytics.
argument-hint: "metric name or dashboard section"
---

# Dashboard Analytics — Reservas Admin Panel

## Core Principle: Single-Query Aggregations

Never run multiple separate queries for related metrics. Use conditional aggregations in a single `selectRaw`.

```php
// ❌ BAD — multiple queries
$totalConfirmed = Reservation::where('status', 'confirmed')->count();
$totalCancelled = Reservation::where('status', 'cancelled')->count();
$totalNoShow    = Reservation::where('status', 'no_show')->count();

// ✅ GOOD — single query with conditional aggregation
$statusStats = Reservation::query()
    ->forBusiness($businessId)
    ->whereBetween('scheduled_date', [$from, $to])
    ->selectRaw("
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    ")
    ->first();
```

## All Analytics Queries

### 1. Reservations by Status (date range)

```php
Reservation::forBusiness($businessId)
    ->whereBetween('scheduled_date', [$from, $to])
    ->selectRaw("
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    ")
    ->first();
```

### 2. Revenue — Current Month vs Previous Month

```php
Reservation::forBusiness($businessId)
    ->whereIn('status', ['completed'])
    ->selectRaw("
        SUM(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                 THEN total_amount ELSE 0 END)                             as current_month_total,
        COUNT(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                   THEN 1 END)                                             as current_month_count,
        AVG(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                 THEN total_amount END)                                    as current_month_avg,
        SUM(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                 THEN total_amount ELSE 0 END)                             as prev_month_total,
        COUNT(CASE WHEN MONTH(scheduled_date) = ? AND YEAR(scheduled_date) = ?
                   THEN 1 END)                                             as prev_month_count
    ", [
        $now->month, $now->year,         // current month total
        $now->month, $now->year,         // current month count
        $now->month, $now->year,         // current month avg
        $prev->month, $prev->year,       // prev month total
        $prev->month, $prev->year,       // prev month count
    ])
    ->first();
```

Money values come back as integers (centavos). Divide by 100 for display.

### 3. No-Show and Cancellation Rates

```php
$rates = Reservation::forBusiness($businessId)
    ->whereBetween('scheduled_date', [$from, $to])
    ->selectRaw("
        COUNT(*) as total,
        ROUND(100.0 * SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) / COUNT(*), 2) as no_show_rate,
        ROUND(100.0 * SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) as cancellation_rate
    ")
    ->first();
```

### 4. Top Pre-Ordered Menu Items

```php
ReservationItem::query()
    ->whereHas('reservation', fn($q) => $q->forBusiness($businessId)
        ->whereBetween('scheduled_date', [$from, $to]))
    ->join('items', 'reservation_items.item_id', '=', 'items.id')
    ->selectRaw("
        items.id,
        items.name,
        SUM(reservation_items.quantity)  as total_ordered,
        SUM(reservation_items.subtotal)  as total_revenue
    ")
    ->groupBy('items.id', 'items.name')
    ->orderByDesc('total_ordered')
    ->limit(10)
    ->get();
```

### 5. Peak Hours (grouped by hour of day)

```php
Reservation::forBusiness($businessId)
    ->whereBetween('scheduled_date', [$from, $to])
    ->whereIn('status', ['completed', 'confirmed'])
    ->selectRaw("
        HOUR(start_time) as hour,
        COUNT(*)         as reservation_count,
        SUM(party_size)  as total_guests
    ")
    ->groupByRaw("HOUR(start_time)")
    ->orderBy('reservation_count', 'desc')
    ->get();
```

### 6. Average Rating by Week (last 8 weeks)

```php
Review::query()
    ->whereHas('reservation', fn($q) => $q->forBusiness($businessId))
    ->where('status', ReviewStatus::Published->value)
    ->where('created_at', '>=', now()->subWeeks(8))
    ->selectRaw("
        YEARWEEK(created_at, 1)  as year_week,
        MIN(created_at)          as week_start,
        ROUND(AVG(rating), 2)    as average_rating,
        COUNT(*)                 as review_count
    ")
    ->groupByRaw("YEARWEEK(created_at, 1)")
    ->orderBy('year_week')
    ->get();
```

### 7. Source Conversion (by channel)

```php
Reservation::forBusiness($businessId)
    ->whereBetween('scheduled_date', [$from, $to])
    ->selectRaw("
        source,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 2) as conversion_rate
    ")
    ->groupBy('source')
    ->orderByDesc('total')
    ->get();
```

## Controller — Single Endpoint with All Metrics

```php
public function index(Request $request, Business $business): JsonResponse
{
    $this->authorize('viewAnalytics', $business);

    $data = $this->analyticsService->getDashboard(
        $business->id,
        $request->date('from', 'Y-m-d') ?? now()->startOfMonth(),
        $request->date('to', 'Y-m-d')   ?? now()->endOfMonth(),
    );

    return response()->json($data);
}
```

## Redis Caching Strategy

```php
// Cache key includes business ID + date range to avoid stale data
$cacheKey = "analytics:{$businessId}:{$from}:{$to}";
$ttl      = (int) config('analytics.cache_ttl', 300); // 5 minutes default

return Cache::remember($cacheKey, $ttl, function () use (...) {
    return $this->buildDashboardData(...);
});
```

Configure in `config/analytics.php`:

```php
return [
    'cache_ttl' => env('ANALYTICS_CACHE_TTL', 300), // seconds
];
```

**Invalidate cache** when new completed reservations or reviews are created:

```php
// In ReservationObserver::updated()
if ($reservation->wasChanged('status') && $reservation->status === ReservationStatus::Completed) {
    Cache::forget("analytics:{$reservation->item->business_id}:*");
    // Or use Cache::tags(['analytics', $businessId])->flush() if using Redis tags
}
```

## Date Range Defaults

| No params | Current month |
| `?from=2025-01-01&to=2025-01-31` | Explicit range |
| Max allowed range | 12 months (enforce in FormRequest) |

```php
// AnalyticsRequest
public function rules(): array
{
    return [
        'from' => ['nullable', 'date', 'before_or_equal:today'],
        'to'   => ['nullable', 'date', 'after_or_equal:from', 'before_or_equal:today'],
    ];
}

public function after(): array
{
    return [
        function (Validator $validator) {
            $from = $this->date('from') ?? now()->startOfMonth();
            $to   = $this->date('to')   ?? now()->endOfMonth();

            if ($from->diffInMonths($to) > 12) {
                $validator->errors()->add('to', 'El rango máximo es 12 meses.');
            }
        },
    ];
}
```

## Checklist

- [ ] Each metric group uses ONE query with conditional aggregations, not multiple queries
- [ ] All money sums come back as integers (centavos) — divide by 100 in Resource
- [ ] Revenue query uses `CASE WHEN` for month comparison in a single pass
- [ ] Peak hours grouped by `HOUR(start_time)`, ordered by count DESC
- [ ] Weekly ratings use `YEARWEEK` for proper ISO week grouping
- [ ] Source conversion includes both count and conversion_rate percentage
- [ ] Results cached in Redis with configurable TTL
- [ ] Cache key includes business_id and date range
- [ ] Date range defaults to current month
- [ ] Max date range enforced at 12 months in FormRequest
