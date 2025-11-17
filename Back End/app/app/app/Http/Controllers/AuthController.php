<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Auth;
use Validator;
use App\Models\User;

class AuthController extends Controller
{
    public function _construct()
    {
        $this->middleware('auth:api',['except'=>['login','register']]);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(),[
            'code' => 'required|string',
            'departments' => 'required|string',
            'name' => 'required',
            'email' => 'required|string|email|unique:users',
            'password' => 'required|string|confirmed|min:6'
        ]);

        if($validator->fails()){
            return response()->json($validator->errors()->toJson(),400);
        }

        $user = User::create(array_merge(
            $validator->validated(),
            ['password'=> bcrypt($request->password)]
        ));

        return response()->json([
            'message'=>'User successfully registered',
            'user'=>$user
        ],201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(),[
            'email' => 'required|email',
            'password' => 'required|string|min:6'
        ]);

        if($validator->fails()){
            return response()->json($validator->errors()->toJson(),422);
        }

        if(!$token=auth()->attempt($validator->validated())){
            return response()->json(['error' => 'Unauthorized'],401);
        }
        return $this->createNewToken($token);
    }

    public function createNewToken($token){
        $user = auth()->user();
        $profile = DB::select("EXEC [dbo].[api_User] @Action = :action, @Mail = :mail"
                             , ['action' => 'ProfileByMail', 'mail' => $user->email]);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth()->factory()->getTTL()*60,
            'user' => $profile
        ]);
    }

    public function profile()
    {
        try {
            $user = auth()->user();
            $profile = DB::select("EXEC [dbo].[api_User] @Action = :action, @Mail = :mail"
                             , ['action' => 'ProfileByMail', 'mail' => $user->email]);
            return response()->json(['data' => $profile], 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
       
        
    }

    public function logout()
    {
        try {
            $user = auth()->user();
            if($user == null) {
                return response()->json(['error' => 'Logout failed'], 401); 
            } else {
                auth()->logout();
                return response()->json(['message' => 'Log out successfully '.$user->name], 200);
            }
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
}
