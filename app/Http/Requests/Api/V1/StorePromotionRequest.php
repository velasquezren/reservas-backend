<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\DiscountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StorePromotionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $business = $this->route('business');

        return $this->user()?->business_id === $business?->id;
    }

    public function rules(): array
    {
        return [
            'name'              => ['required', 'string', 'max:150'],
            'description'       => ['nullable', 'string', 'max:500'],
            'code'              => ['nullable', 'string', 'max:50', 'alpha_dash'],
            'discount_type'     => ['required', Rule::enum(DiscountType::class)],
            'discount_value'    => ['required', 'integer', 'min:1'],
            'starts_at'         => ['required', 'date'],
            'ends_at'           => ['required', 'date', 'after:starts_at'],
            'max_uses'          => ['nullable', 'integer', 'min:1'],
            'max_uses_per_user' => ['nullable', 'integer', 'min:1'],
            'is_active'         => ['nullable', 'boolean'],
            // Optional applicability targets
            'apply_to'              => ['nullable', 'array'],
            'apply_to.*.type'       => ['required_with:apply_to', Rule::in(['item', 'category'])],
            'apply_to.*.id'         => ['required_with:apply_to', 'ulid'],
        ];
    }

    public function messages(): array
    {
        return [
            'ends_at.after'           => 'La fecha de fin debe ser posterior a la fecha de inicio.',
            'discount_value.min'      => 'El valor del descuento debe ser mayor a 0.',
        ];
    }
}
