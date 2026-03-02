<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\BusinessResource;
use App\Models\Business;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class BusinessController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $businesses = Business::active()->with('categories')->paginate(20);

        return BusinessResource::collection($businesses);
    }

    public function show(Business $business): BusinessResource
    {
        $business->load('categories.items');

        return BusinessResource::make($business);
    }
}
