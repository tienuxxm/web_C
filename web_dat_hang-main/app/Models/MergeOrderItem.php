<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MergeOrderItem extends Model
{
    protected $table = 'API$Merge Line';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo', 'Line', 'PostingDate', 'ItemCode', 'Variant',
        'ItemName', 'Unit', 'Quantity', 'QuantityOld', 'Price',
        'Status', 'PurchaseLineID', 'CreatedBy', 'CreatedDate'
    ];

    public function orderMerged()
    {
        return $this->belongTo(MergrOrder::class,'DocumentNo','DocumentNo');
    }
}