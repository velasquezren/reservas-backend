<?php

namespace App\Exceptions;

use Exception;

class SlotNotAvailableException extends Exception
{
    public function __construct()
    {
        parent::__construct('El horario solicitado no está disponible. Por favor elige otro horario.');
    }
}
