<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AuthService;
use App\Http\Resources\UserResource;
use App\Models\User;

class AuthController extends Controller
{
    protected $authService;
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
        $this->middleware('auth:api', ['except' => ['login', 'register']]);
        
    }
    
    
    public function login(Request $request)
    {
        // 1. Validate
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        try {
            // 2. Gọi Service
            $result = $this->authService->login($request->email, $request->password);

            // 3. Trả về
            return response()->json([
                'message' => 'Đăng nhập thành công',
                'token' => $result['token'],
                'user' => new UserResource($result['user']), // Dùng Resource
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], $e->getCode() ?: 500);
        }
    }

    
  public function loginViaEmail(Request $request)
    {
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        // 1. Kiểm tra chữ ký (Quan trọng nhất)
        if (! $request->hasValidSignature()) {
            // Nếu link bị sửa hoặc hết hạn -> Redirect về FE báo lỗi
            return redirect("$frontendUrl/magic-auth?error=expired");
        }

        try {
            $user = User::findOrFail($request->id);

            // 3. Gọi Service tạo Token (Tái sử dụng logic chuẩn)
            $result = $this->authService->generateTokenForUser($user);
            
            $token = $result['token'];

            // 4. Lấy các tham số điều hướng
            $targetPath = $request->query('target_path', '/');
            $orderId = $request->query('order_id');

            $redirectUrl = "$frontendUrl/magic-auth?token=$token&redirect=$targetPath&open_order=$orderId";

            return redirect($redirectUrl);

        } catch (\Exception $e) {
            return redirect("$frontendUrl/login?error=system_error");
        }
    }
    
    
    

    public function register(Request $request)
    {
         return response()->json(['error' => 'Registration is not supported'], 403);
    }
}