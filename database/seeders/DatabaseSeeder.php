<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Orden de ejecución:
     *  1. BusinessSeeder — businesses + admins + categorías + ítems
     *  2. UserSeeder     — clientes de prueba
     */
    public function run(): void
    {
        $this->call([
            BusinessSeeder::class,
            UserSeeder::class,
            EventSeeder::class,
            ReservationSeeder::class,
            ReviewSeeder::class,
        ]);
    }
}
