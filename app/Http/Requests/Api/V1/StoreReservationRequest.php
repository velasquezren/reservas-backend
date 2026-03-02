<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\ReservationSource;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'item_id'              => ['required', 'ulid', 'exists:items,id'],
            'scheduled_date'       => ['required', 'date', 'after_or_equal:today'],
            'start_time'           => ['required', 'date_format:H:i'],
            'duration_minutes'     => ['nullable', 'integer', 'min:15', 'max:480'],
            'party_size'           => ['required', 'integer', 'min:1'],
            'notes'                => ['nullable', 'string', 'max:500'],
            'promo_code'           => ['nullable', 'string', 'max:50'],
            'source'               => ['nullable', Rule::enum(ReservationSource::class)],
            'items'                => ['nullable', 'array'],
            'items.*.item_id'      => ['required_with:items', 'ulid', 'exists:items,id'],
            'items.*.quantity'     => ['required_with:items', 'integer', 'min:1'],
            'items.*.notes'        => ['nullable', 'string', 'max:255'],
            'items.*.variant'      => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'scheduled_date.after_or_equal' => 'No se pueden hacer reservas en el pasado.',
            'party_size.min'                => 'El número de personas debe ser al menos 1.',
            'duration_minutes.min'          => 'La duración mínima es 15 minutos.',
            'duration_minutes.max'          => 'La duración máxima es 8 horas.',
        ];
    }
}
