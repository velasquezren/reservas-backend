<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReplyReviewRequest;
use App\Http\Requests\Api\V1\StoreReviewRequest;
use App\Http\Resources\Api\V1\ReviewResource;
use App\Models\Reservation;
use App\Models\Review;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Request;

final class ReviewController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $reviews = Review::published()
            ->where('business_id', $request->query('business_id'))
            ->with('user')
            ->latest()
            ->paginate(20);

        return ReviewResource::collection($reviews);
    }

    public function store(StoreReviewRequest $request, Reservation $reservation): ReviewResource
    {
        $review = $reservation->review()->create(array_merge(
            $request->validated(),
            [
                'user_id'     => $request->user()->id,
                'business_id' => $reservation->business_id,
            ]
        ));

        return ReviewResource::make($review);
    }

    public function reply(ReplyReviewRequest $request, Review $review): ReviewResource
    {
        $review->update([
            'owner_reply' => $request->validated('reply'),
            'replied_at'  => now(),
        ]);

        return ReviewResource::make($review->fresh());
    }
}
