<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SendOtpRequest;
use App\Http\Requests\Api\V1\VerifyOtpRequest;
use App\Http\Resources\Api\V1\UserResource;
use App\Services\OtpAuthService;
use Illuminate\Http\JsonResponse;

final class OtpController extends Controller
{
    public function __construct(private readonly OtpAuthService $otpAuthService) {}

    public function send(SendOtpRequest $request): JsonResponse
    {
        $this->otpAuthService->sendOtp($request->validated('phone'));

        return response()->json(['message' => 'OTP enviado correctamente.']);
    }

    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        $result = $this->otpAuthService->verifyOtp(
            $request->validated('phone'),
            $request->validated('code'),
        );

        return response()->json([
            'token' => $result['token'],
            'user'  => UserResource::make($result['user']),
        ]);
    }
}
