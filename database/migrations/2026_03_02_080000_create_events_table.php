<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->ulid('business_id');

            $table->string('name');
            $table->text('description')->nullable();

            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();

            $table->boolean('is_active')->default(true);

            $table->string('banner_path')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('business_id')
                ->references('id')
                ->on('businesses')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};

