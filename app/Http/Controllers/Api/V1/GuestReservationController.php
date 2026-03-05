<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\User;
use App\Services\ReservationService;
use App\Http\Resources\Api\V1\ReservationResource;
use Illuminate\Http\Request;

/**
 * Public reservation endpoint — no OTP, no password required.
 *
 * The client (Next.js) sends:
 *   - Customer contact info (name + phone, optionally email)
 *   - The specific table item_id they want to book
 *   - The date, time, and party size
 *   - Optionally: menu items they want to pre-order alongside the reservation
 *
 * The backend finds-or-creates the user by phone number (shadow account)
 * and passes everything to ReservationService::create().
 */
final class GuestReservationController extends Controller
{
    public function __construct(private readonly ReservationService $reservationService) {}

    public function store(Request $request, Business $business)
    {
        $validated = $request->validate([
            // ── Customer contact ──────────────────────────────────────────────
            'customer_name'    => ['required', 'string', 'max:255'],
            'customer_phone'   => ['required', 'string', 'max:20'],
            'customer_email'   => ['nullable', 'email', 'max:255'],

            // ── Table selection ───────────────────────────────────────────────
            // Next.js must show the list of tables (GET /items where type=reservable)
            // and send back the chosen table's item_id here.
            'item_id'          => ['required', 'ulid', 'exists:items,id'],

            // ── Slot ──────────────────────────────────────────────────────────
            'scheduled_date'   => ['required', 'date', 'after_or_equal:today'],
            'start_time'       => ['required', 'date_format:H:i'],
            'party_size'       => ['required', 'integer', 'min:1'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:480'],
            'notes'            => ['nullable', 'string', 'max:500'],
            'promo_code'       => ['nullable', 'string', 'max:50'],

            // ── Pre-order menu items (optional) ───────────────────────────────
            // These are menu_item type items (food/drinks) the client orders ahead.
            'items'            => ['nullable', 'array'],
            'items.*.item_id'  => ['required_with:items', 'ulid', 'exists:items,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.notes'    => ['nullable', 'string', 'max:255'],
        ], [
            'item_id.required'              => 'Debes seleccionar una mesa.',
            'item_id.exists'                => 'La mesa seleccionada no existe.',
            'scheduled_date.after_or_equal' => 'No se pueden hacer reservas en el pasado.',
            'party_size.min'                => 'El número de personas debe ser al menos 1.',
        ]);

        // ── Find or create user (by phone, no OTP needed) ────────────────────
        $user = User::firstOrCreate(
            ['phone' => $validated['customer_phone']],
            [
                'name'  => $validated['customer_name'],
                'email' => $validated['customer_email'] ?? null,
            ]
        );

        // Silently update user info if they provided new details
        $updates = [];
        if (!empty($validated['customer_email']) && $user->email !== $validated['customer_email']) {
            $updates['email'] = $validated['customer_email'];
        }
        if ($user->name !== $validated['customer_name']) {
            $updates['name'] = $validated['customer_name'];
        }
        if (!empty($updates)) {
            $user->update($updates);
        }

        // ── Delegate to ReservationService ────────────────────────────────────
        // ReservationService::create() handles:
        //  - Validating item is reservable and belongs to business
        //  - Checking party_size <= capacity
        //  - Anti-double-booking overlap detection
        //  - Pricing and promo code application
        //  - Attaching pre-order menu items
        $reservation = $this->reservationService->create($validated, $user);

        return ReservationResource::make($reservation->load('item', 'reservationItems'));
    }
}
