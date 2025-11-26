<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Category;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Log;

class CategoryPolicy
{
    /**
     * Create a new policy instance.
     */
    public const HEAD      = ['truong_phong', 'pho_phong'];
    public const EMPLOYEE  = 'nhan_vien_chinh_thuc';
    public const INTERN    = 'thuc_tap_sinh';
    public const DIRECTOR  = 'giam_doc';
    private const ALLOWED_DEPARTMENTS = ['KINH_DOANH', 'CUNG_UNG','HANH_CHANH'];

    public function __construct()
    {
        //
    }
    public function viewAny(User $user): bool
    {
        // Lấy Role từ Token (mà chúng ta đã nhét vào khi login)
        $roleName = auth()->payload()->get('role');
        
        // Logic của bạn: Admin và Sales có thể xem
        return in_array($roleName, ['Administrator', 'Sales', 'Manager']) || $roleName === 'giam_doc';
    }
    public function view(User $user, Category $category): bool
    {
        return true;
    }

    private function canManageCategories(User $user): bool
    {
        $userRole = $user->role->name_role;
        if ($userRole === self::DIRECTOR) {
            return true;
        }
        if (!$user->department) {
            // Nếu không phải Giám đốc VÀ không có phòng ban -> Cấm
            return false; 
        }
        $userDept = $user->department->name_department;        
        
        // 2. Trưởng phòng (truong_phong) hoặc Phó phòng (pho_phong)
        $isManager = in_array($userRole, self::HEAD);

        // 3. Thuộc các phòng ban: Cung ứng, Hành chánh, Kinh doanh
        $inAllowedDept = in_array($userDept, self::ALLOWED_DEPARTMENTS);

        // Phải là Manager VÀ thuộc phòng ban được phép
        if ($isManager && $inAllowedDept) {
            return true;
        }

        // 4. Tất cả trường hợp còn lại: Không được phép
        return false;
    }

    public function create(User $user): bool
    {
        return $this->canManageCategories($user);
    }
    
    public function update(User $user, Category $category): bool
    {
       return $this->canManageCategories($user);
    }
    public function delete(User $user, Category $category): bool
    {
       return $this->canManageCategories($user);
    }
}
