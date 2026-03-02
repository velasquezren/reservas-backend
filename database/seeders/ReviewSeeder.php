<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\Reservation;
use App\Models\Review;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $business = Business::first();
        if (!$business) return;

        $reservations = Reservation::where('status', ReservationStatus::Completed->value)
            ->where('business_id', $business->id)
            ->get();

        if ($reservations->isEmpty()) return;

        $statuses = [
            ReviewStatus::Published,
            ReviewStatus::Published,
            ReviewStatus::Published,
            ReviewStatus::PendingModeration,
            ReviewStatus::Rejected,
        ];

        foreach ($reservations as $reservation) {
            // ~70% de reviews
            if (rand(1, 10) > 7) {
                continue;
            }

            $hasComment = rand(0, 1);
            $rating = rand(3, 5);
            if (rand(1, 10) === 1) { // A veces uno malo
                $rating = rand(1, 2);
            }

            $status = $statuses[array_rand($statuses)];
            $isPublished = $status === ReviewStatus::Published;
            $hasReply = $isPublished && rand(0, 1);

            // ReviewObserver actualizará los promedios automáticamente
            Review::create([
                'reservation_id' => $reservation->id,
                'user_id' => $reservation->user_id,
                'business_id' => $business->id,
                'rating' => $rating,
                'comment' => $hasComment ? 'Excelente servicio, muy buen lugar. Totalmente recomendado.' : null,
                'photos' => null,
                'status' => $status,
                'owner_reply' => $hasReply ? '¡Muchas gracias por visitarnos, te esperamos pronto!' : null,
                'replied_at' => $hasReply ? Carbon::now()->subDays(rand(1, 10)) : null,
            ]);
        }
    }
}
