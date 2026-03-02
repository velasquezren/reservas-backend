<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Event */
class EventResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'business_id' => $this->business_id,
            'name'        => $this->name,
            'description' => $this->description,
            'starts_at'   => optional($this->starts_at)->toISOString(),
            'ends_at'     => optional($this->ends_at)->toISOString(),
            'is_active'   => $this->is_active,
            'banner_url'  => $this->banner_path
                ? url($this->banner_path)
                : null,

            'created_at'  => optional($this->created_at)->toISOString(),
            'updated_at'  => optional($this->updated_at)->toISOString(),
        ];
    }
}

