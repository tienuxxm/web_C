<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class ItemVariant extends Model
{
   protected $table = 'view_Item Variant'; 
   public $timestamps = false;
   
   // Nếu view không có khóa chính:
   protected $primaryKey = null;
   public $incrementing = false;

    protected $fillable = [
        'Code',
        'Variant',
        'Name',
        'Unit',
        'Price',
    ];

}
