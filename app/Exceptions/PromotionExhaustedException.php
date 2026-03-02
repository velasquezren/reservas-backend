<?php

namespace App\Exceptions;

use Exception;

class PromotionExhaustedException extends Exception
{
    public function __construct()
    {
        parent::__construct('Código agotado.');
    }
}
