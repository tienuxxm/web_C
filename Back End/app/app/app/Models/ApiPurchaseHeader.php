<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiPurchaseHeader extends Model
{
    protected $table = 'API$Purchase Header';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'Industry',
        'DocumentNo',
        'PostingDate',
        'ShipmentDate',
        'IntendedUse',
        'Supplier',
        'Status',
        'Note',
        'NoteSupply',
        'NoteManager',
        'CreatedBy',
        'CreatedDate',
        'ModifiedSupplyBy',
        'ModifiedSupplyDate',
        'ModifiedManagerBy',
        'ModifiedManagerDate',
        'ModifiedBy',
        'ModifiedDate',
    ];
}
