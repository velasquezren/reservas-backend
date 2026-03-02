<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Web\StorePromotionRequest;
use App\Http\Requests\Web\UpdatePromotionRequest;
use App\Models\Promotion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PromotionWebController extends Controller
{
    public function index(Request $request): Response
    {
        $bid   = $request->user()->business_id;
        $today = now()->toDateString();

        $all = Promotion::forBusiness($bid)->orderByDesc('created_at')->get();

        $promotions = $all->map(fn ($p) => [
            'id'                => $p->id,
            'name'              => $p->name,
            'description'       => $p->description,
            'code'              => $p->code,
            'discount_type'     => $p->discount_type?->value,
            'discount_value'    => $p->discount_value,
            'starts_at'         => $p->starts_at?->format('Y-m-d'),
            'ends_at'           => $p->ends_at?->format('Y-m-d'),
            'max_uses'          => $p->max_uses,
            'max_uses_per_user' => $p->max_uses_per_user,
            'current_uses'      => $p->current_uses,
            'is_active'         => $p->is_active,
            'banner_url'        => $p->banner_path
                ? \Illuminate\Support\Facades\Storage::url($p->banner_path)
                : null,
        ]);

        $stats = [
            'total'       => $all->count(),
            'active'      => $all->where('is_active', true)
                                 ->filter(fn ($p) => !$p->ends_at || $p->ends_at->gte(now()))
                                 ->count(),
            'total_uses'  => $all->sum('current_uses'),
            'with_banner' => $all->whereNotNull('banner_path')->count(),
        ];

        $banners = $all
            ->where('is_active', true)
            ->filter(fn ($p) => !$p->ends_at || $p->ends_at->gte(now()))
            ->whereNotNull('banner_path')
            ->values()
            ->map(fn ($p) => [
                'id'  => $p->id,
                'name'=> $p->name,
                'url' => \Illuminate\Support\Facades\Storage::url($p->banner_path),
            ]);

        return Inertia::render('promotions/index', [
            'promotions' => $promotions,
            'stats'      => $stats,
            'banners'    => $banners,
        ]);
    }

    public function store(StorePromotionRequest $request): RedirectResponse
    {
        $data                = $request->validated();
        $data['business_id'] = $request->user()->business_id;
        $data['current_uses'] = 0;

        if ($request->hasFile('banner_path')) {
            $data['banner_path'] = $request->file('banner_path')->store('promotions', 'public');
        }

        Promotion::create($data);

        return back()->with('success', 'Promoción creada.');
    }

    public function update(UpdatePromotionRequest $request, Promotion $promotion): RedirectResponse
    {
        abort_unless($promotion->business_id === $request->user()->business_id, 403);

        $data = $request->validated();

        if ($request->hasFile('banner_path')) {
            if ($promotion->banner_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($promotion->banner_path);
            }
            $data['banner_path'] = $request->file('banner_path')->store('promotions', 'public');
        }

        $promotion->update($data);

        return back()->with('success', 'Promoción actualizada.');
    }

    public function destroy(Request $request, Promotion $promotion): RedirectResponse
    {
        abort_unless($promotion->business_id === $request->user()->business_id, 403);

        if ($promotion->banner_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($promotion->banner_path);
        }

        $promotion->delete();

        return back()->with('success', 'Promoción eliminada.');
    }
}
