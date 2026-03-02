<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEventRequest;
use App\Http\Resources\Api\V1\EventResource;
use App\Models\Business;
use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class EventController extends Controller
{
    public function index(Business $business): AnonymousResourceCollection
    {
        $events = $business->events()
            ->latest('starts_at')
            ->paginate(20);

        return EventResource::collection($events);
    }

    public function store(StoreEventRequest $request, Business $business): EventResource
    {
        $data = $request->validated();

        if ($request->hasFile('banner_path')) {
            $path = $request->file('banner_path')->store('events/banners', 'public');
            $data['banner_path'] = 'storage/' . $path;
        }

        $event = $business->events()->create($data);

        return EventResource::make($event);
    }

    public function show(Business $business, Event $event): EventResource
    {
        return EventResource::make($event);
    }

    public function update(StoreEventRequest $request, Business $business, Event $event): EventResource
    {
        $data = $request->validated();

        if ($request->hasFile('banner_path')) {
            $path = $request->file('banner_path')->store('events/banners', 'public');
            $data['banner_path'] = 'storage/' . $path;
        }

        $event->update($data);

        return EventResource::make($event);
    }

    public function destroy(Business $business, Event $event): JsonResponse
    {
        $event->delete();

        return response()->json(['message' => 'Evento eliminado.']);
    }
}

