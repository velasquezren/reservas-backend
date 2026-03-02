---
name: laravel-migration
description: Create database migrations following this project's strict standards. Use this skill when asked to create, modify, or review migrations. Covers ULID primary keys, money as centavos (unsignedBigInteger), softDeletes, foreign key constraints (cascadeOnDelete vs restrictOnDelete), composite unique indexes, JSON snapshot columns, and frequent-filter indexes.
argument-hint: "table name or feature description"
---

# Laravel Migration Standards — Reservas Project

## Primary Keys

Always use `ulid()` — never `id()` or `uuid()`.

```php
$table->ulid('id')->primary();
```

ULIDs are time-sortable and shorter than raw UUIDs. This matters for pagination and index efficiency.

## Money Columns

All monetary values are stored as **integers representing the amount × 100** (centavos / bolivianos × 100). Never use `decimal` or `float` for money.

```php
$table->unsignedBigInteger('base_price');        // e.g. 5000 = Bs 50.00
$table->unsignedBigInteger('discount_amount')->default(0);
$table->unsignedBigInteger('total_amount');
```

## Soft Deletes

Apply `softDeletes()` to: `users`, `businesses`, `items`, `categories`, `promotions`.

```php
$table->softDeletes();
```

Do NOT add softDeletes to: `reservations`, `reservation_items`, `waitlists`, `reviews`.

## Foreign Key Constraints — Decision Rule

| Scenario | Method | Reason |
|---|---|---|
| Child record is meaningless without parent | `cascadeOnDelete()` | e.g. `reservation_items → reservations` |
| Deleting parent would violate business integrity | `restrictOnDelete()` | e.g. `items` that have active reservations |
| Parent deletion should nullify the reference | `nullOnDelete()` | e.g. optional FK |

```php
// Child dies with parent
$table->foreign('reservation_id')->references('id')->on('reservations')->cascadeOnDelete();

// Block deletion if children exist
$table->foreign('item_id')->references('id')->on('items')->restrictOnDelete();
```

When using shorthand:
```php
$table->foreignUlid('reservation_id')->constrained()->cascadeOnDelete();
$table->foreignUlid('item_id')->constrained()->restrictOnDelete();
```

## Anti Double-Booking Index (reservations table)

Unique composite index on three columns as the DB-level guard:

```php
$table->unique(['item_id', 'scheduled_date', 'start_time'], 'reservations_slot_unique');
```

Note: this index only covers exact-match collisions. Overlap detection must be handled in `ReservationService` with `lockForUpdate()`.

## Standard Indexes for Filter Columns

Add simple indexes on every column commonly used in `WHERE` or `ORDER BY`:

```php
$table->index('status');
$table->index('business_id');
$table->index('user_id');
$table->index('scheduled_date');
```

For multi-column filters used together:
```php
$table->index(['business_id', 'scheduled_date', 'status']);
```

## JSON Snapshot Columns

Immutable snapshots store the state of a record *at the time of the transaction*. Never rely on joins for financial/legal history.

```php
$table->json('price_snapshot');   // item price at reservation time
$table->json('promo_snapshot')->nullable(); // promotion config if applied
```

## Timestamp Conventions

Always include both:
```php
$table->timestamps();   // created_at + updated_at
```

For columns tracking business events, use explicit nullable timestamps:
```php
$table->timestamp('confirmed_at')->nullable();
$table->timestamp('cancelled_at')->nullable();
$table->timestamp('completed_at')->nullable();
```

## Enum Columns

Use `string` type and store the backed enum value. Never use MySQL ENUM type.

```php
$table->string('status')->default('pending');
$table->string('source')->default('app');
```

## Checklist Before Writing a Migration

- [ ] Primary key is `ulid()`
- [ ] Money columns are `unsignedBigInteger`
- [ ] `softDeletes()` applied only to the correct tables
- [ ] Each FK is explicitly `cascadeOnDelete()` or `restrictOnDelete()`
- [ ] Indexes exist on all `status`, `business_id`, `user_id`, `scheduled_date` columns
- [ ] Snapshot columns use `json`, not a FK to the original record
- [ ] `string` type for Enum columns (not MySQL ENUM)
- [ ] `down()` method correctly reverses the `up()` method
