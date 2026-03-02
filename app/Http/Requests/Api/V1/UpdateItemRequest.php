<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('item');

        return $this->user()?->business_id === $item?->business_id;
    }

    public function rules(): array
    {
        return [
            'category_id'      => ['sometimes', 'ulid', 'exists:categories,id'],
            'name'             => ['sometimes', 'string', 'max:150'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'image_url'        => ['nullable', 'url', 'max:500'],
            'type'             => ['sometimes', Rule::enum(ItemType::class)],
            'status'           => ['sometimes', Rule::enum(ItemStatus::class)],
            'base_price'       => ['sometimes', 'integer', 'min:0'],
            'capacity'         => ['nullable', 'integer', 'min:1'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:480'],
            'variants'         => ['nullable', 'array'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
        ];
    }
}
