<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    // public $timestamps = false;
    // protected $fillable = [
    //     'order_id',
    //     'product_id',
    //     'quantity',
    //     'unit_price',
    //     'product_name',
    //     'line_total',
    // ];
    // public function order()   { return $this->belongsTo(Order::class); }
    // public function product() 
    // { 
    //     return $this->belongsTo(Product::class); 
    // }
    protected $connection = 'sqlsrv';
    protected $table = 'dbo.API$Purchase Line';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo', 
        'Line',           // Line No (Số dòng)
        'PostingDate',    // Ngày tạo dòng
        'ItemCode',       // Mã hàng
        'Variant',        // Mã biến thể (Màu/Size)
        'ItemName', 
        'Unit',           // Đơn vị tính
        'Quantity', 
        'QuantityOld',    // Số lượng gốc (để so sánh)
        'Price', 
        'Status', 
        'CreatedBy',
        'CreatedDate'
    ];

    public function order()
    {
        return $this->belongsTo(Order::class, 'DocumentNo', 'DocumentNo');
    }
    public function getAmountAttribute()
    {
        // Nếu trong DB có cột Amount thì dùng, không thì tính: Price * Quantity
        return $this->attributes['Price'] * $this->attributes['Quantity'];
    }
}

