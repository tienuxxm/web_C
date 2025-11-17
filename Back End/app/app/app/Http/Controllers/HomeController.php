<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Department;
use App\Models\ApiStatus;
use Auth;

class HomeController extends Controller
{
    public function getMenuByUser(Request $request)
    {
      try {
        $user = auth()->user();
        $data = DB::select("EXEC [dbo].[api_GetMenu] @Action = :action, @CreatedBy = :usercode"
                          , ['action' => 'MenuByUserName', 'usercode' => $user->code]);
 
        return response()->json(['data' => $data], 200);
      } catch (Exception $ex) {
        return response()->json(['error' => $ex.getMessage()], 500);
      } 
    }

    public function getDepartment()
    {
      try {
        $data = Department::All();
        return response()->json($data, 200);
      } catch (Exception $ex) {
        return response()->json(['error' => $ex.getMessage()], 500);
      } 
    }

    public function getStatus()
    {
      try {
        $data = ApiStatus::selectRaw('ID as Code, Name')
              ->whereIn('Type', ['2', '3', '9'])->get();
        return response()->json($data, 200);
      } catch (Exception $ex) {
        return response()->json(['error' => $ex.getMessage()], 500);
      } 
    }

}
