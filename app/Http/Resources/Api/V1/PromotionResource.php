<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PromotionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'business_id'        => $this->business_id,
            'name'               => $this->name,
            'description'        => $this->description,
            'code'               => $this->code,
            'discount_type'      => $this->discount_type->value,
            'discount_value'     => $this->discount_value,
            'starts_at'          => $this->starts_at->toIso8601String(),
            'ends_at'            => $this->ends_at->toIso8601String(),
            'max_uses'           => $this->max_uses,
            'max_uses_per_user'  => $this->max_uses_per_user,
            'current_uses'       => $this->current_uses,
            'is_active'          => $this->is_active,
            'is_valid'           => $this->isCurrentlyValid(),
            'created_at'         => $this->created_at->toIso8601String(),
        ];
    }
}
