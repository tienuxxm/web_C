<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiPurchase extends Model
{
    protected $table = 'API$Purchase'; 
    protected $primaryKey = 'ID'; 
    public $timestamps = false; 
    
    protected $fillable = [
        'DocumentNo',
        'PostingDate',
        'IntendedUse',
        'Supplier',
        'ItemCode',
        'Variant',
        'ItemName',
        'Unit',
        'Quantity',
        'Price',
        'Status',
        'Note',
        'NoteApprove',
        'CreatedBy',
        'CreatedDate',
        'ModifiedBy',
        'ModifiedDate',
    ];

    // protected $casts = [
    //     'PostingDate' => 'date',
    //     'CreatedDate' => 'datetime',
    //     'ModifiedDate' => 'datetime',
    //     'Quantity' => 'float',
    //     'Price' => 'float',
    //     'Status' => 'integer',
    // ];
}
