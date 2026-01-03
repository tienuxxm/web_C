<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorItem extends Model
{
    protected $connection = 'sqlsrv';
    protected $table = 'view_Purch_ Rcpt_ Line';

    protected $primaryKey = 'No_'; 
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
}
