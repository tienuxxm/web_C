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
        $userLoaded = $this->authRepo->getUserWithProfile($user->email);
        $roleName = $userLoaded->roles->first()?->Name ?? 'Guest';
        $deptName = $userLoaded->department?->Name ?? 'N/A';
        $customClaims = [
            'code' => $userLoaded->code,
            'name' => $userLoaded->name,
            'role' => $roleName,
            'department' => $deptName,
        ];
        $oldTTL = config('jwt.ttl');
        config(['jwt.ttl' => 1440]);
        try {
            $token = JWTAuth::claims($customClaims)->fromUser($userLoaded);
        } finally {
            config(['jwt.ttl' => $oldTTL]);
        }
        
        return $token;
    }
   
    

    public function login($email, $password)
    {
        if (!$this->authRepo->verifyLegacyCredentials($email, $password)) {
            throw new Exception('Thông tin đăng nhập không chính xác', 401);
        }

        $user = $this->authRepo->syncUser($email, $password);

       
        $userLoaded = $this->authRepo->getUserWithProfile($email);

        if (!$userLoaded) throw new Exception('Lỗi đồng bộ dữ liệu người dùng', 500);

        $roleName = $userLoaded->roles->first()->Name ?? 'Guest'; 
        $deptName = $userLoaded->department->Name ?? 'N/A';      
        $customClaims = [
            'code' => $userLoaded->code,
            'name' => $userLoaded->name,
            'role' => $roleName,      
            'department' => $deptName, 
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