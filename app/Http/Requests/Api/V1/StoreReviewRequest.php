<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only the user who owns the reservation may leave a review
        $reservation = $this->route('reservation');

        return $this->user()?->id === $reservation?->user_id;
    }

    public function rules(): array
    {
        return [
            'rating'    => ['required', 'integer', 'min:1', 'max:5'],
            'comment'   => ['nullable', 'string', 'max:1000'],
            'photos'    => ['nullable', 'array', 'max:3'],
            'photos.*'  => ['required', 'url', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'rating.min'    => 'La calificación mínima es 1 estrella.',
            'rating.max'    => 'La calificación máxima es 5 estrellas.',
            'photos.max'    => 'Se permiten máximo 3 fotos.',
            'photos.*.url'  => 'Cada foto debe ser una URL válida.',
        ];
    }
}
