<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\SoftDeletes;


class Order extends Model
{
//     use  SoftDeletes;
//     /* ---------- cột ghi hàng loạt ---------- */
//    protected $fillable = ['total_amount','status','user_id','approved_by','approved_at','supplier_name','payment_method','subtotal','tax','shipping', 'payment_status','shipping_address','order_date','estimated_delivery', 'notes','merged','order_number'];

//     /* ---------- casts ---------- */
//     protected $casts = [
//         'order_date'        => 'date',
//         'estimated_delivery'=> 'date',
//     ];
//     public const STATUSES = [
//     'draft',
//     'pending',
//     'approved',
//     'fulfilled',
//     'rejected',
// ];

// public const PAYMENT_STATUSES = [
//     'pending',
//     'paid',
//     'failed',
//     'refunded',
// ];


//     /* ---------- quan hệ ---------- */
//     public function items()
//     {
//         return $this->hasMany(OrderItem::class);
//     }

//     public function creator()
//     {
//         return $this->belongsTo(User::class, 'user_id');
//     }
 
//     public function scopeOnlyCategories($query, array $categoryIds)
//     {
//         // Đảm bảo KHÔNG có item nào ngoài categoryIds
//         return $query
//             // Ít nhất 1 item thuộc category cho phép
//             ->whereHas('items.product', fn ($q) => $q->whereIn('category_id', $categoryIds))
//             // Và KHÔNG có item nào ngoài categoryIds
//             ->whereDoesntHave('items.product', fn ($q) => $q->whereNotIn('category_id', $categoryIds));
    // }
    // Kết nối APIDB
    protected $connection = 'sqlsrv'; 
    protected $table = 'dbo.API$Purchase Header'; 
    protected $primaryKey = 'DocumentNo'; // Khóa chính là DocumentNo
    public $incrementing = false; 
    protected $keyType = 'string';
    public $timestamps = false; // Bảng này dùng CreatedDate, không dùng created_at/updated_at chuẩn

    protected $fillable = [
        'DocumentNo', 
        'PostingDate',      // Ngày chứng từ
        'ShipmentDate',     // Ngày giao hàng dự kiến
        'Industry',         // Ngành hàng (Lấy từ Category)
        'IntendedUse',      // Mục đích sử dụng
        'Supplier',         // Nhà cung cấp
        'Status',           // 0: Mới, 1: Chờ duyệt...
        'Note',
        'CreatedBy',        // User Code (Ví dụ: NV-0234)
        'CreatedDate',
        'ModifiedBy',
        'ModifiedDate'
    ];

    // Quan hệ: Items hiện tại
    public function items()
    {
        return $this->hasMany(OrderItem::class, 'DocumentNo', 'DocumentNo');
    }

    // Quan hệ: User tạo đơn
    public function user()
    {
        return $this->belongsTo(User::class, 'CreatedBy', 'code'); // Map theo cột code trong bảng users
    }
    public function statusInfo()
    {
        // Quan hệ 1-1 với bảng Status dựa trên cột 'Type'
        // Lưu ý: Phải filter thêm cột 'Table' = 'Order Purchasing'
        return $this->hasOne(OrderStatus::class, 'Type', 'Status')
                    ->where('Table', 'Order Purchasing');
    }
}
