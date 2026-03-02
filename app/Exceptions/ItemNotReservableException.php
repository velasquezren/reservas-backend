<?php

namespace App\Exceptions;

use Exception;

class ItemNotReservableException extends Exception
{
    public function __construct()
    {
        parent::__construct('Este ítem no es reservable.');
    }
}
