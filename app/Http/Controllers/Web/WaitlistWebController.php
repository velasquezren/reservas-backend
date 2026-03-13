<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Waitlist;
use App\Services\WaitlistService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WaitlistWebController extends Controller
{
    public function __construct(
        private readonly WaitlistService $waitlistService,
    ) {}

    public function index(Request $request): Response
    {
        $bid = $request->user()->business_id;

        $waitlists = Waitlist::forBusiness($bid)
            ->with(['user:id,name,phone', 'item:id,name'])
            ->orderBy('scheduled_date')
            ->orderBy('start_time')
            ->orderBy('position')
            ->get()
            ->map(fn ($w) => [
                'id'             => $w->id,
                'scheduled_date' => $w->scheduled_date->format('Y-m-d'),
                'start_time'     => $w->start_time,
                'party_size'     => $w->party_size,
                'position'       => $w->position,
                'notified_at'    => $w->notified_at?->format('Y-m-d H:i'),
                'user'           => $w->user
                    ? ['name' => $w->user->name, 'phone' => $w->user->phone]
                    : null,
                'item'           => $w->item
                    ? ['name' => $w->item->name]
                    : null,
            ]);

        return Inertia::render('waitlists/index', [
            'waitlists' => $waitlists,
        ]);
    }

    public function destroy(Request $request, Waitlist $waitlist): RedirectResponse
    {
        abort_unless($waitlist->business_id === $request->user()->business_id, 403);

        $this->waitlistService->leave($waitlist);

        return back()->with('success', 'Entrada de espera eliminada.');
    }
}
