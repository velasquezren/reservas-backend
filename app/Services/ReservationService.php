<?php

namespace App\Services;

use App\Actions\ApplyPromotionAction;
use App\Actions\CompleteReservationAction;
use App\Actions\CreateReservationAction;
use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Enums\ReservationStatus;
use App\Exceptions\BusinessNotAcceptingReservationsException;
use App\Exceptions\CapacityExceededException;
use App\Exceptions\InvalidStatusTransitionException;
use App\Exceptions\ItemNotAvailableException;
use App\Exceptions\ItemNotReservableException;
use App\Exceptions\SlotNotAvailableException;
use App\Models\Item;
use App\Models\Reservation;
use App\Models\ReservationItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class ReservationService
{
    public function __construct(
        private readonly CreateReservationAction  $createAction,
        private readonly ApplyPromotionAction     $applyPromoAction,
        private readonly CompleteReservationAction $completeAction,
        private readonly PromotionService         $promotionService,
        private readonly PricingRuleService       $pricingRuleService,
    ) {}

    // ─── Create ───────────────────────────────────────────────────────────────

    /**
     * Full reservation creation flow inside a single DB transaction with
     * pessimistic locking:
     *
     *  1. Load + lock the item row
     *  2. Validate item is active, reservable, and business accepts reservations
     *  3. Validate party_size <= capacity
     *  4. Detect slot overlap with lockForUpdate()
     *  5. Resolve effective price via PricingRuleService
     *  6. Apply promo code if provided (PromotionService)
     *  7. Persist Reservation via CreateReservationAction
     *  8. Attach pre-order menu items
     *
     * After commit:
     *  9. Atomically increment promotion used_count (outside transaction)
     *
     * @throws BusinessNotAcceptingReservationsException
     * @throws ItemNotAvailableException
     * @throws ItemNotReservableException
     * @throws CapacityExceededException
     * @throws SlotNotAvailableException
     */
    public function create(array $validated, User $user): Reservation
    {
        $appliedPromo = null;

        $reservation = DB::transaction(function () use ($validated, $user, &$appliedPromo) {
            // ── 1. Lock the item row ──────────────────────────────────────────
            $item = Item::with('business')
                ->lockForUpdate()
                ->findOrFail($validated['item_id']);

            // ── 2. Validate item & business ───────────────────────────────────
            if (! $item->business->canAcceptReservations()) {
                throw new BusinessNotAcceptingReservationsException();
            }

            if ($item->status !== ItemStatus::Active) {
                throw new ItemNotAvailableException();
            }

            if ($item->type !== ItemType::Reservable) {
                throw new ItemNotReservableException();
            }

            // ── 3. Validate capacity ──────────────────────────────────────────
            if ($validated['party_size'] > $item->capacity) {
                throw new CapacityExceededException(
                    "El espacio tiene capacidad para {$item->capacity} personas. Solicitaste {$validated['party_size']}."
                );
            }

            // ── 4. Overlap detection ──────────────────────────────────────────
            if ($this->hasOverlap($item->id, $validated['scheduled_date'], $validated['start_time'], $validated['duration_minutes'] ?? $item->duration_minutes)) {
                throw new SlotNotAvailableException();
            }

            // ── 5. Resolve price ──────────────────────────────────────────────
            $effectivePrice = $this->pricingRuleService->resolve(
                $item,
                $validated['scheduled_date'],
                $validated['start_time'],
            );

            $priceSnapshot = [
                'item_id'         => $item->id,
                'item_name'       => $item->name,
                'base_price'      => $item->base_price,
                'effective_price' => $effectivePrice,
                'currency'        => 'BOB',
                'captured_at'     => Carbon::now('America/La_Paz')->toIso8601String(),
            ];

            // Calculate base total: reservable item price
            $baseTotal = $effectivePrice;

            // Add pre-order menu item costs to base total
            $menuItemsData = [];
            foreach ($validated['items'] ?? [] as $orderItem) {
                $menuItem = Item::where('type', ItemType::MenuItem->value)
                    ->lockForUpdate()
                    ->findOrFail($orderItem['item_id']);

                $subtotal       = $menuItem->base_price * $orderItem['quantity'];
                $baseTotal     += $subtotal;
                $menuItemsData[] = [
                    'item'      => $menuItem,
                    'quantity'  => $orderItem['quantity'],
                    'unitPrice' => $menuItem->base_price,
                    'notes'     => $orderItem['notes'] ?? null,
                    'variant'   => $orderItem['variant'] ?? null,
                ];
            }

            // ── 6. Apply promotion if provided ────────────────────────────────
            $priceData = [
                'total_amount'     => $baseTotal,
                'discount_amount'  => 0,
                'applied_promo_id' => null,
                'price_snapshot'   => $priceSnapshot,
                'promo_snapshot'   => null,
            ];

            if (! empty($validated['promo_code'])) {
                $allItemIds = collect($menuItemsData)->pluck('item.id')->push($item->id)->all();

                $appliedPromo = $this->promotionService->findAndValidate(
                    $validated['promo_code'],
                    $item->business_id,
                    $user,
                    $allItemIds,
                );

                $promoResult = $this->applyPromoAction->execute($appliedPromo, $baseTotal);
                $priceData   = array_merge($priceData, $promoResult);
            }

            // ── 7. Create reservation ─────────────────────────────────────────
            $reservation = $this->createAction->execute($user, $item, $validated, $priceData);

            // ── 8. Attach pre-order menu items ────────────────────────────────
            foreach ($menuItemsData as $entry) {
                ReservationItem::create([
                    'reservation_id'   => $reservation->id,
                    'item_id'          => $entry['item']->id,
                    'quantity'         => $entry['quantity'],
                    'unit_price'       => $entry['unitPrice'],
                    'variant_snapshot' => $entry['variant'],
                    'notes'            => $entry['notes'],
                ]);
            }

            return $reservation;
        });

        // ── 9. Increment promotion counter AFTER commit ───────────────────────
        if ($appliedPromo) {
            $this->promotionService->incrementUsage($appliedPromo);
        }

        return $reservation->load('reservationItems');
    }

    // ─── Confirm ──────────────────────────────────────────────────────────────

    /**
     * @throws InvalidStatusTransitionException
     */
    public function confirm(Reservation $reservation): Reservation
    {
        return $this->transition($reservation, ReservationStatus::Confirmed, 'confirmed_at');
    }

    // ─── Cancel ───────────────────────────────────────────────────────────────

    /**
     * @throws InvalidStatusTransitionException
     */
    public function cancel(Reservation $reservation): Reservation
    {
        return $this->transition($reservation, ReservationStatus::Cancelled, 'cancelled_at');
        // ReservationObserver::updated() dispatches WaitlistNotificationJob
    }

    // ─── Complete ─────────────────────────────────────────────────────────────

    /**
     * @throws InvalidStatusTransitionException
     */
    public function complete(Reservation $reservation): Reservation
    {
        return $this->completeAction->execute($reservation);
    }

    // ─── No-Show ──────────────────────────────────────────────────────────────

    /**
     * @throws InvalidStatusTransitionException
     */
    public function markNoShow(Reservation $reservation): Reservation
    {
        return $this->transition($reservation, ReservationStatus::NoShow, null);
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * Generalized status transition with timestamp column update.
     * Validates canTransitionTo() before persisting.
     *
     * @throws InvalidStatusTransitionException
     */
    private function transition(
        Reservation      $reservation,
        ReservationStatus $newStatus,
        ?string           $timestampColumn,
    ): Reservation {
        if (! $reservation->status->canTransitionTo($newStatus)) {
            throw new InvalidStatusTransitionException(
                "No se puede pasar de '{$reservation->status->label()}' a '{$newStatus->label()}'"
            );
        }

        $data = ['status' => $newStatus];

        if ($timestampColumn) {
            $data[$timestampColumn] = Carbon::now('America/La_Paz');
        }

        $reservation->update($data);

        return $reservation->fresh();
    }

    /**
     * Overlap check using a computed end-time comparison.
     * MUST be called inside a DB::transaction() (lockForUpdate context).
     */
    private function hasOverlap(
        string $itemId,
        string $date,
        string $startTime,
        int    $durationMinutes,
        ?string $excludeId = null,
    ): bool {
        $newEnd = Carbon::parse($startTime)
            ->addMinutes($durationMinutes)
            ->format('H:i:s');

        return Reservation::query()
            ->where('item_id', $itemId)
            ->where('scheduled_date', $date)
            ->whereIn('status', [
                ReservationStatus::Pending->value,
                ReservationStatus::Confirmed->value,
            ])
            ->when($excludeId, fn (Builder $q) => $q->where('id', '!=', $excludeId))
            ->where(function (Builder $q) use ($startTime, $newEnd, $date) {
                // Overlap condition: existing.start < new.end AND existing.end > new.start
                $q->whereRaw('start_time < ?', [$newEnd])
                  ->whereRaw(
                      "DATE_ADD(CONCAT(scheduled_date, ' ', start_time), INTERVAL duration_minutes MINUTE) > ?",
                      ["{$date} {$startTime}"]
                  );
            })
            ->lockForUpdate()
            ->exists();
    }
}
