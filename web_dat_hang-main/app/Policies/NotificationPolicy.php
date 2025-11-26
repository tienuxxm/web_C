<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Notification;

class NotificationPolicy
{
   public function view(User $user, Notification $notification)
    {
        // Nếu đơn hàng không tồn tại => không hiển thị
        if (!$notification->order) {
            return false;
        }

        $status = $notification->order->status;
        $role = $user->role->name_role;
        $department = $user->department->name_department?? null;

        if ($role === 'giam_doc') {
            return $status === 'approved';
        }

        if (in_array($role, ['truong_phong', 'pho_phong']) && $department === 'CUNG_UNG') {
            return in_array($status, ['pending']);
        }

        if (in_array($role, ['truong_phong', 'pho_phong', 'nhan_vien_chinh_thuc']) && $department === 'KINH_DOANH') {
            return $status === 'draft'; // đơn bị trả về
        }

        return false;
    }
}
