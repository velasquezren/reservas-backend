<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class JoinWaitlistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'start_time'     => ['required', 'date_format:H:i'],
            'party_size'     => ['required', 'integer', 'min:1'],
        ];
    }
}
