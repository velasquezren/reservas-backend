<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Business;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        $name = $this->faker->randomElement([
            'Mesas', 'Salones Privados', 'Terraza', 'Bar', 'Menú del Día',
            'Entradas', 'Platos Principales', 'Postres', 'Bebidas', 'Pizzas',
            'Parrillas', 'Comida Boliviana', 'Mariscos', 'Veganos',
        ]);

        return [
            'business_id' => Business::factory(),
            'name'        => $name,
            'slug'        => Str::slug($name) . '-' . $this->faker->unique()->numerify('###'),
            'description' => $this->faker->sentence(),
            'image_url'   => null,
            'sort_order'  => $this->faker->numberBetween(0, 99),
            'is_active'   => true,
        ];
    }
}
