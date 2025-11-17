<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class ApiItem extends Model
{
   protected $table = 'API$Item';
   protected $primaryKey = 'ID';
   public $timestamps = false; 

   protected $fillable = [
        'ItemCode',
        'Variant',
        'ItemName',
        'Unit',
        'Status',
        'CreatedBy',
        'CreatedDate',
        'ModifiedBy',
        'ModifiedDate',
    ];
}
