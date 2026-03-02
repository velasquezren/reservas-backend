<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->business_id !== null;
    }

    public function rules(): array
    {
        return [
            'name'        => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'image_url'   => ['nullable', 'url', 'max:2048'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['boolean'],
        ];
    }
}
