<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Crea usuarios clientes de prueba.
 *
 * Teléfonos de acceso: +59172000001 al +59172000015
 * (enviar OTP a cualquiera de estos números en entorno de desarrollo)
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            ['Ana Torrico',    '+59172000001', 'ana.torrico@gmail.com'],
            ['Luis Quispe',    '+59172000002', 'luis.quispe@hotmail.com'],
            ['Paola Vásquez',  '+59172000003', 'paola.vasquez@gmail.com'],
            ['Jorge Mendoza',  '+59172000004', 'jmendoza@outlook.com'],
            ['Sofía Aliaga',   '+59172000005', 'sofia.aliaga@gmail.com'],
            ['Diego Vargas',   '+59172000006', 'diego.vargas@yahoo.com'],
            ['María Condori',  '+59172000007', 'maria.condori@gmail.com'],
            ['Rodrigo Salinas','+59172000008', 'rodrigo.s@hotmail.com'],
            ['Patricia Lima',  '+59172000009', 'p.lima@gmail.com'],
            ['Fernando Chura', '+59172000010', 'fchura@gmail.com'],
        ];

        foreach ($customers as [$name, $phone, $email]) {
            User::firstOrCreate(
                ['phone' => $phone],
                [
                    'name'              => $name,
                    'email'             => $email,
                    'password'          => bcrypt('password'),
                    'business_id'       => null,
                    'phone_verified_at' => now(),
                ]
            );
        }

        // 5 cuentas shadow (sin nombre ni email — creadas automáticamente por OTP)
        for ($i = 11; $i <= 15; $i++) {
            User::firstOrCreate(
                ['phone' => "+59172000{$i}"],
                [
                    'name'              => null,
                    'email'             => null,
                    'password'          => bcrypt('password'),
                    'business_id'       => null,
                    'phone_verified_at' => now(),
                ]
            );
        }
    }
}
