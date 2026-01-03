<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $connection = 'sqlsrv'; 

    protected $table = 'view_Purch_ Inv_ Header';

    protected $primaryKey = 'No_'; 
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false; 

    protected $fillable = [
        'No_', 
        'Buy-from Vendor No_', 
        'Pay-to Name',
        'Order Date'
    ];
}
