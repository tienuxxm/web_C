<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
class Category extends Model
{
    // use HasFactory;

    // protected $fillable = ['name','prefix','status', 'description'];

    // public function products()
    // {
    //     return $this->hasMany(Product::class);
    // }
    // public function users()
    // {
    //     return $this->belongsToMany(User::class);
    // }
    // ... các khai báo connection, table như cũ ...
    protected $table = 'dbo.view_Industry';
    protected $primaryKey = 'Code';
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Định nghĩa quan hệ với User thông qua bảng trung gian API$rpt_Industry_Allow
     * Đây chính là phiên bản mới của bảng 'category_user'
     */
    public function users()
    {
        return $this->belongsToMany(
            User::class,                    // Model đích
            'dbo.API$rpt_Industry_Allow',   // Tên bảng trung gian (Pivot Table)
            'Industry',                     // Khóa ngoại của Category trong bảng trung gian
            'UserCode',                     // Khóa ngoại của User trong bảng trung gian
            'Code',                         // Khóa chính của Model Category hiện tại
            'code'                          // Khóa chính của Model User (lưu ý: code, không phải id)
        )
        ->withPivot('Status'); // Lấy thêm cột Status trong bảng trung gian
    }
}
