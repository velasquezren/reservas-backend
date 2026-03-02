<?php

namespace App\Providers;

use App\Models\Reservation;
use App\Models\Review;
use App\Observers\ReservationObserver;
use App\Observers\ReviewObserver;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->registerObservers();
    }

    /**
     * Register Eloquent model observers.
     *
     * ReservationObserver — generates confirmation_code on creating;
     *                       dispatches WaitlistNotificationJob on cancellation.
     * ReviewObserver      — recalculates businesses.average_rating / total_reviews
     *                       whenever a review is saved or deleted.
     */
    protected function registerObservers(): void
    {
        Reservation::observe(ReservationObserver::class);
        Review::observe(ReviewObserver::class);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
