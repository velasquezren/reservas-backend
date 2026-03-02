<?php

namespace Database\Factories;

use App\Enums\BusinessStatus;
use App\Models\Business;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Business>
 */
class BusinessFactory extends Factory
{
    protected $model = Business::class;

    public function definition(): array
    {
        $name = $this->faker->company();

        return [
            'name'           => $name,
            'slug'           => Str::slug($name) . '-' . $this->faker->unique()->numberBetween(1, 9999),
            'phone'          => '+591 2' . $this->faker->numerify('#######'),
            'email'          => $this->faker->companyEmail(),
            'address'        => $this->faker->streetAddress() . ', ' . $this->faker->randomElement(['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Oruro']),
            'timezone'       => 'America/La_Paz',
            'status'         => BusinessStatus::Active,
            'description'    => $this->faker->paragraph(),
            'logo_url'       => null,
            'average_rating' => 0.00,
            'total_reviews'  => 0,
            'settings'       => [],
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['status' => BusinessStatus::Inactive]);
    }
}
