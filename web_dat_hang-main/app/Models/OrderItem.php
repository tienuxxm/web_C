<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    
    protected $connection = 'sqlsrv';
    protected $table = 'dbo.API$Purchase Line';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo', 'Line', 'PostingDate', 'ItemCode', 'Variant', 
        'ItemName', 'Unit', 'Quantity', 'QuantityOld', 'Price', 'Status',
        'CreatedBy', 'CreatedDate', 
        'ModifiedBy', 'ModifiedDate', 
        'MergeHeaderID'
    ];
    public function order()
    {
        return $this->belongsTo(Order::class, 'DocumentNo', 'DocumentNo');
    }
    public function getAmountAttribute()
    {
        return $this->attributes['Price'] * $this->attributes['Quantity'];
    }
    public function product()
    {
        return $this->belongsTo(Product::class, 'ItemCode', 'code');
    }
}

