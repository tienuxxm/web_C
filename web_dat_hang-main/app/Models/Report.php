<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class Report extends Model
{

    protected $fillable = [
    'product_name',
    'quantity',
    'color',
    'revenue',
    'user_id',
        ];
    protected $casts = [
            'user_id' => 'integer',
        ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
