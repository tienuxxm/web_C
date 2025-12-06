<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    // Nếu là View thì chỉ đọc, nếu là Table thì có thể ghi.
    // Dựa vào dữ liệu bạn gửi, tên bảng có thể là 'view_Departments' hoặc bảng gốc.
    protected $table = 'view_Departments'; 
    
    protected $primaryKey = 'Code'; // Khóa chính là cột Code (VD: B140010)
    public $incrementing = false;   // Vì Code là chuỗi, không phải số tự tăng
    protected $keyType = 'string';  // Kiểu dữ liệu khóa chính
    
    public $timestamps = false;

    protected $fillable = ['Code', 'Name'];
}