<?php

namespace App\Http\Controllers\Web;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
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
        $bid = $request->user()->business_id;

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

        $banners = \App\Models\Promotion::forBusiness($bid)
            ->where('is_active', true)
            ->whereNotNull('banner_path')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'url' => \Illuminate\Support\Facades\Storage::url($p->banner_path)
            ]);

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
            'filters' => $request->only(['status', 'date']),
            'banners' => $banners,
        ]);
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
