<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $connection = 'sqlsrv'; 
    protected $table = 'view_Vendor'; // Đổi về bảng Master

    protected $primaryKey = 'No_'; // Khóa chính là Mã NCC
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false; 

    protected $fillable = [
        'No_', 
        'Name', 
        'Address',
        'Vendor Posting Group'
    ];


    public function receiptLines()
    {
        return $this->hasMany(
            VendorItem::class, 
            'Buy-from Vendor No_', // Khóa ngoại bên bảng Lines
            'No_'                  // Khóa chính bên bảng Vendor
        );
    }
}