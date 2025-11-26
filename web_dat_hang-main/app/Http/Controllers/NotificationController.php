<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\Notification;
class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = JWTAuth::user();
        \Log::info('🔍 Current user ID: ' . $user->id);

        // Lấy danh sách notification còn hiệu lực
        $notifications = Notification::with('order') // cần để truy cập order->status
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get();

        // Áp dụng policy lọc từng cái
        $filtered = $notifications->filter(function ($notification) use ($user) {
            return $user->can('view', $notification);
        })->values()->take(10); // Giới hạn 10 cái mới nhất sau khi lọc

        return response()->json([
            'message' => 'Danh sách thông báo',
            'notifications' => $filtered
        ]);
    }


    public function markRead(Request $request)
    {
        $user = JWTAuth::user();
        Notification::where('user_id', $user->id)
            ->where('read', false)
            ->update(['read' => true]);

        return response()->json(['message' => 'Marked as read']);
    }
}

