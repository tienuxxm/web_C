<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiLog extends Model
{
    protected $table = 'api_logs';
    protected $fillable = [
        'user_id',
        'method',
        'url',
        'request_body',
        'response_body',
        'status_code',
        'ip_address',
    ];
}
