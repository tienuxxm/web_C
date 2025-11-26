<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    const HEAD     = 'truong_phong';
    const DEPUTY   = 'pho_phong';
    const EMPLOYEE = 'nhan_vien_chinh_thuc';
    const INTERN   = 'thuc_tap_sinh';

    private const ALLOWED_DEPARTMENTS = ['KINH_DOANH', 'CUNG_UNG','HANH_CHANH'];

    public function before(User $user, string $ability)
    {
        if ($user->role->name_role === 'giam_doc') {
        return true;
        }   
        if (!in_array($user->department?->name_department, self::ALLOWED_DEPARTMENTS)) {
            return false; 
        }

        if (in_array($user->role->name_role, [self::HEAD, self::DEPUTY])) {
            return true;
        }

        if ($user->role->name_role === self::INTERN) {
            return false;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
       
        return true;
    }

    public function view(User $user, Order $order): bool
    {
        return $this->canAccessOrder($user, $order);
    }


    public function create(User $user): bool
    {
        return $user->isInDepartment('CUNG_UNG') || $user->isInDepartment('HANH_CHANH');
    }

    public function update(User $user, Order $order): bool
    {
        $status = $order->status;
        if ($user->isRole('giam_doc')) {
             
            return $status === 'approved';
        }

        if ($user->isInDepartment('KINH_DOANH')) {

            if ($user->isEmployee()) {
              
                return $status === 'draft' && $this->canAccessOrder($user, $order);
            }
        }

        if ($user->isInDepartment('CUNG_UNG')) {
            return in_array($status, ['pending', 'draft']);
        }

        return false; 
    }

    public function delete(User $user, Order $order): bool
    {
        return $order->status === 'draft' && $user->isInDepartment('KINH_DOANH') ;
    }

    private function canAccessOrder(User $user, Order $order): bool
    {
        $roleName = $user->role->name_role ?? '';
        $departmentName = $user->department->name_department ?? '';
        if ($roleName === 'giam_doc') {
        return true;
    }

        if (
            in_array($departmentName, self::ALLOWED_DEPARTMENTS) &&
            in_array($roleName, [self::HEAD, self::DEPUTY])
        ) {
            return true;
        }

        $allowedCategoryIds = $user->categories()->pluck('categories.id')->toArray();

        foreach ($order->items as $item) {
            if (!isset($item->product) || !in_array($item->product->category_id, $allowedCategoryIds)) {
                return false;
            }
        }

        return true; 
    }

}