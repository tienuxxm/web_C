<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OrderPolicy
{
    use HandlesAuthorization;

    // --- 1. ĐỊNH NGHĨA CÁC HẰNG SỐ (CONST) ---
    
    // Role & Department
    const ROLE_SALES = 'Sales';
    const ROLE_LEADER = 'Leader';
    const DEPT_SUPPLY = ['Cung ứng', 'Hành chính - Miền Nam'];

    // Trạng thái đơn hàng (Mapping theo ID trong database)
    const STATUS_MOI_TAO    = 1;
    const STATUS_DA_DUYET   = 3;
    const STATUS_CHOT_DON   = 7;
    const STATUS_CHO_DUYET  = 8; // Gộp
    const STATUS_TRA_VE     = 10; // Điều chỉnh

    /**
     * Chạy trước tất cả các check khác.
     * Super Admin hoặc Giám đốc luôn có full quyền.
     */
    public function before(User $user, string $ability)
    {
        if ($user->isRole(self::ROLE_LEADER) || $user->isRole('Administrator')) {
            return true;
        }
        
        // Không return false ở đây để code chạy tiếp xuống các hàm dưới
        return null;
    }

    /**
     * Ai được xem chi tiết đơn hàng?
     */
    public function view(User $user, Order $order)
{
    // --- TRƯỜNG HỢP 1: SALES ---
    // Sales chỉ thấy đơn chính chủ
    if ($user->isRole('Sales')) {
        return $user->code === $order->CreatedBy;
    }

    // --- TRƯỜNG HỢP 2: CUNG ỨNG / HÀNH CHÍNH ---
    // Kiểm tra xem User này có được gán quyền cho Ngành hàng của đơn này không
    // Giả sử trong bảng Order có cột 'Industry' lưu mã ngành hàng
    if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
        return $user->canAccessIndustry($order->Industry);
    }
    
    // Mặc định chặn
    return false;
}

    /**
     * Logic Tạo đơn: Sales, Leader hoặc User mới tinh
     */
    public function create(User $user): bool
    {
        // 1. Cho phép nếu là Sales hoặc Leader
        if ($user->isRole(self::ROLE_SALES) || $user->isRole(self::ROLE_LEADER)) {
            return true;
        }

        // 2. Logic User mới (Chưa có Role & Chưa có Phòng ban)
        // Lưu ý: Cần đảm bảo relation 'departments' và 'roles' đã được load hoặc check count
        $hasNoDepartment = $user->departments()->count() === 0;
        $hasNoRole       = $user->roles()->count() === 0;

        if ($hasNoDepartment && $hasNoRole) {
            return true;
        }

        return false;
    }

    /**
     * Logic Sửa đơn: Phân quyền chặt chẽ theo Status
     */
    public function update(User $user, Order $order): bool
    {
        $status = (int) $order->Status;

        // --- ƯU TIÊN 1: NHÓM CUNG ỨNG ---
        // Cung ứng quyền to nhất trong việc xử lý đơn
        if ($this->isSupply($user)) {
            // Được sửa khi: Mới, Chốt, Chờ duyệt, Trả về
            return in_array($status, [
                self::STATUS_MOI_TAO, 
                self::STATUS_CHOT_DON, 
                self::STATUS_CHO_DUYET, 
                self::STATUS_TRA_VE
            ]);
        }

        // --- ƯU TIÊN 2: LEADER ---
        // Leader duyệt đơn
        if ($user->isRole(self::ROLE_LEADER)) {
            // Được sửa khi: Chờ duyệt, Đã duyệt (có thể cần sửa lại thông tin sau khi duyệt)
            return in_array($status, [
                self::STATUS_CHO_DUYET, 
                self::STATUS_DA_DUYET
            ]);
        }

        // --- ƯU TIÊN 3: SALES (Người tạo) ---
        // Sales bị hạn chế nhiều nhất, chỉ sửa được đơn của mình
        if ($user->isRole(self::ROLE_SALES)) {
            // Check chính chủ: So sánh User Code hoặc ID
            if ($user->code !== $order->CreatedBy) {
                return false;
            }
            
            // Chỉ được sửa khi là Nháp (1) hoặc bị Trả về (10)
            return in_array($status, [
                self::STATUS_MOI_TAO, 
                self::STATUS_TRA_VE
            ]);
        }

        return false;
    }

    /**
     * Logic Xóa đơn: Chỉ cho xóa đơn Nháp
     */
    public function delete(User $user, Order $order): bool
    {
        // Chỉ xóa được đơn Mới tạo (Nháp)
        if ((int)$order->Status !== self::STATUS_MOI_TAO) {
            return false;
        }

        // Sales chỉ xóa đơn mình
        if ($user->isRole(self::ROLE_SALES)) {
            return $user->code === $order->CreatedBy;
        }

        // Cung ứng có thể xóa đơn rác (Tùy nghiệp vụ, nếu không cho thì bỏ đoạn này)
        if ($this->isSupply($user)) {
            return true;
        }

        return false;
    }

    // --- CÁC HÀM HELPER (PRIVATE) ---

    /**
     * Check nhanh xem user có thuộc nhóm Cung ứng không
     */
    private function isSupply(User $user): bool
    {
        // Giả định User model có hàm isInDepartment, 
        // hoặc bạn có thể check thủ công trong relation departments
        foreach (self::DEPT_SUPPLY as $deptName) {
            if ($user->isInDepartment($deptName)) {
                return true;
            }
        }
        return false;
    }
        // Thêm vào trong class OrderPolicy
    public function viewAny(User $user)
    {
        // Ai đăng nhập cũng được vào xem danh sách (dữ liệu sẽ lọc sau)
        return true; 
    }
}