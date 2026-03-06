<?php
use App\Http\Controllers\Web\CategoryWebController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\ItemWebController;
use App\Http\Controllers\Web\EventWebController;
use App\Http\Controllers\Web\PromotionWebController;
use App\Http\Controllers\Web\ReservationWebController;
use App\Http\Controllers\Web\ReviewWebController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::redirect('/', '/login')->name('home');

// ─── OTP Authentication (REMOVED) ───────────────────────────────────────────────
// Using standard Laravel session auth instead.

// ─── Protected ────────────────────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Reservations
    Route::prefix('reservations')->name('reservations.')->group(function () {
        Route::get('/', [ReservationWebController::class, 'index'])->name('index');
        Route::post('/', [ReservationWebController::class, 'store'])->name('store');
        Route::get('calendar', [ReservationWebController::class, 'calendar'])->name('calendar');
        Route::get('api-events', [ReservationWebController::class, 'events'])->name('events');
        Route::patch('{reservation}/confirm', [ReservationWebController::class, 'confirm'])->name('confirm');
        Route::patch('{reservation}/complete', [ReservationWebController::class, 'complete'])->name('complete');
        Route::patch('{reservation}/no-show', [ReservationWebController::class, 'noShow'])->name('no-show');
        Route::patch('{reservation}/cancel', [ReservationWebController::class, 'cancel'])->name('cancel');
    });

    // Categories
    Route::prefix('categories')->name('categories.')->group(function () {
        Route::get('/', [CategoryWebController::class, 'index'])->name('index');
        Route::post('/', [CategoryWebController::class, 'store'])->name('store');
        Route::put('{category}', [CategoryWebController::class, 'update'])->name('update');
        Route::delete('{category}', [CategoryWebController::class, 'destroy'])->name('destroy');
    });

    // Items
    Route::prefix('items')->name('items.')->group(function () {
        Route::get('/', [ItemWebController::class, 'index'])->name('index');
        Route::post('/', [ItemWebController::class, 'store'])->name('store');
        Route::put('{item}', [ItemWebController::class, 'update'])->name('update');
        Route::delete('{item}', [ItemWebController::class, 'destroy'])->name('destroy');
    });

    // Promotions
    Route::prefix('promotions')->name('promotions.')->group(function () {
        Route::get('/', [PromotionWebController::class, 'index'])->name('index');
        Route::post('/', [PromotionWebController::class, 'store'])->name('store');
        Route::put('{promotion}', [PromotionWebController::class, 'update'])->name('update');
        Route::delete('{promotion}', [PromotionWebController::class, 'destroy'])->name('destroy');
    });

    // Events
    Route::prefix('events')->name('events.')->group(function () {
        Route::get('/', [EventWebController::class, 'index'])->name('index');
        Route::post('/', [EventWebController::class, 'store'])->name('store');
        Route::put('{event}', [EventWebController::class, 'update'])->name('update');
        Route::delete('{event}', [EventWebController::class, 'destroy'])->name('destroy');
    });

    // Reviews
    Route::prefix('reviews')->name('reviews.')->group(function () {
        Route::get('/', [ReviewWebController::class, 'index'])->name('index');
        Route::post('{review}/reply', [ReviewWebController::class, 'reply'])->name('reply');
        Route::patch('{review}/approve', [ReviewWebController::class, 'approve'])->name('approve');
        Route::patch('{review}/reject', [ReviewWebController::class, 'reject'])->name('reject');
    });

    // Users
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [\App\Http\Controllers\Web\UserWebController::class, 'index'])->name('index');
        Route::post('/', [\App\Http\Controllers\Web\UserWebController::class, 'store'])->name('store');
        Route::put('{user}', [\App\Http\Controllers\Web\UserWebController::class, 'update'])->name('update');
        Route::delete('{user}', [\App\Http\Controllers\Web\UserWebController::class, 'destroy'])->name('destroy');
    });
});

require __DIR__.'/settings.php';
