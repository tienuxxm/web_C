<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    
    protected $connection = 'sqlsrv';
    protected $table = 'dbo.API$Purchase Line';
    public $timestamps = false;

    protected $fillable = [
        'ID',
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
    public function product()
    {
        // Liên kết thông qua Mã sản phẩm (ItemCode)
        return $this->belongsTo(Product::class, 'ItemCode', 'code');
    }
}

