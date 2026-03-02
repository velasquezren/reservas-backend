<?php

namespace Database\Factories;

use App\Enums\ItemStatus;
use App\Enums\ItemType;
use App\Models\Business;
use App\Models\Category;
use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        $name = $this->faker->randomElement([
            'Mesa para 2', 'Mesa para 4', 'Mesa para 6', 'Mesa para 8',
            'Salón Privado Pequeño', 'Salón Privado Grande',
            'Mesa en Terraza',
        ]);

        return [
            'business_id'      => Business::factory(),
            'category_id'      => null,
            'name'             => $name,
            'slug'             => Str::slug($name) . '-' . $this->faker->unique()->numerify('###'),
            'description'      => $this->faker->sentence(),
            'image_url'        => null,
            'type'             => ItemType::Reservable,
            'status'           => ItemStatus::Active,
            'base_price'       => $this->faker->randomElement([0, 5000, 10000, 15000, 20000]), // centavos
            'capacity'         => $this->faker->randomElement([2, 4, 6, 8, 10, 20]),
            'duration_minutes' => $this->faker->randomElement([60, 90, 120]),
            'variants'         => null,
            'sort_order'       => $this->faker->numberBetween(0, 99),
        ];
    }

    public function menuItem(): static
    {
        $name = $this->faker->randomElement([
            'Silpancho', 'Saice', 'Fricasé', 'Chicharrón de Cerdo',
            'Sopa de Maní', 'Pique Macho', 'Anticuchos', 'Salteñas',
            'Api con Pastel', 'Empanadas de Queso', 'Lomo Borracho',
            'Trucha al Horno', 'Arroz con Leche', 'Helado de Canela',
        ]);

        return $this->state(fn () => [
            'name'             => $name,
            'slug'             => Str::slug($name) . '-' . $this->faker->unique()->numerify('###'),
            'type'             => ItemType::MenuItem,
            'base_price'       => $this->faker->numberBetween(3000, 8000), // Bs 30–80 en centavos
            'capacity'         => null,
            'duration_minutes' => null,
        ]);
    }
}
