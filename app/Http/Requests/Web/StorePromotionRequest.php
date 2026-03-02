<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class StorePromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->business_id !== null;
    }

    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:100'],
            'description'       => ['nullable', 'string', 'max:500'],
            'code'              => ['required', 'string', 'max:20', 'alpha_num'],
            'discount_type'     => ['nullable', 'in:percentage,fixed_amount'],
            'discount_value'    => ['nullable', 'integer', 'min:0'],
            'starts_at'         => ['required', 'date'],
            'ends_at'           => ['nullable', 'date', 'after:starts_at'],
            'max_uses'          => ['nullable', 'integer', 'min:1'],
            'max_uses_per_user' => ['nullable', 'integer', 'min:1'],
            'is_active'         => ['boolean'],
            'banner_path'       => ['nullable', 'image', 'max:2048'], // 2MB Max
        ];
    }
}
