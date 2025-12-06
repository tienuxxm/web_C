<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'API$Roles'; // Tên bảng trong DB
    protected $primaryKey = 'ID';   // Khóa chính
    public $timestamps = false;     // Tắt timestamp mặc định của Laravel

    protected $fillable = ['Name', 'NormalizedName', 'Status'];
}