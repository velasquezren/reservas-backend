<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->string('discount_type')->nullable()->change();
            $table->unsignedBigInteger('discount_value')->nullable()->default(0)->change();
            $table->timestamp('ends_at')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->string('discount_type')->nullable(false)->change();
            $table->unsignedBigInteger('discount_value')->nullable(false)->change();
            $table->timestamp('ends_at')->nullable(false)->change();
        });
    }
};
