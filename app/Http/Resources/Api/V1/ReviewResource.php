<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'business_id' => $this->business_id,
            'rating'      => $this->rating,
            'comment'     => $this->comment,
            'photos'      => $this->photos ?? [],
            'status'      => $this->status->value,
            'owner_reply' => $this->owner_reply,
            'replied_at'  => $this->replied_at?->toIso8601String(),
            // Conditional relationships
            'user'        => UserResource::make($this->whenLoaded('user')),
            'reservation' => ReservationResource::make($this->whenLoaded('reservation')),
            'created_at'  => $this->created_at->toIso8601String(),
            'updated_at'  => $this->updated_at->toIso8601String(),
        ];
    }
}
