<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

final class ReplyReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only the business owner may reply to reviews of their business
        $review = $this->route('review');

        return $review && $this->user()?->business_id === $review->business_id;
    }

    public function rules(): array
    {
        return [
            'owner_reply' => ['required', 'string', 'min:10', 'max:1000'],
        ];
    }
}
