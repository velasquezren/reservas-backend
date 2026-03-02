<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     * Users are phone-first, passwordless (OTP auth only).
     */
    public function definition(): array
    {
        // +591 7XXXXXXX — Bolivian mobile format
        $mobile = '+591 7' . $this->faker->numerify('#######');

        return [
            'name'              => $this->faker->name(),
            'phone'             => $mobile,
            'email'             => $this->faker->unique()->safeEmail(),
            'business_id'       => null,
            'phone_verified_at' => now(),
            'email_verified_at' => null,
        ];
    }

    /** User is a verified business owner — business_id set by seeder after creating Business. */
    public function businessOwner(string $businessId): static
    {
        return $this->state(fn () => ['business_id' => $businessId]);
    }

    /** Shadow account — phone verified but name/email may be null. */
    public function shadow(): static
    {
        return $this->state(fn () => [
            'name'  => null,
            'email' => null,
        ]);
    }
}
