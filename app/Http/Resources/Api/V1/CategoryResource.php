<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'business_id' => $this->business_id,
            'name'        => $this->name,
            'slug'        => $this->slug,
            'description' => $this->description,
            'image_url'   => $this->image_url,
            'sort_order'  => $this->sort_order,
            'is_active'   => $this->is_active,
            'items'       => ItemResource::collection($this->whenLoaded('items')),
            'created_at'  => $this->created_at->toIso8601String(),
        ];
    }
}
