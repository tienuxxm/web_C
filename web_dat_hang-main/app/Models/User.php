<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $table = 'users';
    public $timestamps = false;

    protected $fillable = [
        'name', 'email', 'password', 'code', 'departments'
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = ['email_verified_at' => 'datetime'];

    // --- JWT ---
    public function getJWTIdentifier() { return $this->getKey(); }
    public function getJWTCustomClaims() { return []; }


    public function roles()
    {
        return $this->belongsToMany(
            Role::class,       // Model đích
            'API$UserRoles',   // Bảng trung gian
            'UserId',          // Khóa ngoại bảng trung gian trỏ về User (lưu mã NV)
            'RoleId',          // Khóa ngoại bảng trung gian trỏ về Role (lưu ID)
            'code',            // Khóa chính (local key) của User dùng để liên kết
            'ID'               // Khóa chính (local key) của Role
        );
    }

    /**
     * 2. Quan hệ với Department (Một-Một / BelongsTo)
     * - User: cột 'departments' lưu mã phòng (VD: B140010)
     * - Department: cột 'Code' là khóa chính
     */
    public function department()
    {
        return $this->belongsTo(Department::class, 'departments', 'Code');
    }

    // ==========================================
    // HELPER METHODS (Dùng cho check quyền)
    // ==========================================

    /**
     * Kiểm tra User có Role cụ thể không?
     * VD: $user->isRole('Sales') hoặc $user->isRole('Supply')
     * Dữ liệu role: Name = Sales, Supply, Manage...
     */
    public function isRole($roleName)
    {
        // Duyệt qua danh sách roles của user này
        foreach ($this->roles as $role) {
            // So sánh tên (NormalizedName hoặc Name)
            // NormalizedName thường viết hoa (SALES), ta so sánh an toàn
            if (strtoupper($role->Name) === strtoupper($roleName) || 
                strtoupper($role->NormalizedName) === strtoupper($roleName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra User có thuộc Phòng ban cụ thể không?
     * VD: $user->isInDepartment('Kinh doanh')
     */
    public function isInDepartment($deptKeyword)
    {
        // 1. Nếu không có phòng ban -> false
        if (!$this->department) return false;

        // 2. Lấy tên và mã phòng ban
        $deptName = $this->department->Name; // VD: Kinh doanh Kênh GT - Miền Bắc
        $deptCode = $this->department->Code; // VD: B140010

        // 3. So sánh
        // Cách A: So sánh chính xác mã (Nên dùng nếu biết mã)
        if (strtoupper($deptCode) === strtoupper($deptKeyword)) return true;

        // Cách B: So sánh tên chứa từ khóa (Tìm chữ 'Kinh doanh' trong tên)
        // Dùng mb_stripos để tìm kiếm không phân biệt hoa thường tiếng Việt
        if (mb_stripos($deptName, $deptKeyword) !== false) {
            return true;
        }

        return false;
    }
    // Trong file app/Models/User.php

// 1. Khai báo quan hệ với Category (Ngành hàng) như bạn đã gửi
public function allowedIndustries()
{
    return $this->belongsToMany(
        Category::class,                // Model đích
        'dbo.API$rpt_Industry_Allow',   // Bảng trung gian
        'UserCode',                     // Khóa ngoại của User (trong bảng trung gian)
        'Industry',                     // Khóa ngoại của Category (trong bảng trung gian)
        'code',                         // Khóa chính của User (là cột 'code')
        'Code'                          // Khóa chính của Category
    )
    ->withPivot('Status')
    ->wherePivot('Status', 1); // Giả sử Status = 1 là đang Active (được cấp quyền)
}

/**
 * Helper function: Kiểm tra User có quyền với ngành hàng này không?
 * Dùng cho Policy
 */
public function canAccessIndustry($industryCode)
{
    // Lấy danh sách Code ngành hàng user được phép
    // Cache lại 60s hoặc dùng request cache để không query database liên tục nếu check nhiều
    $allowedCodes = $this->allowedIndustries()->pluck('Code')->toArray();
    
    return in_array($industryCode, $allowedCodes);
}
}