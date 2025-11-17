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
        Schema::create('api_logs', function (Blueprint $table) {
            $table->id();
            $table->string('user_id')->nullable(); // Thêm cột user_id nếu cần, để lưu ID người dùng gọi API
            $table->string('method')->nullable();          // GET, POST, etc.
            $table->string('url')->nullable();             // Đường dẫn gọi API
            $table->text('request_body')->nullable();      // Nội dung request
            $table->text('response_body')->nullable();     // Nội dung response (nếu cần)
            $table->integer('status_code')->nullable();    // HTTP Status code
            $table->string('ip_address')->nullable();      // IP người gọi
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_logs');
    }
};
