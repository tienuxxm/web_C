<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Product;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Log;

class ProductPolicy
{
    // Hằng số vai trò và phòng ban
    public const DIRECTOR = 'giam_doc';
    public const ALLOWED_DEPTS = ['KINH_DOANH', 'CUNG_UNG', 'HANH_CHANH'];

    /**
     * Helper 1: Kiểm tra xem Category của sản phẩm có active không (PA-CI Rule)
     */
    private function isCategoryActive(Product $product): bool
    {
        $product->loadMissing('category');
        
        // Nếu không có category HOẶC category status là inactive -> false
        if (!$product->category || $product->category->status !== 'active') {
            return false;
        }
        
        return true;
    }

    /**
     * Helper 2: Kiểm tra xem User có được gán vào Category của sản phẩm không
     */
    private function userManagesCategory(User $user, Product $product): bool
    {
        // Tải danh sách ID categories mà user được phép
        $allowedCategoryIds = $user->categories()->pluck('categories.id')->toArray();
        
        // Kiểm tra xem category_id của sản phẩm có nằm trong danh sách được phép không
        return in_array($product->category_id, $allowedCategoryIds);
    }

    /**
     * Quyền xem danh sách
     */
    public function viewAny(User $user): bool
    {
        return true; 
    }

    /**
     * Quyền xem chi tiết
     */
    public function view(User $user, Product $product): bool
    {
        return true;
    }

    /**
     * Quyền TẠO MỚI sản phẩm
     */
    public function create(User $user): bool
    {
        // 1. Giám đốc luôn được tạo
        if ($user->role->name_role === self::DIRECTOR) {
            return true;
        }

        // 2. Chỉ 3 phòng ban KD, CU, HC được tạo
        $deptName = $user->department->name_department ?? null;
        if (in_array($deptName, self::ALLOWED_DEPTS)) {
            return true;
        }

        return false;
    }

    /**
     * Quyền CẬP NHẬT sản phẩm (Edit/Restore)
     * (Hàm updateStatus cũng sẽ dùng policy 'update' này)
     */
    public function update(User $user, Product $product): bool
    {
        // 1. CHẶN HÀNH ĐỘNG (PA-CI Rule) - ÁP DỤNG CHO MỌI NGƯỜI
        // Chặn mọi hành động (Edit/Restore) nếu Category cha đang 'inactive'.
        // Buộc (kể cả Giám đốc) phải khôi phục Category trước.
        if (!$this->isCategoryActive($product)) {
            return false;
        }
        
        // 2. Giám đốc (Nếu Category đã Active thì Giám đốc được quyền Update)
        if ($user->role->name_role === self::DIRECTOR) {
            return true;
        }

        // 3. Phân quyền theo phòng ban và Category gán
        $deptName = $user->department->name_department ?? null;
        if (in_array($deptName, self::ALLOWED_DEPTS)) {
            // Kiểm tra xem user có được gán vào category của sản phẩm này không
            return $this->userManagesCategory($user, $product);
        }

        return false;
    }

    /**
     * Quyền XÓA MỀM sản phẩm
     */
    public function delete(User $user, Product $product): bool
    {
        // 1. CHẶN HÀNH ĐỘNG (PA-CI Rule) - ÁP DỤNG CHO MỌI NGƯỜI
        // Chặn Xóa nếu Category cha đang 'inactive'.
        if (!$this->isCategoryActive($product)) {
            return false;
        }

        // 2. Giám đốc (Nếu Category đã Active thì Giám đốc được quyền Xóa)
        if ($user->role->name_role === self::DIRECTOR) {
            return true;
        }

        // 3. Phân quyền theo phòng ban và Category gán
        $deptName = $user->department->name_department ?? null;
        if (in_array($deptName, self::ALLOWED_DEPTS)) {
            return $this->userManagesCategory($user, $product);
        }

        return false;
    }
}