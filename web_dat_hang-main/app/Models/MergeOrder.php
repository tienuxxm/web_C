<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MergeOrder extends Model
{
    protected $table = 'API$Merge Header';
    protected $primaryKey = 'DocumentNo';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo', 'PostingDate', 'ShipmentDate', 'Industry', 
        'Status', 'Note', 'CreatedBy', 'CreatedDate'
    ];

    public function items()
    {
        return $this->hasMany(MergeOrderItem::class, 'DocumentNo', 'DocumentNo');
    }
    public function statusInfo()
    {
        // Quan hệ 1-1 với bảng Status dựa trên cột 'Type'
        // Lưu ý: Phải filter thêm cột 'Table' = 'Order Purchasing'
        return $this->belongsTo(OrderStatus::class, 'Status', 'Type','Name');
    }
    public function getStatusNameAttribute()
    {
        return $this->statusInfo ;
    }
    public function originalOrderItems()
    {
        // 'MergeHeaderID' là khóa ngoại trên bảng API$Purchase Line
        // 'DocumentNo' là khóa chính của bảng API$Merge Header
        return $this->hasMany(OrderItem::class, 'MergeHeaderID', 'DocumentNo');
    }
}