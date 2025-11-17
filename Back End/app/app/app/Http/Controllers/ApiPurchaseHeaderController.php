<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ApiPurchaseHeader;
use App\Models\ApiPurchaseLine;
use Carbon\Carbon;
use Auth;

class ApiPurchaseHeaderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'industry'     => 'required|integer',
            'document'     => 'required|string|max:50',
            'postingDate'  => 'required|date',
            'intendedUse'  => 'required|string',
            'supplier'     => 'required|string|max:250',
            'note'         => 'required|string|max:250',
        ]);

        $header = new ApiPurchaseHeader();
        $header->Industry     = $validated['industry'];
        $header->DocumentNo   = $validated['document'];
        $header->PostingDate  = $validated['postingDate'];
        $header->ShipmentDate = $validated['postingDate'];
        $header->IntendedUse  = $validated['intendedUse'];
        $header->Supplier     = $validated['supplier'];
        $header->Status       = 1;
        $header->Note         = $validated['note'];
        $header->CreatedBy    = auth()->user()->code;
        $header->CreatedDate  = Carbon::now();

        $header->save();

        return response()->json('true', 200);
    }
    
    /* sales chỉnh sửa */
    public function updateStatus(Request $request)
    {
        $validated = $request->validate([
            'document' => 'required|string|max:50',  
            'status'   => 'required|integer'
        ]);

        $header = ApiPurchaseHeader::where('DocumentNo', $validated['document'])->first();
        if (!$header) {
            return response()->json(['error' => 'Document not found'], 404);
        }
        $header->Status       = $validated['status'];
        $header->ModifiedBy   = auth()->user()->code;
        $header->ModifiedDate = Carbon::now();
        $header->save();
        return response()->json(['success' => true], 200);
    }

    /* cung ứng chỉnh sửa */
    public function updateStatusBySupply(Request $request)
    {
        $validated = $request->validate([
            'document' => 'required|string|max:50',  
            'status'   => 'required|integer',
        ]);
        
        $header = ApiPurchaseHeader::where('DocumentNo', $validated['document'])->first();
        if (!$header) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $header->Status             = $validated['status'];
        $header->ModifiedSupplyBy   = auth()->user()->code;
        $header->ModifiedSupplyDate = Carbon::now();
        $header->save();
        
        ApiPurchaseLine::where('DocumentNo', $validated['document'])->update(['Status' => $validated['status']]);
        return response()->json(['success' => true], 200);
    }
}
