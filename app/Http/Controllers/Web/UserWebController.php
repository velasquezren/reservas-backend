<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserWebController extends Controller
{
    public function index(Request $request)
    {
        $users = \App\Models\User::where('business_id', $request->user()->business_id)
            ->latest()
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'created_at' => $u->created_at->format('Y-m-d'),
            ]);

        return \Inertia\Inertia::render('users/index', [
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:50',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $validated['business_id'] = $request->user()->business_id;
        $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);

        \App\Models\User::create($validated);

        return back()->with('success', 'Usuario creado correctamente.');
    }

    public function update(Request $request, \App\Models\User $user)
    {
        abort_unless($user->business_id === $request->user()->business_id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:50',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return back()->with('success', 'Usuario actualizado correctamente.');
    }

    public function destroy(Request $request, \App\Models\User $user)
    {
        abort_unless($user->business_id === $request->user()->business_id, 403);

        if ($request->user()->id === $user->id) {
            return back()->withErrors(['error' => 'No puedes eliminarte a ti mismo.']);
        }

        $user->delete();

        return back()->with('success', 'Usuario eliminado.');
    }
}
