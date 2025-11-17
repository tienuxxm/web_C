<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemController extends Controller
{
    public function getItem($id)
    {
        try {
            $data = DB::select("[dbo].[api_Item] @Action = ?, @Industry = ?", ["ListItem", $id]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function getIndustry()
    {
        try {
            $data = DB::select("[dbo].[api_Item] @Action = ?", ["Industry"]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
}
