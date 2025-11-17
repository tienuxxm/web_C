<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class ApiCart extends Model
{
   protected $table = 'API$Cart'; 
   protected $primaryKey = 'ID';
   public $timestamps = false; 

    protected $fillable = [
        'ItemCode',
        'Variant',
        'ItemName',
        'Unit',
        'Quantity',
        'Inventory',
        'Price',
        'Status',
        'CreatedBy',
        'CreatedDate',
        'ModifiedBy',
        'ModifiedDate',
    ];

}
