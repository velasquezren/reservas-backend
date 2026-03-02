<?php

namespace App\Exceptions;

use Exception;

class PromotionNotFoundException extends Exception
{
    public function __construct()
    {
        parent::__construct('Código de descuento no válido.');
    }
}
