<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->business_id !== null;
    }

    public function rules(): array
    {
        return [
            'user_id'          => ['required', 'ulid', 'exists:users,id'],
            'item_id'          => ['required', 'ulid', 'exists:items,id'],
            'scheduled_date'   => ['required', 'date_format:Y-m-d'],
            'start_time'       => ['required', 'date_format:H:i'],
            'party_size'       => ['required', 'integer', 'min:1'],
            'notes'            => ['nullable', 'string', 'max:500'],
            'items'            => ['nullable', 'array'],
            'items.*.item_id'  => ['required_with:items', 'ulid', 'exists:items,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.notes'    => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required'     => 'Debes seleccionar un cliente.',
            'item_id.required'     => 'Debes seleccionar una mesa o espacio.',
            'scheduled_date.required' => 'La fecha es obligatoria.',
            'start_time.required'  => 'La hora de inicio es obligatoria.',
            'party_size.required'  => 'El número de personas es obligatorio.',
            'party_size.min'       => 'Debe haber al menos 1 persona.',
        ];
    }
}
