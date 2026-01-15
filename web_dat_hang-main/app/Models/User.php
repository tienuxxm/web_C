<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $table = 'users';
    public $timestamps = false;

    protected $fillable = [
        'name',
        'email',
        'password',
        'code',
        'departments'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['email_verified_at' => 'datetime'];

    public function getJWTIdentifier(){return $this->getKey();}
    public function getJWTCustomClaims(){return [];}


    public function roles()
    {
        return $this->belongsToMany(
            Role::class,       
            'API$UserRoles',   
            'UserId',          
            'RoleId',          
            'code',            
            'ID'               
        );
    }

    
    public function department()
    {
        return $this->belongsTo(Department::class, 'departments', 'Code');
    }

   
    public function isRole($roleName)
    {
        return $this->roles->contains(function ($role) use ($roleName) {
            return strtoupper($role->Name) === strtoupper($roleName) ||
                strtoupper($role->NormalizedName) === strtoupper($roleName);
        });
    }

    
    public function isInDepartment($deptKeyword)
    {
        if (!$this->department) return false;

        $deptName = $this->department->Name; 
        $deptCode = $this->department->Code; 
        if (strtoupper($deptCode) === strtoupper($deptKeyword)) return true;

        if (mb_stripos($deptName, $deptKeyword) !== false) {
            return true;
        }

        return false;
    }

    public function allowedIndustries()
    {
        return $this->belongsToMany(
            Category::class,                
            'dbo.API$rpt_Industry_Allow',   
            'UserCode',                     
            'Industry',                     
            'code',                         
            'Code'                         
        )
            ->withPivot('Status')
            ->wherePivot('Status', 1); 
    }

    
    public function canAccessIndustry($industryCode)
    {
        
        $allowedCodes = $this->allowedIndustries->pluck('Code')->toArray();

        return in_array($industryCode, $allowedCodes);
    }
    public function orders(): HasMany
    {

        return $this->hasMany(Order::class, 'CreatedBy', 'code');
    }
    public function mergeOrders()
    {
    
        return $this->hasMany(MergeOrder::class, 'CreatedBy', 'code');
    }
}
