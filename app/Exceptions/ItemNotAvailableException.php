<?php

namespace App\Exceptions;

use Exception;

class ItemNotAvailableException extends Exception
{
    public function __construct()
    {
        parent::__construct('El ítem no está disponible para reservar.');
    }
}
