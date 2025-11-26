<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);   // tên FK do Laravel đặt sẵn
            $table->dropColumn('supplier_id');

            /* 2. Thêm cột mới supplier_name (giống customer_name) */
            $table->string('supplier_name')->nullable(); 
            $table->enum('payment_method', ['cash', 'bank_transfer', 'card', 'e_wallet'])
                  ->default('cash');      // hoặc sau total_amount, tuỳ ý
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('supplier_name');

            $table->foreignId('supplier_id')->nullable();
            $table->foreign('supplier_id')->references('id')
                  ->on('users')->onDelete('no action');
            $table->dropColumn('payment_method');
        });
    }
};