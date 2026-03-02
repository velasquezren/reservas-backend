<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEventRequest;
use App\Models\Event;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EventWebController extends Controller
{
    public function index(Request $request): Response
    {
        $bid   = $request->user()->business_id;
        $today = now()->toDateString();

        $all = Event::query()
            ->where('business_id', $bid)
            ->orderByDesc('starts_at')
            ->get();

        $events = $all->map(fn (Event $e) => [
            'id'          => $e->id,
            'business_id' => $e->business_id,
            'name'        => $e->name,
            'description' => $e->description,
            'starts_at'   => $e->starts_at?->format('Y-m-d'),
            'ends_at'     => $e->ends_at?->format('Y-m-d'),
            'is_active'   => $e->is_active,
            'banner_url'  => $e->banner_path ? Storage::url($e->banner_path) : null,
        ]);

        $stats = [
            'total'       => $all->count(),
            'active'      => $all->where('is_active', true)
                                 ->filter(fn ($e) => !$e->ends_at || $e->ends_at->gte(now()))
                                 ->count(),
            'upcoming'    => $all->where('is_active', true)
                                 ->filter(fn ($e) => $e->starts_at && $e->starts_at->gt(now()))
                                 ->count(),
            'with_banner' => $all->whereNotNull('banner_path')->count(),
        ];

        $banners = $all
            ->where('is_active', true)
            ->filter(fn ($e) => !$e->ends_at || $e->ends_at->gte(now()))
            ->whereNotNull('banner_path')
            ->values()
            ->map(fn ($e) => [
                'id'   => $e->id,
                'name' => $e->name,
                'url'  => Storage::url($e->banner_path),
            ]);

        return Inertia::render('events/index', [
            'events'  => $events,
            'stats'   => $stats,
            'banners' => $banners,
        ]);
    }

    public function store(StoreEventRequest $request): RedirectResponse
    {
        $data                = $request->validated();
        $data['business_id'] = $request->user()->business_id;

        if ($request->hasFile('banner_path')) {
            $data['banner_path'] = $request->file('banner_path')->store('events/banners', 'public');
        }

        Event::create($data);

        return back()->with('success', 'Evento creado.');
    }

    public function update(StoreEventRequest $request, Event $event): RedirectResponse
    {
        abort_unless($event->business_id === $request->user()->business_id, 403);

        $data = $request->validated();

        if ($request->hasFile('banner_path')) {
            if ($event->banner_path) {
                Storage::disk('public')->delete($event->banner_path);
            }
            $data['banner_path'] = $request->file('banner_path')->store('events/banners', 'public');
        }

        $event->update($data);

        return back()->with('success', 'Evento actualizado.');
    }

    public function destroy(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->business_id === $request->user()->business_id, 403);

        if ($event->banner_path) {
            Storage::disk('public')->delete($event->banner_path);
        }

        $event->delete();

        return back()->with('success', 'Evento eliminado.');
    }
}

