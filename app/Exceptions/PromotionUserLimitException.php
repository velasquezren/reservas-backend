<?php

namespace App\Exceptions;

use Exception;

class PromotionUserLimitException extends Exception
{
    public function __construct()
    {
        parent::__construct('Límite de usos por usuario alcanzado.');
    }
}
