<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class VendorItem extends Model
{
    protected $connection = 'sqlsrv';
    protected $table = 'view_Purch_ Rcpt_ Line';

    // 1. Tắt tính năng tự tăng (Auto Increment)
    public $incrementing = false;

    // 2. Tắt Timestamps (vì view thường không có created_at/updated_at)
    public $timestamps = false;

    // 3. Khai báo khóa chính là mảng (Laravel mặc định không hỗ trợ, ta phải xử lý ở bước 4)
    protected $primaryKey = ['Document No_', 'Line No_'];

    // 4. Override phương thức này để Laravel biết cách tìm bản ghi duy nhất
    // (Dù là Read-only, điều này giúp các hàm như find() hoặc refresh() hoạt động đúng)
    protected function setKeysForSaveQuery($query)
    {
        $keys = $this->getKeyName();
        if(!is_array($keys)){
            return parent::setKeysForSaveQuery($query);
        }

        foreach($keys as $keyName){
            $query->where($keyName, '=', $this->getAttribute($keyName));
        }

        return $query;
    }

    // Các cột có thể fill (để an toàn)
    protected $fillable = [
        'Document No_', 
        'Line No_',
        'Buy-from Vendor No_',
        'Shortcut Dimension 1 Code', // Mã ngành
        'No_' // Mã sản phẩm
    ];
    
    // Định nghĩa kiểu dữ liệu cho khóa chính (nếu cần thiết)
    // protected $keyType = 'string'; // Không cần thiết lắm khi dùng mảng
}