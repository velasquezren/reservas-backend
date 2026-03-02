<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'confirmation_code'    => $this->confirmation_code,
            'status'               => $this->status->value,
            'status_label'         => $this->status->label(),
            'source'               => $this->source->value,
            'scheduled_date'       => $this->scheduled_date->toDateString(),
            'start_time'           => $this->start_time,
            'duration_minutes'     => $this->duration_minutes,
            'party_size'           => $this->party_size,
            'notes'                => $this->notes,
            'total_amount'         => $this->total_amount,
            'total_formatted'      => $this->total_amount_formatted,
            'discount_amount'      => $this->discount_amount,
            'discount_formatted'   => $this->discount_amount_formatted,
            'price_snapshot'       => $this->price_snapshot,
            'promo_snapshot'       => $this->promo_snapshot,
            'confirmed_at'         => $this->confirmed_at?->toIso8601String(),
            'cancelled_at'         => $this->cancelled_at?->toIso8601String(),
            'completed_at'         => $this->completed_at?->toIso8601String(),
            // Conditional relationships
            'item'                 => ItemResource::make($this->whenLoaded('item')),
            'user'                 => UserResource::make($this->whenLoaded('user')),
            'business'             => BusinessResource::make($this->whenLoaded('business')),
            'reservation_items'    => ReservationItemResource::collection(
                                         $this->whenLoaded('reservationItems')
                                     ),
            'review'               => ReviewResource::make($this->whenLoaded('review')),
            'created_at'           => $this->created_at->toIso8601String(),
            'updated_at'           => $this->updated_at->toIso8601String(),
        ];
    }
}
