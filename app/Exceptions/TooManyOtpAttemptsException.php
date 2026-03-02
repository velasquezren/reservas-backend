<?php

namespace App\Exceptions;

use Exception;

class TooManyOtpAttemptsException extends Exception
{
    public function __construct(string $phone)
    {
        parent::__construct(
            "Demasiados intentos de OTP para {$phone}. Espere 15 minutos."
        );
    }
}
