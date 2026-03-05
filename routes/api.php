<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\BusinessController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\ItemController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\OtpController;
use App\Http\Controllers\Api\V1\PromotionController;
use App\Http\Controllers\Api\V1\ReservationController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\WaitlistController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {

    // ─── Authentication (public) ──────────────────────────────────────────────
    // ─── Authentication (public) ──────────────────────────────────────────────
    // TODO: Standard email/password endpoints if necessary via API.

    // ─── Public Catalogue ─────────────────────────────────────────────────────
    Route::get('businesses',          [BusinessController::class, 'index'])->name('businesses.index');
    Route::get('businesses/{business}', [BusinessController::class, 'show'])->name('businesses.show');

    Route::get('businesses/{business}/categories',          [CategoryController::class, 'index'])->name('categories.index');
    Route::get('businesses/{business}/categories/{category}', [CategoryController::class, 'show'])->name('categories.show');

    Route::get('businesses/{business}/items',      [ItemController::class, 'index'])->name('items.index');
    Route::get('businesses/{business}/items/{item}', [ItemController::class, 'show'])->name('items.show');

    // Guest reservation flow (No OTP required, auto-assign table)
    Route::post('businesses/{business}/reservations', [\App\Http\Controllers\Api\V1\GuestReservationController::class, 'store'])->name('reservations.guest.store');

    Route::get('reviews', [ReviewController::class, 'index'])->name('reviews.index');


    // ─── Protected (Customer + Business owner) ────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Reservations
        Route::get('reservations',                        [ReservationController::class, 'index'])->name('reservations.index');
        Route::post('reservations',                       [ReservationController::class, 'store'])->name('reservations.store');
        Route::get('reservations/{reservation}',          [ReservationController::class, 'show'])->name('reservations.show');
        Route::patch('reservations/{reservation}/cancel', [ReservationController::class, 'cancel'])->name('reservations.cancel');

        // Reviews
        Route::post('reservations/{reservation}/reviews',  [ReviewController::class, 'store'])->name('reviews.store');

        // Waitlist
        Route::post('items/{item}/waitlist',               [WaitlistController::class, 'join'])->name('waitlist.join');
        Route::delete('items/{item}/waitlist',             [WaitlistController::class, 'leave'])->name('waitlist.leave');

        // ─── Business admin routes ─────────────────────────────────────────
        Route::prefix('admin/businesses/{business}')->name('admin.')->group(function () {

            // Categories CRUD
            Route::post('categories',                             [CategoryController::class, 'store'])->name('categories.store');
            Route::put('categories/{category}',                   [CategoryController::class, 'update'])->name('categories.update');
            Route::delete('categories/{category}',                [CategoryController::class, 'destroy'])->name('categories.destroy');

            // Items CRUD
            Route::post('items',                                  [ItemController::class, 'store'])->name('items.store');
            Route::put('items/{item}',                            [ItemController::class, 'update'])->name('items.update');
            Route::delete('items/{item}',                         [ItemController::class, 'destroy'])->name('items.destroy');

            // Promotions CRUD
            Route::get('promotions',                              [PromotionController::class, 'index'])->name('promotions.index');
            Route::post('promotions',                             [PromotionController::class, 'store'])->name('promotions.store');
            Route::get('promotions/{promotion}',                  [PromotionController::class, 'show'])->name('promotions.show');
            Route::put('promotions/{promotion}',                  [PromotionController::class, 'update'])->name('promotions.update');
            Route::delete('promotions/{promotion}',               [PromotionController::class, 'destroy'])->name('promotions.destroy');

            // Events CRUD
            Route::get('events',                                  [EventController::class, 'index'])->name('events.index');
            Route::post('events',                                 [EventController::class, 'store'])->name('events.store');
            Route::get('events/{event}',                          [EventController::class, 'show'])->name('events.show');
            Route::put('events/{event}',                          [EventController::class, 'update'])->name('events.update');
            Route::delete('events/{event}',                       [EventController::class, 'destroy'])->name('events.destroy');

            // Reservation management (business side)
            Route::patch('reservations/{reservation}/confirm',    [ReservationController::class, 'confirm'])->name('reservations.confirm');
            Route::patch('reservations/{reservation}/complete',   [ReservationController::class, 'complete'])->name('reservations.complete');
            Route::patch('reservations/{reservation}/no-show',    [ReservationController::class, 'noShow'])->name('reservations.no-show');

            // Review moderation
            Route::post('reviews/{review}/reply', [ReviewController::class, 'reply'])->name('reviews.reply');

            // Analytics dashboard
            Route::get('analytics', [AnalyticsController::class, 'index'])->name('analytics.index');
        });
    });
});
