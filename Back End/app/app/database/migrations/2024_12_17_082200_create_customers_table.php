<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCustomersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id(); // Tạo cột khóa chính
            $table->string('CustomerCode', 50)->unique(); // Mã khách hàng, duy nhất
            $table->string('CustomerName', 255); // Tên khách hàng
            $table->string('Domain', 100); // Domain, có thể null
            $table->string('Channel', 50); // Kênh phân phối
            $table->string('Area', 50); // Khu vực
            $table->string('Group', 50); // Nhóm, có thể null
            $table->string('City', 100); // Thành phố
            $table->string('County', 100)->nullable(); // Huyện/quận, có thể null
            $table->string('Salesperson', 100)->nullable(); // Người bán hàng
            $table->timestamps(); // Thêm các cột `created_at` và `updated_at`
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('customers');
    }
}
