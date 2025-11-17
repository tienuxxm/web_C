<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateValueEntryTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('value_entry', function (Blueprint $table) {
            $table->id(); // Tạo cột khóa chính
            $table->integer('EntryNo'); // Entry No_
            $table->string('CustomerCode', 50); // CustomerCode
            $table->integer('Industry'); // Industry
            $table->string('ItemNo', 50); // Item No_
            $table->string('Description', 255); // Description
            $table->string('VariantCode', 50); // Variant Code
            $table->decimal('InvoicedQuantity', 15, 8); // Invoiced Quantity (sử dụng decimal thay vì float)
            $table->decimal('Amount', 15, 8); // Amount (sử dụng decimal thay vì float)
            $table->decimal('Cost', 15, 8); // Cost (sử dụng decimal thay vì float)
            $table->date('PostingDate'); // Posting Date
            $table->string('DocumentNo', 50); // Document No_
            $table->string('DimensionSetID', 50); // Dimension Set ID
            $table->string('ItemChargeNo', 50); // Item Charge No_
            $table->string('GenBusPostingGroup', 50); // Gen_ Bus_ Posting Group
            $table->string('ItemLedgerEntryNo', 50); // Item Ledger Entry No_
            $table->string('DocumentLineNo', 50); // Document Line No_
            $table->string('GenProdPostingGroup', 50); // Gen_ Prod_ Posting Group
            $table->string('DocumentType', 50); // Document Type
            $table->timestamps(); // created_at, updated_at
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('value_entry');
    }
}
