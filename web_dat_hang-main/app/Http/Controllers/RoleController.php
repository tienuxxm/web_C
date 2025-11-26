<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Role;
class RoleController extends Controller
{
    public function role()
    {
        // Trả về danh sách các role
      $roles = Role::select('id', 'name_role as label')->get();
        return response()->json($roles);
    }
}
