<?php

namespace App\Http\Controllers;
use App\Models\ApiItem;
use Auth;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ApiItemController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:250',
            'unit' => 'required|string|max:50'
        ]);
        $unique = substr(md5(uniqid(mt_rand(), true)), 0, 10);

        $item = new ApiItem();
        $item->ItemCode   = $unique;
        $item->Variant   = '000';
        $item->ItemName   = $validated['name'];
        $item->Unit  = $validated['unit'];
        $item->Status  = 1;
        $item->CreatedBy    = auth()->user()->code;
        $item->CreatedDate  = Carbon::now();

        $item->save();
        return response()->json([$item], 200);
    }

    public function getItems()
    {
        $items = ApiItem::select('ID', 'ItemCode', 'Variant', 'ItemName', 'Unit', 'Status')->get();
        return response()->json($items, 200);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'id'  => 'required|integer',
            'name'  => 'required|string|max:250',
            'unit'  => 'required|string|max:50',
            'status' => 'required|integer'
        ]);
        $item = ApiItem::findOrFail($validated['id']);

        $item->ItemName = $validated['name'];
        $item->Unit     = $validated['unit'];
        $item->Status   = $validated['status'];
        $item->ModifiedBy = auth()->user()->code;
        $item->ModifiedDate = Carbon::now();
        $item->save();
        return response()->json($item, 200);
    }

    public function getItemByPO()
    {
        $items = ApiItem::select([
            'ItemCode as Code',
            'Variant',
            'ItemName as Name',
            'Unit'
        ])
        ->where('Status', 1)
        ->get();
        return response()->json($items, 200);
    }
}
