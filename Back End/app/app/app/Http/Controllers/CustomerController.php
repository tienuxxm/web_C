<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function getCustomer()
    {
        try {
            $data = DB::select("[dbo].[api_Customer] @Action = ?", ["ListCustomer"]);
            return response()->json(['data' => $data], 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function getData()
    {
        try {
            return response()->json(['data' => 'Nguyễn Văn Thanh'], 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
}
