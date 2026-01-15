<?php
namespace App\Repositories;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Account;

class AuthRepository
{
    public function verifyLegacyCredentials($email, $password)
    {
        $account = Account::where('Name', $email)->first();
        
        if ($account && trim($account->Password) === trim($password)) {
            return true;
        }
        return false;
    }

   
    public function syncUser($email, $password)
    {
        // Tìm user trong bảng users của Laravel
        $user = User::where('email', $email)->first();

        if (!$user) {
            
            throw new \Exception('Tài khoản này chưa được kích hoạt trên hệ thống mới. Vui lòng liên hệ Admin.', 404);
        }
        $user->password = Hash::make($password) ; 
        
        
        
        $user->save();

        return $user;
    }
    public function findUserByEmail($email)
    {
        return User::where('email', $email)->first();
    }
    // 3. Lấy User đầy đủ kèm Role và Department
    public function getUserWithProfile($email)
    {
        return User::with(['roles', 'department'])
                   ->where('email', $email)
                   ->first();
    }
}