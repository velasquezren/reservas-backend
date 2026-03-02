<?php

namespace App\Http\Controllers\Web;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $bid   = $request->user()->business_id;
        $today = Carbon::today('America/La_Paz');
        $prevMonth = $today->copy()->subMonth();

        $stats = [
            'today_reservations' => Reservation::forBusiness($bid)
                ->whereDate('scheduled_date', $today)
                ->count(),
            'pending' => Reservation::forBusiness($bid)
                ->where('status', ReservationStatus::Pending)
                ->count(),
            'upcoming_confirmed' => Reservation::forBusiness($bid)
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('scheduled_date', '>=', $today)
                ->count(),
            'revenue_month' => Reservation::forBusiness($bid)
                ->where('status', ReservationStatus::Completed)
                ->whereMonth('scheduled_date', $today->month)
                ->whereYear('scheduled_date', $today->year)
                ->sum('total_amount'),
        ];

        // Analytics - Revenue MoM
        $revenueMoM = Reservation::forBusiness($bid)
            ->whereIn('status', [ReservationStatus::Completed])
            ->selectRaw("
                SUM(CASE WHEN scheduled_date >= ? AND scheduled_date <= ?
                         THEN total_amount ELSE 0 END)                             as current_month_total,
                SUM(CASE WHEN scheduled_date >= ? AND scheduled_date <= ?
                         THEN total_amount ELSE 0 END)                             as prev_month_total
            ", [
                $today->copy()->startOfMonth()->toDateString(), $today->copy()->endOfMonth()->toDateString(),
                $prevMonth->copy()->startOfMonth()->toDateString(), $prevMonth->copy()->endOfMonth()->toDateString(),
            ])
            ->first();

        // Analytics - Peak Hours (last 30 days)
        $peakHours = Reservation::forBusiness($bid)
            ->where('scheduled_date', '>=', $today->copy()->subDays(30))
            ->whereIn('status', [ReservationStatus::Completed, ReservationStatus::Confirmed])
            ->selectRaw("
                SUBSTR(start_time, 1, 2) as hour,
                COUNT(*)         as reservation_count,
                SUM(party_size)  as total_guests
            ")
            ->groupByRaw("SUBSTR(start_time, 1, 2)")
            ->orderBy('hour')
            ->get();

        // Analytics - Reservation Statuses Breakdown
        $statusBreakdown = Reservation::forBusiness($bid)
            ->whereMonth('scheduled_date', $today->month)
            ->whereYear('scheduled_date', $today->year)
            ->selectRaw("
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'no_show'   THEN 1 ELSE 0 END) as no_show,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            ")
            ->first();

        $recent = Reservation::forBusiness($bid)
            ->with(['user:id,name,phone', 'item:id,name'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get()
            ->map(fn ($r) => [
                'id'                => $r->id,
                'confirmation_code' => $r->confirmation_code,
                'status'            => $r->status->value,
                'scheduled_date'    => $r->scheduled_date->format('Y-m-d'),
                'start_time'        => substr((string) $r->start_time, 0, 5),
                'party_size'        => $r->party_size,
                'total_amount'      => $r->total_amount,
                'user'              => $r->user
                    ? ['name' => $r->user->name, 'phone' => $r->user->phone]
                    : null,
                'item'              => $r->item
                    ? ['name' => $r->item->name]
                    : null,
            ]);

        return Inertia::render('dashboard', [
            'stats'            => $stats,
            'recent'           => $recent,
            'revenue_mom'      => $revenueMoM,
            'peak_hours'       => $peakHours,
            'status_breakdown' => $statusBreakdown,
        ]);
    }
}
