<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\Department;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserRegistrationPolicy
{
    // Constants for role names (đồng bộ với ReportPolicy)
    public const HEAD      = 'truong_phong';
    public const DIRECTOR  = 'giám đốc';
    public const DEPUTY    = 'pho_phong';
    public const EMPLOYEE  = 'nhan_vien_chinh_thuc';
    public const INTERN    = 'thuc_tap_sinh';

    // Constants for departments (nên dùng chung toàn hệ thống)
    public const DEPT_HR   = 'NHAN_SU';
    public const DEPT_IT   = 'IT';
    public const DEPT_ACCT = 'KE_TOAN';

    /**
     * Kiểm tra điều kiện phòng ban khi đăng ký user
     */
    public function validateDepartment(?string $departmentName, Role $role): Response
    {
        // Các role KHÔNG yêu cầu phòng ban
        $exemptedRoles = [self::DIRECTOR, 'admin']; // Có thể thêm vào sau
        
        if (in_array($role->name_role, $exemptedRoles)) {
            return Response::allow();
        }

        // Bắt buộc nhập phòng ban cho các role còn lại
        if (empty($departmentName)) {
            return Response::deny('Vui lòng chọn phòng ban');
        }

        // Kiểm tra phòng ban tồn tại
        if (!Department::where('name_department', $departmentName)->exists()) {
            return Response::deny('Phòng ban không tồn tại');
        }

        return Response::allow();
    }

    /**
     * Kiểm tra trưởng phòng duy nhất trong phòng ban
     */
    public function validateHeadOfDepartment(Role $role, Department $department): Response
    {
        if ($role->name_role !== self::HEAD) {
            return Response::allow();
        }

        $existingHead = User::where('role_id', $role->id)
            ->where('department_id', $department->id)
            ->exists();

        return $existingHead 
            ? Response::deny('Phòng ban này đã có trưởng phòng')
            : Response::allow();
    }

    /**
     * Kiểm tra quyền tạo user mới (ví dụ: chỉ admin mới được đăng ký user)
     */
    public function create(User $currentUser): Response
    {
        return ($currentUser->role->name_role === 'admin')
            ? Response::allow()
            : Response::deny('Bạn không có quyền đăng ký tài khoản');
    }
}