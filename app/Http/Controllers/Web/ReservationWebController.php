<?php

namespace App\Http\Controllers\Web;

use App\Enums\ItemType;
use App\Enums\ReservationSource;
use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Web\StoreReservationRequest;
use App\Models\Item;
use App\Models\Reservation;
use App\Models\User;
use App\Services\ReservationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReservationWebController extends Controller
{
    public function __construct(
        private readonly ReservationService $reservationService
    ) {}

    public function index(Request $request): Response
    {
        $bid   = $request->user()->business_id;
        $today = now()->toDateString();

        $base = fn () => Reservation::forBusiness($bid);

        $stats = [
            'today'       => $base()->whereDate('scheduled_date', $today)->count(),
            'pending'     => $base()->where('status', ReservationStatus::Pending)->count(),
            'confirmed'   => $base()->where('status', ReservationStatus::Confirmed)->count(),
            'total_today' => $base()->whereDate('scheduled_date', $today)->sum('total_amount'),
        ];

        $query = Reservation::forBusiness($bid)
            ->with(['user:id,name,phone', 'item:id,name'])
            ->orderByDesc('scheduled_date')
            ->orderByDesc('start_time');

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($date = $request->get('date')) {
            $query->whereDate('scheduled_date', $date);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('confirmation_code', 'like', "%{$search}%")
                  ->orWhereHas('user', fn ($u) => $u
                      ->where('name', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                  );
            });
        }

        // ── Data for the manual reservation creation dialog ────────────────
        $reservableItems = Item::forBusiness($bid)
            ->where('type', ItemType::Reservable)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'capacity', 'duration_minutes', 'base_price'])
            ->map(fn ($i) => [
                'id'               => $i->id,
                'name'             => $i->name,
                'capacity'         => $i->capacity,
                'duration_minutes' => $i->duration_minutes,
                'base_price'       => $i->base_price,
            ]);

        $menuItems = Item::forBusiness($bid)
            ->where('type', ItemType::MenuItem)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'base_price'])
            ->map(fn ($i) => [
                'id'         => $i->id,
                'name'       => $i->name,
                'base_price' => $i->base_price,
            ]);

        $clients = User::where('business_id', $bid)
            ->orderBy('name')
            ->get(['id', 'name', 'phone'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'phone' => $u->phone]);

        return Inertia::render('reservations/index', [
            'reservations' => $query->paginate(20)->withQueryString()->through(
                fn ($r) => [
                    'id'                => $r->id,
                    'confirmation_code' => $r->confirmation_code,
                    'status'            => $r->status->value,
                    'source'            => $r->source->value,
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
                ]
            ),
            'filters'          => $request->only(['status', 'date', 'search']),
            'stats'            => $stats,
            'reservable_items' => $reservableItems,
            'menu_items'       => $menuItems,
            'clients'          => $clients,
        ]);
    }

    public function store(StoreReservationRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $validated['source'] = ReservationSource::WalkIn->value;
        $validated['business_id'] = $request->user()->business_id;

        // Ensure the client and item belong to this business
        $user = User::where('id', $validated['user_id'])
            ->where('business_id', $validated['business_id'])
            ->firstOrFail();

        try {
            $this->reservationService->create($validated, $user);
        } catch (\Exception $e) {
            return back()->withErrors(['form' => $e->getMessage()]);
        }

        return back()->with('success', 'Reserva creada correctamente.');
    }

    public function calendar(Request $request): Response
    {
        return Inertia::render('reservations/calendar');
    }

    public function events(Request $request): \Illuminate\Http\JsonResponse
    {
        $bid = $request->user()->business_id;
        $start = $request->input('start');
        $end = $request->input('end');

        $query = Reservation::forBusiness($bid)
            ->select([
                'id',
                'user_id',
                'status',
                'scheduled_date',
                'start_time',
                'party_size',
                'confirmation_code'
            ])
            ->with(['user:id,name']);

        if ($start) {
            $query->where('scheduled_date', '>=', date('Y-m-d', strtotime($start)));
        }
        if ($end) {
            $query->where('scheduled_date', '<=', date('Y-m-d', strtotime($end)));
        }

        $reservations = $query->get();

        $events = $reservations->map(function ($r) {
            $color = match($r->status->value) {
                'pending' => '#f59e0b',
                'confirmed' => '#3b82f6',
                'completed' => '#10b981',
                'cancelled' => '#ef4444',
                'no_show' => '#6b7280',
                default => '#3b82f6',
            };

            $date = $r->scheduled_date->format('Y-m-d');
            // Assuming start_time is a string or castable to string, formatted as H:i:s or H:i
            $time = substr((string) $r->start_time, 0, 5);
            $startStr = "{$date}T{$time}:00";

            return [
                'id' => $r->id,
                'title' => substr($r->start_time, 0, 5) . ' | ' . ($r->user->name ?? 'Cliente') . ' (' . $r->party_size . ' pax)',
                'start' => $startStr,
                'backgroundColor' => $color,
                'borderColor' => $color,
                'textColor' => '#ffffff',
                'url' => route('reservations.index', ['search' => $r->confirmation_code]),
                'extendedProps' => [
                    'status' => $r->status->value,
                    'party_size' => $r->party_size,
                ]
            ];
        });

        return response()->json($events);
    }

    public function confirm(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorizeAccess($request, $reservation);
        $this->reservationService->confirm($reservation);

        return back()->with('success', 'Reserva confirmada.');
    }

    public function complete(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorizeAccess($request, $reservation);
        $this->reservationService->complete($reservation);

        return back()->with('success', 'Reserva completada.');
    }

    public function noShow(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorizeAccess($request, $reservation);
        $this->reservationService->markNoShow($reservation);

        return back()->with('success', 'Marcado como no presentado.');
    }

    public function cancel(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorizeAccess($request, $reservation);
        $this->reservationService->cancel($reservation);

        return back()->with('success', 'Reserva cancelada.');
    }

    private function authorizeAccess(Request $request, Reservation $reservation): void
    {
        abort_unless($reservation->business_id === $request->user()->business_id, 403);
    }
}
