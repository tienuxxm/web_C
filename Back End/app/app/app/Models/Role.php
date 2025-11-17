<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Role extends Model
{
    use HasFactory;

    protected $table = 'API$Roles';

    public function users()
    {
        return $this->belongsToMany(User::class, 'API$UserRoles', 'RoleId', 'UserId');
    }
}
