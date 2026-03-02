<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreReservationRequest;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Reservation;
use App\Services\ReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ReservationController extends Controller
{
    public function __construct(private readonly ReservationService $reservationService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $reservations = $request->user()
            ->reservations()
            ->with('item', 'reservationItems', 'review')
            ->latest('scheduled_date')
            ->paginate(20);

        return ReservationResource::collection($reservations);
    }

    public function store(StoreReservationRequest $request): ReservationResource
    {
        $reservation = $this->reservationService->create($request->user(), $request->validated());

        return ReservationResource::make($reservation->load('item', 'reservationItems'));
    }

    public function show(Request $request, Reservation $reservation): ReservationResource
    {
        $reservation->load('item', 'business', 'reservationItems.item', 'review.user');

        return ReservationResource::make($reservation);
    }

    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $this->reservationService->cancel($reservation);

        return ReservationResource::make($reservation->fresh());
    }

    public function confirm(Request $request, Reservation $reservation): ReservationResource
    {
        $this->reservationService->confirm($reservation);

        return ReservationResource::make($reservation->fresh());
    }

    public function complete(Request $request, Reservation $reservation): ReservationResource
    {
        $this->reservationService->complete($reservation);

        return ReservationResource::make($reservation->fresh());
    }

    public function noShow(Request $request, Reservation $reservation): ReservationResource
    {
        $this->reservationService->markNoShow($reservation);

        return ReservationResource::make($reservation->fresh());
    }
}
