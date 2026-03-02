<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\StoreItemRequest;
use App\Http\Requests\Web\UpdateItemRequest;
use App\Models\Category;
use App\Models\Item;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ItemWebController extends Controller
{
    public function index(Request $request): Response
    {
        $bid = $request->user()->business_id;

        $items = Item::forBusiness($bid)
            ->with('category:id,name')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn ($i) => [
                'id'               => $i->id,
                'name'             => $i->name,
                'description'      => $i->description,
                'type'             => $i->type->value,
                'status'           => $i->status->value,
                'base_price'       => $i->base_price,
                'capacity'         => $i->capacity,
                'duration_minutes' => $i->duration_minutes,
                'category'         => $i->category
                    ? ['id' => $i->category->id, 'name' => $i->category->name]
                    : null,
            ]);

        $categories = Category::forBusiness($bid)
            ->active()
            ->ordered()
            ->get(['id', 'name']);

        return Inertia::render('items/index', [
            'items'      => $items,
            'categories' => $categories,
        ]);
    }

    public function store(StoreItemRequest $request): RedirectResponse
    {
        $data                = $request->validated();
        $data['business_id'] = $request->user()->business_id;
        $data['slug']        = Str::slug($data['name']) . '-' . Str::random(4);

        Item::create($data);

        return back()->with('success', 'Ítem creado.');
    }

    public function update(UpdateItemRequest $request, Item $item): RedirectResponse
    {
        abort_unless($item->business_id === $request->user()->business_id, 403);

        $item->update($request->validated());

        return back()->with('success', 'Ítem actualizado.');
    }

    public function destroy(Request $request, Item $item): RedirectResponse
    {
        abort_unless($item->business_id === $request->user()->business_id, 403);

        $item->delete();

        return back()->with('success', 'Ítem eliminado.');
    }
}
