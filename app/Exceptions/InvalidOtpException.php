<?php

namespace App\Exceptions;

use Exception;

class InvalidOtpException extends Exception
{
    public function __construct()
    {
        parent::__construct('OTP inválido o expirado.');
    }
}
