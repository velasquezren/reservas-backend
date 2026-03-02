<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->business_id !== null;
    }

    public function rules(): array
    {
        return [
            'name'             => ['sometimes', 'string', 'max:100'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'type'             => ['sometimes', 'in:reservable,menu_item'],
            'status'           => ['sometimes', 'in:active,inactive,draft'],
            'base_price'       => ['sometimes', 'integer', 'min:0'],
            'capacity'         => ['nullable', 'integer', 'min:1'],
            'duration_minutes' => ['nullable', 'integer', 'min:15'],
            'category_id'      => ['nullable', 'ulid', 'exists:categories,id'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
            'image_url'        => ['nullable', 'url', 'max:2048'],
        ];
    }
}
