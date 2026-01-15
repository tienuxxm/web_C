<?php
namespace App\Services;

use App\Repositories\AuthRepository;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Jobs\SendEmailLoginJob;
use Illuminate\Support\Facades\URL;
use Exception;

class AuthService
{
    protected $authRepo;

    public function __construct(AuthRepository $authRepo)
    {
        $this->authRepo = $authRepo;
    }

    public function generateTokenForUser($user)
    {
        // Logic lấy Role/Dept cũ của bạn ở đây...
        // Reload user để đảm bảo có relation
        $userLoaded = $this->authRepo->getUserWithProfile($user->email);
        
        $roleName = $userLoaded->roles->first()?->Name ;
        $deptName = $userLoaded->department?->Name;

        $customClaims = [
            'code' => $userLoaded->code,
            'name' => $userLoaded->name,
            'role' => $roleName,
            'department' => $deptName,
        ];

        $token = JWTAuth::claims($customClaims)->fromUser($userLoaded);

        return [
            'token' => $token,
            'user' => $userLoaded
        ];
    }
    public function generateTokenOnly($user)
    {
        // 1. Reload user để lấy thông tin mới nhất
        $userLoaded = $this->authRepo->getUserWithProfile($user->email);
        
        // 2. Tạo Claims (Thông tin nhét vào token)
        $roleName = $userLoaded->roles->first()?->Name ?? 'Guest';
        $deptName = $userLoaded->department?->Name ?? 'N/A';

        $customClaims = [
            'code' => $userLoaded->code,
            'name' => $userLoaded->name,
            'role' => $roleName,
            'department' => $deptName,
        ];

        // 3. Tạo và trả về chuỗi Token
        return JWTAuth::claims($customClaims)->fromUser($userLoaded);
    }
   
    public function sendEmailLoginLink($userOrEmail, $targetPath = '/', $orderId = null, $autoSend = true)
    {
        $user = null;

        if ($userOrEmail instanceof \App\Models\User) {
            $user = $userOrEmail; // Đã là object User rồi thì dùng luôn
        } else {
            $user = $this->authRepo->findUserByEmail($userOrEmail);
        }

        if (!$user) {
            throw new \Exception("User not found / Invalid input");
        }

        // 2. Tạo Link
        $url = URL::temporarySignedRoute(
            'auth.email-login', 
            now()->addHours(48),
            [
                'id' => $user->id,
                'target_path' => $targetPath,
                'order_id' => $orderId
            ]
        );

       
        if ($autoSend) {
            SendEmailLoginJob::dispatch($user, $url);
        }

        return $url;
    }

    public function login($email, $password)
    {
        if (!$this->authRepo->verifyLegacyCredentials($email, $password)) {
            throw new Exception('Thông tin đăng nhập không chính xác', 401);
        }

        $user = $this->authRepo->syncUser($email, $password);

       
        $userLoaded = $this->authRepo->getUserWithProfile($email);

        if (!$userLoaded) throw new Exception('Lỗi đồng bộ dữ liệu người dùng', 500);

        $roleName = $userLoaded->roles->first()->Name ?? 'Guest'; // Lấy tên Role đầu tiên
        $deptName = $userLoaded->department->Name ?? 'N/A';       // Lấy tên Phòng ban

        $customClaims = [
            'code' => $userLoaded->code,
            'name' => $userLoaded->name,
            'role' => $roleName,       // "Sales", "Leader"...
            'department' => $deptName, // "Phòng Kinh Doanh"...
        ];

        // 5. Tạo Token
        $token = JWTAuth::claims($customClaims)->fromUser($userLoaded);
        return [
            'token' => $token,
            'user'  => $userLoaded
        ];
        return $this->generateTokenForUser($user);

    }
}