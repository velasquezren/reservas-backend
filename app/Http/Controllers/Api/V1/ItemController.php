<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreItemRequest;
use App\Http\Requests\Api\V1\UpdateItemRequest;
use App\Http\Resources\Api\V1\ItemResource;
use App\Models\Business;
use App\Models\Item;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ItemController extends Controller
{
    public function index(Business $business): AnonymousResourceCollection
    {
        $items = $business->items()->with('category', 'pricingRules')->paginate(30);

        return ItemResource::collection($items);
    }

    public function store(StoreItemRequest $request, Business $business): ItemResource
    {
        $item = $business->items()->create($request->validated());

        return ItemResource::make($item->load('category'));
    }

    public function show(Business $business, Item $item): ItemResource
    {
        $item->load('category', 'pricingRules');

        return ItemResource::make($item);
    }

    public function update(UpdateItemRequest $request, Business $business, Item $item): ItemResource
    {
        $item->update($request->validated());

        return ItemResource::make($item->load('category'));
    }

    public function destroy(Business $business, Item $item): JsonResponse
    {
        $item->delete();

        return response()->json(['message' => 'Ítem eliminado.']);
    }
}
