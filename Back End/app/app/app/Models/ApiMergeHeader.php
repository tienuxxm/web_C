<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiMergeHeader extends Model
{
    protected $table = 'API$Merge Header';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo',
        'PostingDate',
        'ShipmentDate',
        'Industry',
        'Status',
        'Note',
        'NoteManager',
        'CreatedBy',
        'CreatedDate',
        'ModifiedManagerBy',
        'ModifiedManagerDate',
        'ModifiedBy',
        'ModifiedDate',
    ];
}
