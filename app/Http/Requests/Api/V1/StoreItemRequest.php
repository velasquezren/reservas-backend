<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        // business_id resolved from route parameter
        $business = $this->route('business');

        return $this->user()?->business_id === $business?->id;
    }

    public function rules(): array
    {
        return [
            'category_id'      => ['required', 'ulid', 'exists:categories,id'],
            'name'             => ['required', 'string', 'max:150'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'image_url'        => ['nullable', 'url', 'max:500'],
            'type'             => ['required', Rule::enum(ItemType::class)],
            'status'           => ['nullable', Rule::enum(ItemStatus::class)],
            'base_price'       => ['required', 'integer', 'min:0'],  // centavos
            'capacity'         => ['nullable', 'integer', 'min:1'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:480'],
            'variants'         => ['nullable', 'array'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
        ];
    }
}
