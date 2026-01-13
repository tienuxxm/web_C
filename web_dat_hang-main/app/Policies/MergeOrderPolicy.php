<?php

namespace App\Policies;

use App\Models\User;
use App\Models\MergeOrder;
use App\Models\OrderStatus; 
use Illuminate\Auth\Access\HandlesAuthorization;

class MergeOrderPolicy
{
    use HandlesAuthorization;

   
    public function updateStatus(User $user, MergeOrder $order, int $newStatus)
    {
        $currentStatus = (int)$order->Status;

        // 1. ADMIN: Quyền lực tuyệt đối
        if ($user->isRole('Administrator')) {
            return true;
        }

        // 2. NHÓM CUNG ỨNG (Supply)
        if ($user->isRole('Supply') || $user->isInDepartment('Cung ứng')) {
            // Flow 1: Nháp (8) -> Gửi duyệt (2)
            if ($currentStatus == OrderStatus::TYPE_MERGE && $newStatus == OrderStatus::TYPE_CHO_DUYET) return true;

            // Flow 2: Đã duyệt (3) -> Đang đặt hàng (4)
            if ($currentStatus == 3 && $newStatus == 4) return true;

            // Flow 3: Đang đặt hàng (4) -> Hoàn thành (11)
            if ($currentStatus == 4 && $newStatus == 11) return true;
            
            // Bổ sung: Cho phép hủy từ Nháp (8 -> 5) nếu cần
            if ($currentStatus == 5 && $newStatus == 10) return true;
        }

        // 3. NHÓM LÃNH ĐẠO (Leader / Manager)
        if ($user->isRole('Leader') || $user->isRole('Manage')) {
            // Chỉ xử lý khi đơn đang chờ duyệt (2)
            if ($currentStatus == 2) {
                // Duyệt (3) hoặc Từ chối/Trả về (5 hoặc 10)
                if (in_array($newStatus, [3, 5, 10])) return true;
            }
        }

        // 4. SALES (Nếu có quyền sửa lại đơn khi bị trả về)
        if ($user->isRole('Sales')) {
           
            if ($currentStatus == 10 && in_array($newStatus, [2, 8])) return true;
        }
        return false;
    }
}