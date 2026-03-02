<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PricingRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'item_id'                 => $this->item_id,
            'name'                    => $this->name,
            'override_price'          => $this->override_price,
            'override_price_formatted'=> $this->override_price_formatted,
            'specific_date'           => $this->specific_date?->toDateString(),
            'day_of_week'             => $this->day_of_week,
            'starts_at'               => $this->starts_at,
            'ends_at'                 => $this->ends_at,
            'is_active'               => $this->is_active,
        ];
    }
}
