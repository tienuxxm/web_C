<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* database/migrations/2025_07_02_000001_add_quantity_and_min_stock_to_products_table.php */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('quantity')
                  ->default(0)
                  ->after('price');          // đặt ngay sau price (tùy bạn)

            $table->integer('min_stock')
                  ->default(0)
                  ->after('quantity');       // đặt ngay sau quantity
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'min_stock']);
        });
    }
};

