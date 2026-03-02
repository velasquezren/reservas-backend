<?php

namespace App\Http\Controllers\Web;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Web\ReplyReviewRequest;
use App\Models\Review;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReviewWebController extends Controller
{
    public function index(Request $request): Response
    {
        $bid = $request->user()->business_id;

        $reviews = Review::forBusiness($bid)
            ->with(['user:id,name,phone', 'reservation:id,confirmation_code'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($r) => [
                'id'          => $r->id,
                'rating'      => $r->rating,
                'comment'     => $r->comment,
                'status'      => $r->status->value,
                'owner_reply' => $r->owner_reply,
                'replied_at'  => $r->replied_at?->format('Y-m-d H:i'),
                'user'        => $r->user
                    ? ['name' => $r->user->name, 'phone' => $r->user->phone]
                    : null,
                'reservation' => $r->reservation
                    ? ['confirmation_code' => $r->reservation->confirmation_code]
                    : null,
                'created_at'  => $r->created_at->format('Y-m-d H:i'),
            ]);

        return Inertia::render('reviews/index', [
            'reviews' => $reviews,
        ]);
    }

    public function reply(ReplyReviewRequest $request, Review $review): RedirectResponse
    {
        abort_unless($review->business_id === $request->user()->business_id, 403);

        $review->update([
            'owner_reply' => $request->validated('reply'),
            'replied_at'  => now(),
        ]);

        return back()->with('success', 'Respuesta publicada.');
    }

    public function approve(Request $request, Review $review): RedirectResponse
    {
        abort_unless($review->business_id === $request->user()->business_id, 403);

        $review->update(['status' => ReviewStatus::Published]);

        return back()->with('success', 'Reseña publicada.');
    }

    public function reject(Request $request, Review $review): RedirectResponse
    {
        abort_unless($review->business_id === $request->user()->business_id, 403);

        $review->update(['status' => ReviewStatus::Rejected]);

        return back()->with('success', 'Reseña rechazada.');
    }
}
