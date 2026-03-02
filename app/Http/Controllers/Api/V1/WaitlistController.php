<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\JoinWaitlistRequest;
use App\Http\Resources\Api\V1\WaitlistResource;
use App\Models\Item;
use App\Services\WaitlistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WaitlistController extends Controller
{
    public function __construct(private readonly WaitlistService $waitlistService) {}

    public function join(JoinWaitlistRequest $request, Item $item): WaitlistResource
    {
        $entry = $this->waitlistService->join($item, $request->user(), $request->validated());

        return WaitlistResource::make($entry->load('item'));
    }

    public function leave(Request $request, Item $item): JsonResponse
    {
        $this->waitlistService->leave($item, $request->user());

        return response()->json(['message' => 'Removido de la lista de espera.']);
    }
}
