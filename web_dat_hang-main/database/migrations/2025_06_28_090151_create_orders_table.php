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
        Schema::create('orders', function (Blueprint $table) {
           $table->id();
            $table->string('code')->unique(); // ORD280625-0001
            $table->string('customer_name');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->enum('status', [
                'draft', 'pending', 'approved', 'rejected', 'fulfilled', 'inactive'
            ])->default('draft');

            $table->foreignId('user_id')         // người tạo (saler)
                  ->constrained('users')->cascadeOnDelete();
            
           $table->foreignId('approved_by')->nullable();
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('no action');

            $table->foreignId('supplier_id')->nullable();
            $table->foreign('supplier_id')->references('id')->on('users')->onDelete('no action');



            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        }); 
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
