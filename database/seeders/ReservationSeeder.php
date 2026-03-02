<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\Item;
use App\Models\Reservation;
use App\Models\User;
use App\Enums\ReservationStatus;
use App\Enums\ReservationSource;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ReservationSeeder extends Seeder
{
    public function run(): void
    {
        $business = Business::first();
        if (!$business) return;

        $items = Item::where('business_id', $business->id)->where('type', 'reservable')->get();
        // Clientes son usuarios sin business_id
        $users = User::whereNull('business_id')->get();

        if ($items->isEmpty() || $users->isEmpty()) return;

        $pastStatuses = [
            ReservationStatus::Completed,
            ReservationStatus::Completed,
            ReservationStatus::Completed,
            ReservationStatus::Completed,
            ReservationStatus::Completed,
            ReservationStatus::NoShow,
            ReservationStatus::NoShow,
            ReservationStatus::Cancelled,
        ];

        $futureStatuses = [
            ReservationStatus::Pending,
            ReservationStatus::Confirmed,
            ReservationStatus::Confirmed,
            ReservationStatus::Cancelled,
        ];

        $now = Carbon::now();
        $startDate = $now->copy()->subDays(60);
        $endDate = $now->copy()->addDays(30);
        
        $hours = ['12:00:00', '13:00:00', '19:00:00', '20:00:00', '21:00:00'];

        for ($date = $startDate; $date->lte($endDate); $date->addDay()) {
            
            // Generar 3 a 6 reservas por dia
            $dailyCount = rand(3, 6);
            $selectedItems = $items->random(min($dailyCount, $items->count()));
            
            // Tomar horas de manera simple y dejar la validación $exists evitar choques
            foreach ($selectedItems as $item) {
                $user = $users->random();
                $isPast = $date->isPast();
                $statusArr = $isPast ? $pastStatuses : $futureStatuses;
                $status = $statusArr[array_rand($statusArr)];

                $startTime = $hours[array_rand($hours)];
                
                // Evitar Unique constraint exact match
                $exists = Reservation::where('item_id', $item->id)
                    ->where('scheduled_date', $date->format('Y-m-d'))
                    ->where('start_time', $startTime)
                    ->exists();
                
                if ($exists) {
                    continue;
                }

                Reservation::create([
                    'user_id' => $user->id,
                    'item_id' => $item->id,
                    'business_id' => $business->id,
                    'confirmation_code' => strtoupper(Str::random(6)),
                    'status' => $status,
                    'source' => ReservationSource::Web,
                    'scheduled_date' => $date->format('Y-m-d'),
                    'start_time' => $startTime,
                    'duration_minutes' => $item->duration_minutes ?? 120,
                    'party_size' => rand(1, max(1, $item->capacity ?? 4)),
                    'notes' => rand(0, 1) ? 'Reserva generada automáticamente.' : null,
                    'total_amount' => $item->base_price,
                    'discount_amount' => 0,
                    'price_snapshot' => ['original_amount' => $item->base_price, 'final_amount' => $item->base_price],
                    'promo_snapshot' => null,
                ]);
            }
        }
    }
}
