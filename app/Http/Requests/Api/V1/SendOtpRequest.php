<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class SendOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint — no authentication required
    }

    public function rules(): array
    {
        return [
            'phone' => ['required', 'string', 'regex:/^\+591[0-9]{8}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'El número debe tener formato boliviano: +591 seguido de 8 dígitos.',
        ];
    }
}
