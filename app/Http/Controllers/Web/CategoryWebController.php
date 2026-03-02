<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\StoreCategoryRequest;
use App\Http\Requests\Web\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CategoryWebController extends Controller
{
    public function index(Request $request): Response
    {
        $bid = $request->user()->business_id;

        $categories = Category::forBusiness($bid)
            ->withCount('items')
            ->ordered()
            ->get()
            ->map(fn ($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'slug'        => $c->slug,
                'description' => $c->description,
                'is_active'   => $c->is_active,
                'sort_order'  => $c->sort_order,
                'items_count' => $c->items_count,
            ]);

        return Inertia::render('categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(StoreCategoryRequest $request): RedirectResponse
    {
        $data                = $request->validated();
        $data['business_id'] = $request->user()->business_id;
        $data['slug']        = Str::slug($data['name']);

        Category::create($data);

        return back()->with('success', 'Categoría creada.');
    }

    public function update(UpdateCategoryRequest $request, Category $category): RedirectResponse
    {
        abort_unless($category->business_id === $request->user()->business_id, 403);

        $data = $request->validated();

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);

        return back()->with('success', 'Categoría actualizada.');
    }

    public function destroy(Request $request, Category $category): RedirectResponse
    {
        abort_unless($category->business_id === $request->user()->business_id, 403);

        $category->delete();

        return back()->with('success', 'Categoría eliminada.');
    }
}
