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
    Schema::create('notifications', function (Blueprint $table) {
        $table->id();

        // Dùng unsignedBigInteger và định nghĩa khóa ngoại thủ công
        $table->BigInteger('user_id');
        $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        $table->BigInteger('sender_id')->nullable();
        $table->foreign('sender_id')->references('id')->on('users')->onDelete('cascade');

        $table->BigInteger('order_id');
        $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');

        $table->string('type'); // VD: order_created, order_updated
        $table->text('message'); // Nội dung hiển thị
        $table->boolean('read')->default(false); // Đã đọc hay chưa
        $table->timestamp('expires_at')->nullable(); // Hết hạn
        $table->timestamps();
    });



    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
