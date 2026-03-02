<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'phone'               => $this->phone,
            'email'               => $this->email,
            'phone_verified_at'   => $this->phone_verified_at?->toIso8601String(),
            'created_at'          => $this->created_at->toIso8601String(),
        ];
    }
}
