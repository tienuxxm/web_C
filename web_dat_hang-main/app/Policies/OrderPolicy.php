<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Order;
use App\Models\OrderStatus; // Ensure you have this model or constants
use Illuminate\Auth\Access\HandlesAuthorization;

class OrderPolicy
{
    use HandlesAuthorization;
    public function create(User $user)
    {
        return true ;
    }
    public function update(User $user, Order $order)
    {
        if ($user->isRole('Administrator')) return true;

        if ($user->code === $order->CreatedBy) {
            return in_array($order->Status, [1, 10]);
        }

        if ($user->isRole('Supply') || $user->isRole('Leader')) {
            return true;
        }

        return false;
    }
    public function updateStatus(User $user, Order $order, int $newStatus)
    {
        $currentStatus = (int)$order->Status;
        if ($user->isRole('Administrator')) return true;
        if ($user->isRole('Sales') || $user->isInDepartment('IT')) {
            if (in_array($currentStatus, [1, 10]) && $newStatus === 1) return true;
        }
        if ($user->isRole('Supply') || $user->isInDepartment('Cung ứng')) {
            if ($currentStatus == 1 && in_array($newStatus, [7, 10, 5])) return true;

            if ($currentStatus == 7 && $newStatus == 8) return true;

            if ($currentStatus == 8 && $newStatus == 2) return true;

            if ($currentStatus == 3 && $newStatus == 4) return true;

            if ($currentStatus == 4 && $newStatus == 11) return true;
        }
        if ($user->isRole('Leader')) {
            if ($currentStatus == 2 && in_array($newStatus, [3, 5])) return true;
        }

        return false;
    }
    public function editItems(User $user, Order $order)
    {
        $currentStatus = (int)$order->Status;

        if ($user->isRole('Administrator')) return true;

        if ($user->isRole('Sales')) {
            return in_array($currentStatus, [1, 10]);
        }

        if ($user->isRole('Supply')) {
            return in_array($currentStatus, [1, 7, 8, 10]);
        }
        return false;
    }
}