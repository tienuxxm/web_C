<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatus extends Model
{
    protected $connection = 'sqlsrv';
    protected $table = 'dbo.API$Status';
    public $timestamps = false;

    // Scope để chỉ lấy trạng thái của đơn hàng
    public function scopeOrderPurchasing($query)
    {
        return $query->where('Table', 'Order Purchasing');
    }
}