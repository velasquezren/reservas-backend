<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class BusinessResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'slug'           => $this->slug,
            'phone'          => $this->phone,
            'email'          => $this->email,
            'address'        => $this->address,
            'timezone'       => $this->timezone,
            'status'         => $this->status->value,
            'description'    => $this->description,
            'logo_url'       => $this->logo_url,
            'average_rating' => (float) $this->average_rating,
            'total_reviews'  => $this->total_reviews,
            // Conditional relationship inclusion
            'categories'     => CategoryResource::collection($this->whenLoaded('categories')),
            'created_at'     => $this->created_at->toIso8601String(),
        ];
    }
}
