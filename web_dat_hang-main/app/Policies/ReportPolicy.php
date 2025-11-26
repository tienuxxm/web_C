<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Log;


class ReportPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public const HEAD      = 'truong_phong';
    public const DEPUTY    = 'pho_phong';
    public const EMPLOYEE  = 'nhan_vien_chinh_thuc';
    public const INTERN    = 'thuc_tap_sinh';

    
    public function viewAny(User $user): bool
    {
        return true;   // Allow all users to view any report
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Report $report): bool
    {
        $role       = $user->role->name_role;
        $dept       = $user->department->name_department;
        $ownerDept  = $report->user->department->name_department;
    
        if (in_array($role ,[self::HEAD, self::DEPUTY],true)){
            if($dept ==='NHAN_SU'){
                return $ownerDept === 'NHAN_SU';
            }
            return true; // Trưởng phòng và phó phòng có thể xem tất cả báo cáo
        }
            
        
        return  $report->user_id === $user->id;
        
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role->name_role , [self::HEAD, self::DEPUTY, self::EMPLOYEE]);
            
    }
   
    public function update(User $user, Report $report): bool
    {
        $role       = $user->role->name_role;
        $dept       = $user->department->name_department;
        $ownerDept  = $report->user->department->name_department;

        // 1) Trưởng phòng
        if ($role === self::HEAD) {
            // Trưởng phòng Nhân sự → chỉ sửa báo cáo Nhân sự
            if ($dept === self::DEPT_HR) {
                return $ownerDept === self::DEPT_HR;
            }
            // Trưởng phòng IT & Kế toán: sửa mọi báo cáo
            return true;
        }

        // 2) Phó phòng: luôn giới hạn trong phòng mình (kể cả Nhân sự)
        if ($role === self::DEPUTY) {
            return $dept === $ownerDept;
        }

        // 3) Nhân viên chính thức: chỉ sửa báo cáo của họ
        if ($role === self::EMPLOYEE) {
            return $report->user_id === $user->id;
        }

        // 4) Thực tập sinh – không được sửa
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Report $report): bool
    {
        $role       = $user->role->name_role;
        $dept       = $user->department->name_department;
        $ownerDept  = $report->user->department->name_department;

        // Chỉ trưởng phòng được xoá
        if ($role === self::HEAD) {
            // Trưởng phòng Nhân sự → chỉ xoá báo cáo Nhân sự
            if ($dept === self::DEPT_HR) {
                return $ownerDept === self::DEPT_HR;
            }
            // Trưởng phòng IT & Kế toán: xoá mọi báo cáo
            return true;
        }

        return false;    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Report $report): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Report $report): bool
    {
        return false;
    }
}
