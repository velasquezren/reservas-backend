<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint — no authentication required
    }

    public function rules(): array
    {
        return [
            'phone'       => ['required', 'string', 'regex:/^\+591[0-9]{8}$/'],
            'code'        => ['required', 'string', 'digits:6'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'El número debe tener formato boliviano: +591 seguido de 8 dígitos.',
            'code.digits'  => 'El código OTP debe ser de 6 dígitos.',
        ];
    }
}
