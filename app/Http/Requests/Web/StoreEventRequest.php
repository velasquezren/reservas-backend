<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'starts_at'   => ['required', 'date'],
            'ends_at'     => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active'   => ['sometimes', 'boolean'],
            'banner_path' => ['nullable', 'image', 'max:4096'],
        ];
    }
}
