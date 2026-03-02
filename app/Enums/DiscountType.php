<?php

namespace App\Enums;

enum DiscountType: string
{
    case Percentage  = 'percentage';

    /** Fixed boliviano amount stored as centavos (integer × 100) */
    case FixedAmount = 'fixed_amount';

    /**
     * Calculate the discount amount for a given base value.
     *
     * @param  int  $baseAmount  Total to discount from, in centavos.
     * @param  int  $value       Percentage (0-100) or fixed centavos amount.
     * @return int               Discount amount in centavos (never exceeds baseAmount).
     */
    public function calculate(int $baseAmount, int $value): int
    {
        return match ($this) {
            self::Percentage  => (int) round($baseAmount * $value / 100),
            self::FixedAmount => min($value, $baseAmount),
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Percentage  => 'Porcentaje (%)',
            self::FixedAmount => 'Monto fijo (Bs)',
        };
    }
}
