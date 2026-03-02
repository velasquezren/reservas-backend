<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ReservationItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'item_id'          => $this->item_id,
            'quantity'         => $this->quantity,
            'unit_price'       => $this->unit_price,
            'subtotal'         => $this->subtotal,
            'subtotal_formatted' => $this->subtotal_formatted,
            'variant_snapshot' => $this->variant_snapshot,
            'notes'            => $this->notes,
            'item'             => ItemResource::make($this->whenLoaded('item')),
        ];
    }
}
