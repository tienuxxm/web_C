<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'sender_id',
        'order_id',
        'type',
        'message',
        'read',
        'expires_at',
    ];
    public function order() {
        return $this->belongsTo(Order::class, 'order_id');
    }
    public function user() {
        return $this->belongsTo(User::class, 'user_id');

    }
    public function sender() {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
