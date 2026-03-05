<?php

namespace App\Http\Controllers\Web;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $bid   = $request->user()->business_id;
        $today = Carbon::today('America/La_Paz');
        $prevMonth = $today->copy()->subMonth();

        // ─── Core KPI stats (single queries each, index-friendly) ─────────
        $stats = [
            'today_reservations' => Reservation::forBusiness($bid)
                ->whereDate('scheduled_date', $today->toDateString())
                ->count(),
            'today_guests' => (int) Reservation::forBusiness($bid)
                ->whereDate('scheduled_date', $today->toDateString())
                ->whereIn('status', [ReservationStatus::Pending, ReservationStatus::Confirmed])
                ->sum('party_size'),
            'pending' => Reservation::forBusiness($bid)
                ->where('status', ReservationStatus::Pending)
                ->count(),
            'upcoming_confirmed' => Reservation::forBusiness($bid)
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('scheduled_date', '>=', $today->toDateString())
                ->count(),
            'revenue_month' => (int) Reservation::forBusiness($bid)
                ->where('status', ReservationStatus::Completed)
                ->whereMonth('scheduled_date', $today->month)
                ->whereYear('scheduled_date', $today->year)
                ->sum('total_amount'),
            'total_month' => Reservation::forBusiness($bid)
                ->whereMonth('scheduled_date', $today->month)
                ->whereYear('scheduled_date', $today->year)
                ->count(),
            'avg_rating' => round((float) Review::where('business_id', $bid)
                ->where('status', 'published')
                ->avg('rating'), 1),
        ];

        // ─── Revenue Month-over-Month ─────────────────────────────────────
        $revenueMoM = Reservation::forBusiness($bid)
            ->whereIn('status', [ReservationStatus::Completed])
            ->selectRaw("
                SUM(CASE WHEN DATE(scheduled_date) >= ? AND DATE(scheduled_date) <= ?
                         THEN total_amount ELSE 0 END) as current_month_total,
                SUM(CASE WHEN DATE(scheduled_date) >= ? AND DATE(scheduled_date) <= ?
                         THEN total_amount ELSE 0 END) as prev_month_total
            ", [
                $today->copy()->startOfMonth()->toDateString(), $today->copy()->endOfMonth()->toDateString(),
                $prevMonth->copy()->startOfMonth()->toDateString(), $prevMonth->copy()->endOfMonth()->toDateString(),
            ])
            ->first();

        // ─── Peak Hours (last 30 days) ────────────────────────────────────
        $peakHours = Reservation::forBusiness($bid)
            ->whereDate('scheduled_date', '>=', $today->copy()->subDays(30)->toDateString())
            ->whereIn('status', [ReservationStatus::Completed, ReservationStatus::Confirmed])
            ->selectRaw("
                SUBSTR(start_time, 1, 2) as hour,
                COUNT(*)         as reservation_count,
                SUM(party_size)  as total_guests
            ")
            ->groupByRaw("SUBSTR(start_time, 1, 2)")
            ->orderBy('hour')
            ->get();

        // ─── Status Breakdown (this month) ────────────────────────────────
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

        // ─── Top Clients (by completed reservations count) ────────────────
        $topClients = Reservation::forBusiness($bid)
            ->where('status', ReservationStatus::Completed)
            ->select('user_id')
            ->selectRaw('COUNT(*) as total_reservations')
            ->selectRaw('SUM(total_amount) as total_spent')
            ->selectRaw('SUM(party_size) as total_guests')
            ->selectRaw('MAX(scheduled_date) as last_visit')
            ->groupBy('user_id')
            ->orderByDesc('total_reservations')
            ->limit(5)
            ->with('user:id,name,phone')
            ->get()
            ->map(fn ($row) => [
                'user' => $row->user ? ['name' => $row->user->name, 'phone' => $row->user->phone] : null,
                'total_reservations' => (int) $row->total_reservations,
                'total_spent' => (int) $row->total_spent,
                'total_guests' => (int) $row->total_guests,
                'last_visit' => $row->last_visit,
            ]);

        // ─── Recent Reservations ──────────────────────────────────────────
        $recent = Reservation::forBusiness($bid)
            ->select(['id', 'user_id', 'item_id', 'confirmation_code', 'status', 'scheduled_date', 'start_time', 'party_size', 'total_amount', 'created_at'])
            ->with(['user:id,name,phone', 'item:id,name'])
            ->orderByDesc('created_at')
            ->limit(5)
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
            'top_clients'      => $topClients,
        ]);
    }
}
