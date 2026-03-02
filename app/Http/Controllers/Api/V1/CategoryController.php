<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCategoryRequest;
use App\Http\Resources\Api\V1\CategoryResource;
use App\Models\Business;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CategoryController extends Controller
{
    public function index(Business $business): AnonymousResourceCollection
    {
        $categories = $business->categories()->with('items')->orderBy('sort_order')->get();

        return CategoryResource::collection($categories);
    }

    public function store(StoreCategoryRequest $request, Business $business): CategoryResource
    {
        $category = $business->categories()->create($request->validated());

        return CategoryResource::make($category);
    }

    public function show(Business $business, Category $category): CategoryResource
    {
        $category->load('items');

        return CategoryResource::make($category);
    }

    public function update(StoreCategoryRequest $request, Business $business, Category $category): CategoryResource
    {
        $category->update($request->validated());

        return CategoryResource::make($category);
    }

    public function destroy(Business $business, Category $category): JsonResponse
    {
        $category->delete();

        return response()->json(['message' => 'Categoría eliminada.']);
    }
}
