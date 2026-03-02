<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'business_id'      => $this->business_id,
            'category_id'      => $this->category_id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'description'      => $this->description,
            'image_url'        => $this->image_url,
            'type'             => $this->type->value,
            'status'           => $this->status->value,
            'base_price'       => $this->base_price,
            'base_price_formatted' => $this->base_price_formatted,
            'capacity'         => $this->capacity,
            'duration_minutes' => $this->duration_minutes,
            'variants'         => $this->variants,
            'sort_order'       => $this->sort_order,
            // Conditionals
            'category'         => CategoryResource::make($this->whenLoaded('category')),
            'pricing_rules'    => PricingRuleResource::collection($this->whenLoaded('pricingRules')),
            'created_at'       => $this->created_at->toIso8601String(),
        ];
    }
}
