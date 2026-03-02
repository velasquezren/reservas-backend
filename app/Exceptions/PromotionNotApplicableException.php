<?php

namespace App\Exceptions;

use Exception;

class PromotionNotApplicableException extends Exception
{
    public function __construct()
    {
        parent::__construct('El código no aplica a los ítems seleccionados.');
    }
}
