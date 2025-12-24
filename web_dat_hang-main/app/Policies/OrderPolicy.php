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
        // Typically Sales or Admin create orders
        return $user->isRole('Sales') || $user->isRole('Administrator') || $user->isInDepartment('IT');
    }
    public function update(User $user, Order $order)
    {
        // Admin always can
        if ($user->isRole('Administrator')) return true;

        // Creator (Sales) can update if status is New (1) or Returned (10)
        if ($user->code === $order->CreatedBy) {
            return in_array($order->Status, [1, 10]);
        }

        // Supply/Manager can update if they have specific roles (handled in updateStatus)
        if ($user->isRole('Supply') || $user->isRole('Leader') || $user->isRole('Manage')) {
            return true;
        }

        return false;
    }
    public function updateStatus(User $user, Order $order, int $newStatus)
    {
        $currentStatus = (int)$order->Status;

        // 1. ADMIN
        if ($user->isRole('Administrator')) return true;

        // 2. SALES / IT
        if ($user->isRole('Sales') || $user->isInDepartment('IT')) {
            // Can only move from New (1) or Adjustment (10) back to New (1) (e.g. saving draft)
            if (in_array($currentStatus, [1, 10]) && $newStatus === 1) return true;
        }

        // 3. SUPPLY (Cung ứng)
        if ($user->isRole('Supply') || $user->isInDepartment('Cung ứng')) {
            // Flow 1: New (1) -> Confirmed (7), Adjustment (10), Cancel (5)
            if ($currentStatus == 1 && in_array($newStatus, [7, 10, 5])) return true;

            // Flow 2: Confirmed (7) -> Merge (8)
            if ($currentStatus == 7 && $newStatus == 8) return true;

            // Flow 3: Merge (8) -> Pending Approval (2)
            if ($currentStatus == 8 && $newStatus == 2) return true;

            // Flow 4: Approved (3) -> Ordering (4)
            if ($currentStatus == 3 && $newStatus == 4) return true;

            // Flow 5: Ordering (4) -> Completed (11)
            if ($currentStatus == 4 && $newStatus == 11) return true;
        }

        // 4. LEADER / MANAGER
        if ($user->isRole('Leader') || $user->isRole('Manage')) {
            // Flow: Pending Approval (2) -> Approved (3) or Cancel (5) (or Returned 10 if allowed)
            if ($currentStatus == 2 && in_array($newStatus, [3, 5])) return true;
        }

        return false;
    }
    public function editItems(User $user, Order $order)
    {
        $currentStatus = (int)$order->Status;

        if ($user->isRole('Administrator')) return true;

        // Sales can edit if New (1) or Adjustment (10)
        if ($user->isRole('Sales')) {
            return in_array($currentStatus, [1, 10]);
        }

        // Supply can edit in early stages: New (1), Confirmed (7), Merge (8), Adjustment (10)
        if ($user->isRole('Supply')) {
            return in_array($currentStatus, [1, 7, 8, 10]);
        }

        return false;
    }
}