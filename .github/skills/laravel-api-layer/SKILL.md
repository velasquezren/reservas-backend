---
name: laravel-api-layer
description: Create Controllers, FormRequests, and API Resources for this Laravel project. Use this skill when building the API layer. Controllers must be thin (max 5 lines of real logic): receive → delegate → return Resource. FormRequests handle all validation and authorization. Resources transform output and never expose raw models. Routes are versioned under /api/v1/.
argument-hint: "resource name, e.g. reservation, review, item"
---

# API Layer Standards — Reservas Project

## Controller Rules — Max 5 Lines of Real Logic

Controllers must only: receive input → delegate to Service/Action → return Resource.

```php
// app/Http/Controllers/Api/V1/ReservationController.php
namespace App\Http\Controllers\Api\V1;

final class ReservationController extends Controller
{
    public function __construct(
        private readonly ReservationService $service
    ) {}

    public function store(StoreReservationRequest $request): JsonResponse
    {
        $reservation = $this->service->create($request->validated(), $request->user());

        return ReservationResource::make($reservation)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Reservation $reservation): JsonResponse
    {
        $this->authorize('view', $reservation);

        return ReservationResource::make($reservation->load(['item', 'items', 'user']))
            ->response();
    }

    public function destroy(Reservation $reservation): JsonResponse
    {
        $this->authorize('cancel', $reservation);

        $this->service->cancel($reservation, auth()->user());

        return response()->json(['message' => 'Reservation cancelled.']);
    }
}
```

Never put `if`, `try/catch`, or business logic in controllers.

## FormRequest — Validation + Authorization

```php
// app/Http/Requests/Api/V1/StoreReservationRequest.php
namespace App\Http\Requests\Api\V1;

final class StoreReservationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Business-level authorization (not just auth check)
        $business = Business::findOrFail($this->input('business_id'));
        return $business->status === BusinessStatus::Active;
    }

    public function rules(): array
    {
        return [
            'business_id'       => ['required', 'ulid', 'exists:businesses,id'],
            'item_id'           => ['required', 'ulid', 'exists:items,id'],
            'scheduled_date'    => ['required', 'date', 'after_or_equal:today'],
            'start_time'        => ['required', 'date_format:H:i'],
            'duration_minutes'  => ['required', 'integer', 'min:15', 'max:480'],
            'party_size'        => ['required', 'integer', 'min:1'],
            'notes'             => ['nullable', 'string', 'max:500'],
            'promo_code'        => ['nullable', 'string', 'max:50'],
            'source'            => ['nullable', Rule::enum(ReservationSource::class)],
            'items'             => ['nullable', 'array'],
            'items.*.item_id'   => ['required_with:items', 'ulid', 'exists:items,id'],
            'items.*.quantity'  => ['required_with:items', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'scheduled_date.after_or_equal' => 'No se pueden hacer reservas en el pasado.',
            'party_size.min'                => 'El número de personas debe ser al menos 1.',
        ];
    }
}
```

Authorization failures return `403`. Validation failures return `422`.

## API Resource — Transform, Never Expose Raw Model

```php
// app/Http/Resources/Api/V1/ReservationResource.php
namespace App\Http\Resources\Api\V1;

final class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'confirmation_code' => $this->confirmation_code,
            'status'            => $this->status->value,   // enum value, not object
            'source'            => $this->source->value,
            'scheduled_date'    => $this->scheduled_date->toDateString(),
            'start_time'        => $this->start_time,
            'duration_minutes'  => $this->duration_minutes,
            'party_size'        => $this->party_size,
            'notes'             => $this->notes,
            'total_amount'      => $this->total_amount,       // centavos (int)
            'total_formatted'   => 'Bs ' . number_format($this->total_amount / 100, 2),
            'discount_amount'   => $this->discount_amount,
            'price_snapshot'    => $this->price_snapshot,

            // Conditional relationship loading — only include if loaded
            'item'  => ItemResource::make($this->whenLoaded('item')),
            'user'  => UserResource::make($this->whenLoaded('user')),
            'items' => ReservationItemResource::collection($this->whenLoaded('items')),

            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
```

## Routes — Versioned Under /api/v1/

```php
// routes/api.php
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {

    // Auth (public)
    Route::post('auth/otp/send',   [OtpController::class, 'send'])->name('auth.otp.send');
    Route::post('auth/otp/verify', [OtpController::class, 'verify'])->name('auth.otp.verify');

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {

        // Businesses (public catalog read)
        Route::get('businesses',        [BusinessController::class, 'index']);
        Route::get('businesses/{business}', [BusinessController::class, 'show']);

        // Reservations
        Route::apiResource('reservations', ReservationController::class);
        Route::post('reservations/{reservation}/cancel', [ReservationController::class, 'cancel']);

        // Waitlist
        Route::post('items/{item}/waitlist', [WaitlistController::class, 'join']);
        Route::delete('items/{item}/waitlist', [WaitlistController::class, 'leave']);

        // Reviews
        Route::post('reservations/{reservation}/review', [ReviewController::class, 'store']);
        Route::put('reviews/{review}', [ReviewController::class, 'update']);

        // Admin routes (business owner only)
        Route::middleware('role:business_owner')->prefix('admin')->name('admin.')->group(function () {
            Route::apiResource('businesses.items',       ItemController::class);
            Route::apiResource('businesses.categories',  CategoryController::class);
            Route::apiResource('businesses.promotions',  PromotionController::class);
            Route::get('businesses/{business}/analytics', [AnalyticsController::class, 'index']);
            Route::put('reviews/{review}/reply',         [ReviewController::class, 'reply']);
        });
    });
});
```

## Error Response Format

All error responses must be consistent:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "scheduled_date": ["No se pueden hacer reservas en el pasado."]
  }
}
```

Use Laravel's default `422` for validation. For business rule failures, throw custom exceptions handled in `bootstrap/app.php`:

```php
// bootstrap/app.php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (BusinessRuleException $e, Request $request) {
        return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 422);
    });
})
```

## Checklist

- [ ] Controller has max 5 lines of real logic per method
- [ ] No `if` or business logic in controllers — delegate to Service
- [ ] `authorize()` called on every state-changing action
- [ ] FormRequest declares both `authorize()` and `rules()`
- [ ] API Resource uses `->value` on Enum columns
- [ ] API Resource uses `$this->whenLoaded()` for relationships
- [ ] Money amounts included as raw int AND formatted string
- [ ] Routes versioned under `/api/v1/`
- [ ] Custom exceptions handled in `bootstrap/app.php`
