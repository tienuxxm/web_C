<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Department;

class DepartmentController extends Controller
{
    public function department()
    {
        // Trả về danh sách các phòng ban
        $departments = Department::select('id', 'name_department as label')->get();
        return response()->json($departments);
    }
}
