<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiPurchaseLine extends Model
{
    protected $table = 'API$Purchase Line'; 
    protected $primaryKey = 'ID';
    public $timestamps = false; 

    protected $fillable = [
        'DocumentNo',
        'Line',
        'PostingDate',
        'ItemCode',
        'Variant',
        'ItemName',
        'Unit',
        'Quantity',
        'QuantityOld',
        'Price',
        'Status',
        'CreatedBy',
        'CreatedDate',
        'ModifiedBy',
        'ModifiedDate',
        'MergeHeaderID',
    ];
}
