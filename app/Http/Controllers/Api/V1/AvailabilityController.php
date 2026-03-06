<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Enums\ItemType;
use App\Enums\ReservationStatus;
use App\Models\Business;
use App\Models\Reservation;
use App\Http\Resources\Api\V1\ItemResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Public endpoint — returns availability status of all reservable items
 * (tables) for a given business on a specific date/time.
 *
 * Next.js uses this to show which tables are free vs occupied in real-time.
 */
final class AvailabilityController extends Controller
{
    public function index(Request $request, Business $business): JsonResponse
    {
        $validated = $request->validate([
            'date'       => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'duration'   => ['nullable', 'integer', 'min:15', 'max:480'],
            'party_size' => ['nullable', 'integer', 'min:1'],
        ]);

        $date      = $validated['date'];
        $startTime = $validated['start_time'];
        $duration  = $validated['duration'] ?? null;
        $partySize = isset($validated['party_size']) ? (int) $validated['party_size'] : null;

        // 1. Load all active reservable items (tables) for this business
        $tables = $business->items()
            ->where('type', ItemType::Reservable->value)
            ->active()
            ->with('category', 'pricingRules')
            ->orderBy('sort_order')
            ->get();

        // 2. Load all active reservations for this business on the requested date
        $reservations = Reservation::query()
            ->where('business_id', $business->id)
            ->whereDate('scheduled_date', $date)
            ->whereIn('status', [
                ReservationStatus::Pending->value,
                ReservationStatus::Confirmed->value,
            ])
            ->get(['id', 'item_id', 'start_time', 'duration_minutes']);

        // 3. For each table, determine if the requested slot overlaps
        $newStart = Carbon::parse("{$date} {$startTime}");

        $result = $tables->map(function ($table) use ($reservations, $newStart, $duration, $partySize, $date, $startTime) {
            $slotDuration = $duration ?? $table->duration_minutes ?? 90;
            $newEnd = (clone $newStart)->addMinutes($slotDuration);

            // Check overlap with existing reservations for this table
            $tableReservations = $reservations->where('item_id', $table->id);
            $isOccupied = false;

            foreach ($tableReservations as $res) {
                $existingStart = Carbon::parse("{$date} {$res->start_time}");
                $existingEnd   = (clone $existingStart)->addMinutes($res->duration_minutes);

                if ($existingStart < $newEnd && $existingEnd > $newStart) {
                    $isOccupied = true;
                    break;
                }
            }

            // Check capacity vs party_size
            $fitsParty = $partySize === null || $table->capacity >= $partySize;

            return [
                'table'        => ItemResource::make($table),
                'is_available' => ! $isOccupied && $fitsParty,
                'is_occupied'  => $isOccupied,
                'fits_party'   => $fitsParty,
                'slot'         => [
                    'date'             => $date,
                    'start_time'       => $startTime,
                    'duration_minutes' => $slotDuration,
                    'end_time'         => $newEnd->format('H:i'),
                ],
            ];
        });

        $available = $result->where('is_available', true)->count();
        $total     = $result->count();

        return response()->json([
            'data'    => $result->values(),
            'summary' => [
                'total_tables'     => $total,
                'available_tables' => $available,
                'occupied_tables'  => $total - $available,
                'date'             => $date,
                'start_time'       => $startTime,
            ],
        ]);
    }
}
