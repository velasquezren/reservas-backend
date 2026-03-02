<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notifications — Laravel's database channel storage for in-app notifications.
 *
 * Design decisions:
 * - This is the standard Laravel notifications table with one addition:
 *   `notifiable_id` uses CHAR(26) instead of the default UNSIGNED BIGINT to
 *   match the ULID primary keys on the users table.
 * - `data` JSON stores the serialized notification payload.
 * - `read_at` NULL means unread — the standard Laravel convention.
 * - No softDeletes: notifications are pruned by the user or by a scheduled job after
 *   a retention window (e.g. 90 days).
 * - The [notifiable_type, notifiable_id] composite index is the standard Laravel
 *   pattern for polymorphic notifiable lookups.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();                        // Laravel uses UUID for notifications
            $table->string('type');                               // FQCN of the Notification class
            $table->string('notifiable_type');
            $table->char('notifiable_id', 26);                   // ULID of the notifiable model
            $table->json('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
