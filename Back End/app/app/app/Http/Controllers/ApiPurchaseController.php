<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\ApiPurchase;
use Auth;
use Carbon\Carbon;

class ApiPurchaseController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'document' => 'required',
            'postingDate' => 'required|date',
            'intendedUse' => 'required',
            'supplier' => 'required',
            'itemcode' => 'required',
            'variant' => 'required',
            'description' => 'required',
            'unit' => 'required',
            'quantity' => 'required|integer|min:1',
            'price' => 'required|numeric',
            'note' => 'required'
        ]);

        $purchase = new ApiPurchase();
        $purchase->DocumentNo   = $validated['document'];
        $purchase->PostingDate  = $validated['postingDate'];
        $purchase->IntendedUse  = $validated['intendedUse'];
        $purchase->Supplier     = $validated['supplier'];
        $purchase->ItemCode     = $validated['itemcode'];
        $purchase->Variant      = $validated['variant'];
        $purchase->ItemName     = $validated['description'];
        $purchase->Unit         = $validated['unit'];
        $purchase->Quantity     = $validated['quantity'];
        $purchase->Price        = $validated['price'];
        $purchase->Status       = 1;
        $purchase->Note         = $validated['note'];
        $purchase->CreatedBy    = auth()->user()->code;
        $purchase->CreatedDate  = Carbon::now();

        $purchase->save();

        return response()->json('true', 200);
    }
    
    public function insertlines(Request $request)
    {
        $validated = $request->validate([
            'document'     => 'required|string|max:50',
            'postingDate'  => 'required|date',
            'intendedUse'  => 'required|string|max:100',
            'supplier'     => 'required|string|max:100',
            'note'         => 'required|string|max:250',
            'lines'        => 'required|array|min:1',
            'lines.*.itemcode'    => 'required|string|max:50',
            'lines.*.variant'     => 'required|string|max:50',
            'lines.*.description' => 'required|string|max:255',
            'lines.*.unit'        => 'required|string|max:20',
            'lines.*.quantity'    => 'required|integer|min:1|max:1000000',
            'lines.*.price'       => 'required|numeric|min:0|max:999999999',
        ]);

        DB::beginTransaction();

        try {
            $now = Carbon::now();
            $createdBy = auth()->user()->code;

            $inserts = array_map(function ($line) use ($validated, $now, $createdBy) {
                return [
                    'DocumentNo'   => $validated['document'],
                    'PostingDate'  => $validated['postingDate'],
                    'IntendedUse'  => $validated['intendedUse'],
                    'Supplier'     => $validated['supplier'],
                    'ItemCode'     => $line['itemcode'],
                    'Variant'      => $line['variant'],
                    'ItemName'     => $line['description'],
                    'Unit'         => $line['unit'],
                    'Quantity'     => $line['quantity'],
                    'Price'        => $line['price'],
                    'Status'       => 1,
                    'Note'         => $validated['note'],
                    'CreatedBy'    => $createdBy,
                    'CreatedDate'  => $now,
                ];
            }, $validated['lines']);

            ApiPurchase::insert($inserts);
            DB::commit();

            return response()->json(['success' => true], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
