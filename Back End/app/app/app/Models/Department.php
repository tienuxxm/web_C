<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Department extends Model
{
   protected $table = 'view_Departments'; 
   public $timestamps = false;
   
   // Nếu view không có khóa chính:
   protected $primaryKey = null;
   public $incrementing = false;

    protected $fillable = [
        'Code', 
        'Name',
    ];
}
