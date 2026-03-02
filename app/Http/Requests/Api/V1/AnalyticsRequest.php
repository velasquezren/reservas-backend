<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

final class AnalyticsRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var \App\Models\User $user */
        $user     = $this->user();
        $business = $this->route('business');

        return $user !== null && $user->business_id === $business->id;
    }

    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date', 'before_or_equal:today'],
            'to'   => ['nullable', 'date', 'after_or_equal:from', 'before_or_equal:today'],
        ];
    }

    /** Enforce maximum 12-month date range. */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $from = $this->date('from') ?? now()->startOfMonth();
                $to   = $this->date('to')   ?? now()->endOfMonth();

                if ($from->diffInMonths($to) > 12) {
                    $validator->errors()->add('to', 'El rango máximo permitido es de 12 meses.');
                }
            },
        ];
    }

    /** Resolved date range (defaults to current calendar month). */
    public function dateFrom(): \Illuminate\Support\Carbon
    {
        return $this->date('from') ?? now()->startOfMonth();
    }

    public function dateTo(): \Illuminate\Support\Carbon
    {
        return $this->date('to') ?? now()->endOfMonth();
    }
}
