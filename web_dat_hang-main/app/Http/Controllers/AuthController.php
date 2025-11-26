<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;

class AuthController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'register']]);
    }

    /**
     * HÀM LOGIN "THÔNG DỊCH VIÊN" (FIXED)
     */
    public function login(Request $request)
    {
        // 1. Xác thực đầu vào
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $email = $request->input('email');
        $password_plain_text = $request->input('password');

        try {
            // 2. TÌM & SO SÁNH MẬT KHẨU (Bảng Account)
            $account = DB::connection('sqlsrv')
                         ->table('Account')
                         ->where('Name', $email)
                         ->first();

            // 3. SO SÁNH MẬT KHẨU (Plain text vs Plain text + trim)
            if (!$account || trim($password_plain_text) !== trim($account->Password)) {
                return response()->json(['error' => 'Unauthorized: Invalid password'], 401);
            }

            // --- ĐĂNG NHẬP THÀNH CÔNG ---

            // 4. LẤY USER MODEL & THÔNG TIN PROFILE (api_User)
            $userModel = User::where('email', $email)->first(); 
            if (!$userModel) {
                 $userModel = User::create(['email' => $email, 'name' => $email, 'password' => $password_plain_text, 'code' => 'UNKNOWN']);
            }
            
            $userInfoResult = DB::connection('sqlsrv')
                                ->select('EXEC api_User @Action = ?, @Mail = ?', ['ProfileByMail', $email]);
            
            if (empty($userInfoResult)) {
                return response()->json(['error' => 'Login OK but user profile (role) not found'], 404);
            }
            $userInfo = $userInfoResult[0];

            // 5. GỌI SP LẤY MENU (api_GetMenu)
            $rawMenuList = DB::connection('sqlsrv')
                 ->select('EXEC api_GetMenu @Action = ?, @CreatedBy = ?', ['MenuByUserName', $userInfo->code]);

            // 5b. "DỊCH THUẬT" MENU (TỪ APIDB SANG FE)
            $translatedMenuList = array_map(function($menuItem) {
                return [
                    'id' => $menuItem->ID,           // FE cần 'id', DB có 'ID'
                    'name' => $menuItem->MenuName,    // FE cần 'name', DB có 'MenuName'
                    'url' => $menuItem->TagCode,     // FE cần 'url', DB có 'TagCode'
                    'parent_id' => $menuItem->Parent, // FE cần 'parent_id', DB có 'Parent'
                    'icon' => $menuItem->Icon,      // FE cần 'icon', DB có 'Icon'
                    'level' => $menuItem->Level,     //
                ];
            }, $rawMenuList); // Dùng $rawMenuList ở đây

            // 6. TẠO TOKEN VÀ CUSTOM CLAIMS (Với menu đã "dịch")
            $customClaims = [
                'code' => $userInfo->code,
                'name' => $userInfo->name,
                'role' => $userInfo->role_name,
                'department' => $userInfo->department_name,
                'menus' => $translatedMenuList, // <-- Sửa ở đây: Dùng menu đã "dịch"
            ];

            if (! $token = JWTAuth::claims($customClaims)->fromUser($userModel)) {
                 return response()->json(['error' => 'Could not create token'], 500);
            }
            
            // 7. TRUYỀN THÔNG TIN VÀO HELPER
            return $this->createNewToken($token, $userModel, $customClaims);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Database/System error: ' . $e->getMessage()], 500);
        }
    }


    /**
     * Helper tạo response token (ĐÃ SỬA: nhận customClaims)
     */
    protected function createNewToken($token, $userModel = null, $customClaims = null)
    {
        // Lấy thông tin từ $customClaims được truyền vào (nếu có), nếu không có thì đọc từ token đã parse
        $data = $customClaims ? $customClaims : auth()->payload()->toArray(); 

        // Lấy model (để phòng trường hợp createNewToken được gọi từ refresh() )
        $user = $userModel ? $userModel : auth()->user();

        return response()->json([
            'token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth()->factory()->getTTL() * 60,
            'user' => [ 
                'id' => $user->id,
                'name' => $data['name'],
                'email' => $user->email,
                'code' => $data['code'],
                'role' => $data['role'],
                'department' => $data['department'],
            ]
        ]);
    }
    
    /**
     * Lấy thông tin user đã login
     */
    public function userProfile()
    {
        // Sửa lỗi: Gọi thẳng payload qua JWTAuth để đảm bảo nó không bị lỗi context
        try {
            $payload = JWTAuth::parseToken()->getPayload(); 
            return response()->json([
                'id' => auth()->user()->id, // Lấy ID từ user đã auth
                'code' => $payload->get('code'),
                'name' => $payload->get('name'),
                'role' => $payload->get('role'),
                'department' => $payload->get('department'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Invalid or missing token.'], 401);
        }
    }

    // Giữ nguyên các hàm Logout, Refresh, Register
    public function logout()
    {
        auth()->logout();
        return response()->json(['message' => 'User successfully signed out']);
    }

    public function refresh()
    {
        return $this->createNewToken(auth()->refresh());
    }

    public function register(Request $request)
    {
         return response()->json(['error' => 'Registration is not supported'], 403);
    }
}