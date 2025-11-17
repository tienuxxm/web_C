<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiStatus extends Model
{
    protected $table = 'API$Status';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        // 'ID',
        'Type',
        'Name',
        'Table',
    ];
}
