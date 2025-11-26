<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject; // Bắt buộc phải có

class User extends Authenticatable implements JWTSubject
{
    // BỎ HasApiTokens (Sanctum)
    use HasFactory, Notifiable; 

    /**
     * BẮT BUỘC: Trỏ đến đúng bảng 'users' của APIDB
     */
    protected $table = 'users';
    
    // Tắt timestamp (APIDB không có cột này)
    public $timestamps = false; 

    /**
     * CÁC THUỘC TÍNH (ATTRIBUTES)
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'code', //
        'departments', //
    ];

    /**
     * BẮT BUỘC: Bỏ 'password' khỏi $hidden vì chúng ta không dùng hash của Laravel
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * BẮT BUỘC: XÓA password khỏi $casts
     * Nếu không xóa, Laravel sẽ tự động hash password bằng Bcrypt khi lưu, gây xung đột.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        // 'password' => 'hashed', // XÓA dòng này
    ];

    // JWT METHODS
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }
    
    // Mối quan hệ mẫu (Chỉ để tham khảo)
    public function roles()
    {
        return $this->belongsToMany(Role::class, 'API$UserRoles', 'UserId', 'RoleId', 'code', 'ID');
    }
}