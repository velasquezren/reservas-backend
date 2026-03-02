<?php

namespace App\Exceptions;

use Exception;

class BusinessNotAcceptingReservationsException extends Exception
{
    public function __construct()
    {
        parent::__construct('El negocio no está aceptando reservas en este momento.');
    }
}
