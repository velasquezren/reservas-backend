<?php

namespace Database\Seeders;

use App\Enums\BusinessStatus;
use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Models\Business;
use App\Models\Category;
use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Crea negocios de prueba con su dueño administrador,
 * categorías e ítems (mesas reservables + menú).
 *
 * Credenciales de acceso (vía OTP — teléfono como identificador):
 *
 *  Negocio 1 — El Fogón Paceño
 *    Admin: +59171000001  (admin@elfogon.bo)
 *
 *  Negocio 2 — La Terraza Cruceña
 *    Admin: +59171000002  (admin@laterraza.bo)
 *
 *  Negocio 3 — Sabores de Bolivia (inactivo)
 *    Admin: +59171000003  (admin@sabores.bo)
 */
class BusinessSeeder extends Seeder
{
    public function run(): void
    {
        // ── Negocio 1: Restaurante con mesas y menú ───────────────────────────
        $fogon = Business::create([
            'name'        => 'El Fogón Paceño',
            'slug'        => 'el-fogon-paceno',
            'phone'       => '+591 22411111',
            'email'       => 'contacto@elfogon.bo',
            'address'     => 'Av. 6 de Agosto 2345, La Paz',
            'timezone'    => 'America/La_Paz',
            'status'      => BusinessStatus::Active,
            'description' => 'Restaurante tradicional boliviano en el corazón de La Paz. Especialidad en parrilladas y comida típica.',
            'settings'    => ['min_party_size' => 1, 'max_party_size' => 20],
        ]);

        User::create([
            'name'              => 'Administrador del Sistema',
            'phone'             => '+59171000001',
            'email'             => 'admin@admin.com',
            'password'          => bcrypt('admin'),
            'business_id'       => $fogon->id,
            'phone_verified_at' => now(),
        ]);

        $this->seedFogon($fogon);

        // ── Negocio 2: Restaurante con terraza ───────────────────────────────
        $terraza = Business::create([
            'name'        => 'La Terraza Cruceña',
            'slug'        => 'la-terraza-crucena',
            'phone'       => '+591 33522222',
            'email'       => 'hola@laterraza.bo',
            'address'     => 'Calle Monseñor Rivero 450, Santa Cruz de la Sierra',
            'timezone'    => 'America/La_Paz',
            'status'      => BusinessStatus::Active,
            'description' => 'Vista panorámica y cocina internacional con toques bolivianos. Ideal para celebraciones.',
            'settings'    => [],
        ]);

        User::create([
            'name'              => 'Valeria Rojas',
            'phone'             => '+59171000002',
            'email'             => 'admin@laterraza.bo',
            'password'          => bcrypt('password'),
            'business_id'       => $terraza->id,
            'phone_verified_at' => now(),
        ]);

        $this->seedTerraza($terraza);

        // ── Negocio 3: Negocio inactivo (para pruebas de rechazo) ─────────────
        $sabores = Business::create([
            'name'        => 'Sabores de Bolivia',
            'slug'        => 'sabores-de-bolivia',
            'phone'       => '+591 44633333',
            'email'       => 'info@sabores.bo',
            'address'     => 'Calle España 120, Cochabamba',
            'timezone'    => 'America/La_Paz',
            'status'      => BusinessStatus::Inactive,
            'description' => 'Negocio temporalmente inactivo.',
            'settings'    => [],
        ]);

        User::create([
            'name'              => 'Marco Flores',
            'phone'             => '+59171000003',
            'email'             => 'admin@sabores.bo',
            'password'          => bcrypt('password'),
            'business_id'       => $sabores->id,
            'phone_verified_at' => now(),
        ]);
    }

    // ─── El Fogón Paceño ──────────────────────────────────────────────────────

