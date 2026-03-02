<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $business = $this->route('business');

        return $this->user()?->business_id === $business?->id;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'image_url'   => ['nullable', 'url', 'max:500'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
        ];
    }
}
