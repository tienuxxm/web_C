<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $table = 'dbo.Account'; // Bảng gốc
    protected $primaryKey = 'Name';   // Khóa chính là Username/Email
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
}
