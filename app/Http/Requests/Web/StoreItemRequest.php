<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->business_id !== null;
    }

    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:100'],
            'description'      => ['nullable', 'string', 'max:1000'],
            'type'             => ['required', 'in:reservable,menu_item'],
            'status'           => ['required', 'in:active,inactive,draft'],
            'base_price'       => ['required', 'integer', 'min:0'],
            'capacity'         => ['required_if:type,reservable', 'nullable', 'integer', 'min:1'],
            'duration_minutes' => ['required_if:type,reservable', 'nullable', 'integer', 'min:15'],
            'category_id'      => ['nullable', 'ulid', 'exists:categories,id'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
            'image_url'        => ['nullable', 'url', 'max:2048'],
        ];
    }
}
