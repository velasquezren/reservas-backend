<?php

namespace App\Actions;

use App\Models\Promotion;
use Illuminate\Support\Carbon;

/**
 * Single-purpose atomic action: calculate discount and build promo_snapshot.
 *
 * Returns an array ready to be merged into the reservation creation payload.
 * The caller (ReservationService) is responsible for incrementing used_count
 * AFTER the DB transaction commits successfully.
 */
final class ApplyPromotionAction
{
    /**
     * @param  int  $baseAmountCentavos  Total reservation amount before discount.
     * @return array{
     *   discount_amount: int,
     *   total_amount: int,
     *   applied_promo_id: string,
     *   promo_snapshot: array
     * }
     */
    public function execute(Promotion $promo, int $baseAmountCentavos): array
    {
        $discount = $promo->discount_type->calculate($baseAmountCentavos, $promo->discount_value);

        return [
            'discount_amount'  => $discount,
            'total_amount'     => $baseAmountCentavos - $discount,
            'applied_promo_id' => $promo->id,
            'promo_snapshot'   => [
                'id'               => $promo->id,
                'code'             => $promo->code,
                'name'             => $promo->name,
                'discount_type'    => $promo->discount_type->value,
                'discount_value'   => $promo->discount_value,
                'discount_applied' => $discount,  // centavos
                'applied_at'       => Carbon::now('America/La_Paz')->toIso8601String(),
            ],
        ];
    }
}
