<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\SoftDeletes;


class Order extends Model
{

    // Kết nối APIDB
    protected $connection = 'sqlsrv';
    protected $table = 'dbo.API$Purchase Header';
    protected $primaryKey = 'DocumentNo'; // Khóa chính là DocumentNo
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // Bảng này dùng CreatedDate, không dùng created_at/updated_at chuẩn

    protected $fillable = [
        'DocumentNo',
        'PostingDate',
        'ShipmentDate',
        'Industry',
        'IntendedUse',
        'Supplier',
        'Status',
        'Note',
        'NoteSupply',
        'NoteManager',
        'CreatedBy',
        'CreatedDate',
        'ModifiedBy',
        'ModifiedDate',
        'ModifiedSupplyBy',
        'ModifiedSupplyDate',
        'ModifiedManagerBy',
        'ModifiedManagerDate'
    ];

    // Quan hệ: Items hiện tại
    public function items()
    {
        return $this->hasMany(OrderItem::class, 'DocumentNo', 'DocumentNo');
    }

    // Quan hệ: User tạo đơn
    public function user()
    {
        return $this->belongsTo(User::class, 'CreatedBy', 'code'); // Map theo cột code trong bảng users
    }
    public function supplyUser()
    {
        return $this->belongsTo(User::class, 'ModifiedSupplyBy', 'code');
    }

    public function managerUser()
    {
        return $this->belongsTo(User::class, 'ModifiedManagerBy', 'code');
    }

    public function modifierUser()
    {
        return $this->belongsTo(User::class, 'ModifiedBy', 'code');
    }
    public function statusInfo()
    {
        return $this->belongsTo(OrderStatus::class, 'Status', 'Type', 'Name');
    }
    public function getStatusNameAttribute()
    {
        return $this->statusInfo;
    }
}
