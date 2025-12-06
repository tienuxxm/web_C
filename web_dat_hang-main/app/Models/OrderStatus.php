<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatus extends Model
{
    // Cấu hình kết nối tới DB chứa bảng Status (APIDB)
    protected $connection = 'sqlsrv'; 
    protected $table = 'API$Status';
    
    // Khóa chính là ID
    protected $primaryKey = 'ID';
    
    // Tắt timestamps vì bảng này thường không có created_at/updated_at chuẩn Laravel
    public $timestamps = false;

    protected $fillable = [
        'Type', 'Name', 'Table'
    ];
    protected $casts = [
        'ID' => 'integer',
        'Type' => 'integer', // Quan trọng nhất: Biến "10" thành 10
    ];
    
    // Định nghĩa các hằng số ID hoặc Type để dùng trong Controller cho dễ đọc
    // Dùng ID làm chuẩn Foreign Key
    const TYPE_MOI = 1;              // Mới
    const TYPE_CHO_DUYET = 2;        // Chờ duyệt
    const TYPE_DA_DUYET = 3;         // Đã duyệt
    const TYPE_DANG_DAT_HANG = 4;    // Đang đặt hàng
    const TYPE_HUY = 5;              // Hủy
    const TYPE_CHOT = 7;             // Chốt
    const TYPE_MERGE = 8;            // Merge (Gộp)
    const TYPE_DIEU_CHINH = 10;      // Điều chỉnh
    const TYPE_HOAN_THANH = 11;      // Hoàn thành
    
    // Scope để lấy trạng thái theo Table (nếu bảng này dùng chung cho nhiều module)
    public function scopePurchasing($query)
    {
        return $query->where('Table', 'Order Purchasing');
    }
}