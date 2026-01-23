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

    public function mergeOrder()
    {
        return $this->belongsTo(MergeOrder::class,'DocumentNo','DocumentNo');
    }
    // Thêm quan hệ tới dòng đơn hàng gốc
    public function originalLine()
    {
        // 'ID' là khóa chính của OrderItem (API$Purchase Line)
        return $this->belongsTo(\App\Models\OrderItem::class, 'PurchaseLineID', 'ID');
    }
    public function product()
    {
        // Liên kết với bảng Product qua ItemCode (giả sử Product dùng cột Code làm khóa chính)
        return $this->belongsTo(Product::class, 'ItemCode', 'Code');
    }
    
}