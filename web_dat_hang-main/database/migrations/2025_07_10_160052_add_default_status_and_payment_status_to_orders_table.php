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
        Schema::table('orders', function (Blueprint $table) {
            Schema::table('orders', function (Blueprint $table) {
           // Thay đổi cột 'status' để có giá trị mặc định 'draft'
            // Sử dụng ->change() để sửa đổi cột hiện có.
            // Đảm bảo bạn đã cài đặt doctrine/dbal: composer require doctrine/dbal
            $table->string('status')->default('draft')->change();

            // Thay đổi cột 'payment_status' để có giá trị mặc định 'pending'
            $table->string('payment_status')->default('pending')->change();
});
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Hoàn tác thay đổi: Xóa giá trị mặc định (trở về trạng thái NULL nếu cột cho phép)
            // Hoặc bạn có thể đặt lại về null()->change() nếu trước đó nó là nullable.
            $table->string('status')->default(null)->change(); // Ví dụ: bỏ default
            $table->string('payment_status')->default(null)->change(); // Ví dụ: bỏ default
        });
    }
};
