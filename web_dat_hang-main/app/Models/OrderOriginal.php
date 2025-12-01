<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderOriginal extends Model
{
    protected $connection = 'sqlsrv';
    protected $table = 'dbo.API$Purchase';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo', 'PostingDate', 'IntendedUse', 'Supplier',
        'ItemCode', 'Variant', 'ItemName', 'Unit', 'Quantity', 'Price',
        'Status', 'Note', 'CreatedBy', 'CreatedDate'
    ];
}