    private function seedFogon(Business $business): void
    {
        $mesas = Category::create([
            'business_id' => $business->id,
            'name'        => 'Mesas',
            'slug'        => 'mesas-fogon',
            'description' => 'Mesas disponibles en el salón principal.',
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        $privados = Category::create([
            'business_id' => $business->id,
            'name'        => 'Salones Privados',
            'slug'        => 'salones-privados-fogon',
            'description' => 'Ambientes privados para eventos y reuniones.',
            'sort_order'  => 2,
            'is_active'   => true,
        ]);

        $menu = Category::create([
            'business_id' => $business->id,
            'name'        => 'Menú',
            'slug'        => 'menu-fogon',
            'description' => 'Platos para pre-ordenar con tu reserva.',
            'sort_order'  => 3,
            'is_active'   => true,
        ]);

        // Mesas reservables
        $this->createTable($business, $mesas, 'Mesa para 2', 2, 0, 90);
        $this->createTable($business, $mesas, 'Mesa para 4', 4, 0, 90);
        $this->createTable($business, $mesas, 'Mesa para 6', 6, 5000, 120);
        $this->createTable($business, $mesas, 'Mesa para 8', 8, 8000, 120);

        // Salón privado
        Item::create([
            'business_id'      => $business->id,
            'category_id'      => $privados->id,
            'name'             => 'Salón Privado (hasta 20 personas)',
            'slug'             => 'salon-privado-fogon',
            'description'      => 'Ambiente exclusivo con capacidad para 20 personas. Incluye equipo de sonido.',
            'type'             => ItemType::Reservable,
            'status'           => ItemStatus::Active,
            'base_price'       => 50000,  // Bs 500
            'capacity'         => 20,
            'duration_minutes' => 180,
            'sort_order'       => 1,
        ]);

        // Platos del menú
        $platillos = [
            ['Silpancho Cochabambino', 4500],
            ['Fricasé La Paz', 4000],
            ['Pique Macho', 5500],
            ['Anticuchos', 3500],
            ['Salteñas (docena)', 6000],
            ['Chicharrón de Cerdo', 5000],
        ];

        foreach ($platillos as $i => [$nombre, $precio]) {
            Item::create([
                'business_id'      => $business->id,
                'category_id'      => $menu->id,
                'name'             => $nombre,
                'slug'             => Str::slug($nombre) . '-fogon',
                'type'             => ItemType::MenuItem,
                'status'           => ItemStatus::Active,
                'base_price'       => $precio,
                'capacity'         => null,
                'duration_minutes' => null,
                'sort_order'       => $i + 1,
            ]);
        }
    }

    // ─── La Terraza Cruceña ───────────────────────────────────────────────────

    private function seedTerraza(Business $business): void
    {
        $terraza = Category::create([
            'business_id' => $business->id,
            'name'        => 'Terraza',
            'slug'        => 'terraza-principal',
            'description' => 'Mesas en terraza con vista panorámica.',
            'sort_order'  => 1,
            'is_active'   => true,
        ]);

        $vip = Category::create([
            'business_id' => $business->id,
            'name'        => 'Área VIP',
            'slug'        => 'area-vip-terraza',
            'description' => 'Sección exclusiva con servicio personalizado.',
            'sort_order'  => 2,
            'is_active'   => true,
        ]);

        // Mesas terraza
        $this->createTable($business, $terraza, 'Mesa Terraza para 2', 2, 0, 90);
        $this->createTable($business, $terraza, 'Mesa Terraza para 4', 4, 3000, 90);
        $this->createTable($business, $terraza, 'Mesa Terraza para 6', 6, 8000, 120);

        // Área VIP
        Item::create([
            'business_id'      => $business->id,
            'category_id'      => $vip->id,
            'name'             => 'Mesa VIP con vista',
            'slug'             => 'mesa-vip-terraza',
            'description'      => 'Mesa VIP con vista al jardín, servicio prioritario y botella de bienvenida.',
            'type'             => ItemType::Reservable,
            'status'           => ItemStatus::Active,
            'base_price'       => 20000,  // Bs 200
            'capacity'         => 4,
            'duration_minutes' => 120,
            'sort_order'       => 1,
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function createTable(
        Business $business,
        Category $category,
        string $name,
        int $capacity,
        int $basePrice,
        int $duration,
    ): Item {
        return Item::create([
            'business_id'      => $business->id,
            'category_id'      => $category->id,
            'name'             => $name,
            'slug'             => Str::slug($name) . '-' . Str::lower(Str::slug($business->slug)),
            'description'      => "Mesa para {$capacity} personas.",
            'type'             => ItemType::Reservable,
            'status'           => ItemStatus::Active,
            'base_price'       => $basePrice,
            'capacity'         => $capacity,
            'duration_minutes' => $duration,
            'sort_order'       => $capacity,
        ]);
    }
}
