<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MergeOrder extends Model
{
    protected $table = 'API$Merge Header';
    protected $primaryKey = 'DocumentNo';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'DocumentNo', 'PostingDate', 'ShipmentDate', 'Industry', 
        'Status', 'Note', 'CreatedBy', 'CreatedDate','ModifiedBy','ModifiedDate','NoteManager','ModifiedManagerBy','ModifiedManagerDate'
    ];

    public function items()
    {
        return $this->hasMany(MergeOrderItem::class, 'DocumentNo', 'DocumentNo');
    }
    public function statusInfo()
    {
       
        return $this->belongsTo(OrderStatus::class, 'Status', 'Type','Name');
    }
    public function getStatusNameAttribute()
    {
        return $this->statusInfo ;
    }
    public function originalOrderItems()
    {
        return $this->hasMany(OrderItem::class, 'MergeHeaderID', 'DocumentNo');
    }
    public function user()
    {
        return $this->belongsTo(User::class, 'CreatedBy', 'code'); // Map theo cột code trong bảng users
    }
    public function managerUser()
    {
        return $this->belongsTo(User::class, 'ModifiedManagerBy', 'code');
    }
     public function modifierUser()
    {
        return $this->belongsTo(User::class, 'ModifiedBy', 'code');
    }
    
}