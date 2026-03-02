<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePromotionRequest;
use App\Http\Resources\Api\V1\PromotionResource;
use App\Models\Business;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class PromotionController extends Controller
{
    public function index(Business $business): AnonymousResourceCollection
    {
        $promotions = $business->promotions()->valid()->paginate(20);

        return PromotionResource::collection($promotions);
    }

    public function store(StorePromotionRequest $request, Business $business): PromotionResource
    {
        $validated  = $request->safe()->except('apply_to');
        $promotion  = $business->promotions()->create($validated);

        foreach ($request->validated('apply_to', []) as $target) {
            $promotion->applicables()->create($target);
        }

        return PromotionResource::make($promotion);
    }

    public function show(Business $business, Promotion $promotion): PromotionResource
    {
        return PromotionResource::make($promotion);
    }

    public function update(StorePromotionRequest $request, Business $business, Promotion $promotion): PromotionResource
    {
        $promotion->update($request->safe()->except('apply_to'));

        return PromotionResource::make($promotion);
    }

    public function destroy(Business $business, Promotion $promotion): JsonResponse
    {
        $promotion->delete();

        return response()->json(['message' => 'Promoción eliminada.']);
    }
}
