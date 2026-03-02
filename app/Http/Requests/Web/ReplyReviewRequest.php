<?php

namespace App\Http\Requests\Web;

use Illuminate\Foundation\Http\FormRequest;

class ReplyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->business_id !== null;
    }

    public function rules(): array
    {
        return [
            'reply' => ['required', 'string', 'max:1000'],
        ];
    }
}
