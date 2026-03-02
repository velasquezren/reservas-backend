<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AnalyticsRequest;
use App\Models\Business;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;

final class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function index(AnalyticsRequest $request, Business $business): JsonResponse
    {
        $data = $this->analyticsService->getDashboard(
            $business->id,
            $request->dateFrom(),
            $request->dateTo(),
        );

        return response()->json($data);
    }
}
