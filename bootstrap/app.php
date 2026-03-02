<?php

use App\Exceptions\BusinessNotAcceptingReservationsException;
use App\Exceptions\CapacityExceededException;
use App\Exceptions\InvalidOtpException;
use App\Exceptions\InvalidStatusTransitionException;
use App\Exceptions\ItemNotAvailableException;
use App\Exceptions\ItemNotReservableException;
use App\Exceptions\PromotionExhaustedException;
use App\Exceptions\PromotionNotApplicableException;
use App\Exceptions\PromotionNotFoundException;
use App\Exceptions\PromotionUserLimitException;
use App\Exceptions\SlotNotAvailableException;
use App\Exceptions\TooManyOtpAttemptsException;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ── OTP ──────────────────────────────────────────────────────────────
        $exceptions->render(fn (TooManyOtpAttemptsException $e) =>
            response()->json(['message' => $e->getMessage()], 429)
        );

        $exceptions->render(fn (InvalidOtpException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        // ── Reservations ─────────────────────────────────────────────────────
        $exceptions->render(fn (BusinessNotAcceptingReservationsException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (ItemNotAvailableException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (ItemNotReservableException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (CapacityExceededException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (SlotNotAvailableException $e) =>
            response()->json(['message' => $e->getMessage()], 409)
        );

        $exceptions->render(fn (InvalidStatusTransitionException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        // ── Promotions ────────────────────────────────────────────────────────
        $exceptions->render(fn (PromotionNotFoundException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (PromotionExhaustedException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (PromotionUserLimitException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );

        $exceptions->render(fn (PromotionNotApplicableException $e) =>
            response()->json(['message' => $e->getMessage()], 422)
        );
    })->create();

