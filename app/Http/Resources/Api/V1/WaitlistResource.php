<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class WaitlistResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'item_id'        => $this->item_id,
            'business_id'    => $this->business_id,
            'scheduled_date' => $this->scheduled_date->toDateString(),
            'start_time'     => $this->start_time,
            'party_size'     => $this->party_size,
            'position'       => $this->position,
            'notified_at'    => $this->notified_at?->toIso8601String(),
            'expires_at'     => $this->expires_at?->toIso8601String(),
            'item'           => ItemResource::make($this->whenLoaded('item')),
            'created_at'     => $this->created_at->toIso8601String(),
        ];
    }
}
