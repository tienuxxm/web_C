<?php

// database/migrations/2025_06_30_000000_create_categories_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name');              // “Máy tính”, “Balo” …
            $t->string('prefix', 2)->unique(); // “MT”, “BL” – 2 ký tự in hoa
            $t->enum('status', ['active','inactive'])->default('active');
            $t->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('categories');
    }
};

