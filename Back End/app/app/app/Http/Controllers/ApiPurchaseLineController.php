<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\ApiPurchase;
use App\Models\ApiPurchaseHeader;
use App\Models\ApiPurchaseLine;
use App\Models\ApiCart;
use Auth;
use Carbon\Carbon;
use App\Models\ItemVariant;

class ApiPurchaseLineController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'document'   => 'required|string|max:50',
            'postingDate'  => 'required|date',
            'itemcode'     => 'required|string|max:15',
            'variant'      => 'required|string|max:25',
            'description'     => 'required|string|max:250',
            'unit'         => 'required|string|max:50',
            'quantity'     => 'required|numeric',
            'price'        => 'required|numeric',
        ]);

        $lineCount = ApiPurchaseLine::where('DocumentNo', $validated['document'])->max('Line');
        $newLineNumber = ($lineCount ?? 0) + 1;

        $line = new ApiPurchaseLine();
        $line->DocumentNo   = $validated['document'];
        $line->Line         = (string)$newLineNumber;
        $line->PostingDate  = $validated['postingDate'];
        $line->ItemCode     = $validated['itemcode'];
        $line->Variant      = $validated['variant'];
        $line->ItemName     = $validated['description'];
        $line->Unit         = $validated['unit'];
        $line->Quantity     = $validated['quantity'];
        $line->QuantityOld  = $validated['quantity'];
        $line->Price        = $validated['price'];
        $line->Status       = 1;
        $line->CreatedBy    = auth()->user()->code;
        $line->CreatedDate  = Carbon::now();

        $line->save();
        return response()->json(['success' => true, 'id' => $line->ID], 200);
    }
    
    public function insertlines(Request $request)
    {
        $validated = $request->validate([
            'industry'     => 'required|integer',
            'postingDate'  => 'required|date',
            'intendedUse'  => 'required|string',
            'supplier'     => 'required|string|max:250',
            'note'         => 'required|string|max:250',
            'lines.*.itemcode'     => 'required|string|max:15',
            'lines.*.variant'      => 'required|string|max:25',
            'lines.*.description'  => 'required|string|max:250',
            'lines.*.unit'         => 'required|string|max:50',
            'lines.*.quantity'     => 'required|numeric',
            'lines.*.price'        => 'required|numeric',
        ]);
        
        DB::beginTransaction();
        try {
            $postingDate = $validated['postingDate'];
            $now = Carbon::now();
            $createdBy = auth()->user()->code;

            // Insert ApiPurchaseHeader
            $result = DB::select("SELECT [dbo].[api_GenerateNewCode]() AS [NewCode]");   
            $document = $result[0]->NewCode ?? null;
            if (!$document) {
                return response()->json(['error' => 'Tạo mã không thành công'], 500);
            }
            $header = new ApiPurchaseHeader();
            $header->Industry     = $validated['industry'];
            $header->DocumentNo   = $document;
            $header->PostingDate  = $postingDate;
            $header->ShipmentDate = $postingDate;
            $header->IntendedUse  = $validated['intendedUse'];
            $header->Supplier     = $validated['supplier'];
            $header->Status       = 1;
            $header->Note         = $validated['note'];
            $header->CreatedBy    = $createdBy;
            $header->CreatedDate  = $now;
            $header->save();
            
            // Insert ApiPurchaseLine
            $lineCount = ApiPurchaseLine::where('DocumentNo', $document)->count();
            $inserts = [];
            foreach ($validated['lines'] as $index => $line) { 
                $inserts[] = [
                    'DocumentNo'   => $document,
                    'Line'        => (string)($lineCount + $index + 1),
                    'PostingDate'  => $postingDate,
                    'ItemCode'     => $line['itemcode'],
                    'Variant'      => $line['variant'],
                    'ItemName'     => $line['description'],
                    'Unit'         => $line['unit'],
                    'Quantity'     => $line['quantity'],
                    'QuantityOld'  => $line['quantity'],
                    'Price'        => $line['price'],
                    'Status'       => 1,
                    'CreatedBy'    => $createdBy,
                    'CreatedDate'  => $now,
                ];
            }
            ApiPurchaseLine::insert($inserts);
            
            // Insert ApiPurchase
            $insertPurchase = array_map(function ($line) use ($validated, $document, $postingDate, $now, $createdBy) {
                return [
                    'DocumentNo'   => $document,
                    'PostingDate'  => $postingDate,
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

            ApiPurchase::insert($insertPurchase);

            // Insert deleted
            $deleted = ApiCart::where('CreatedBy', $createdBy)->delete();
            
            DB::commit();
            return response()->json(['success' => true], 200);
        } catch (\Exception $e) { 
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500); 
        }
    }

    public function updateQuantity(Request $request)
    {
        $validated = $request->validate([
            'id'       => 'required|integer',
            'quantity' => 'required|numeric|min:0',
        ]);

        $line = ApiPurchaseLine::find($validated['id']);

        if (!$line) {
            return response()->json(['error' => 'Line not found'], 404);
        }

        $line->Quantity      = $validated['quantity'];
        $line->ModifiedBy    = auth()->user()->code;
        $line->ModifiedDate  = Carbon::now();

        $line->save();

        return response()->json(['success' => true], 200);
    }

    public function updateMultipleQuantities(Request $request)
    {
        $validated = $request->validate([
            'updates.*.id' => 'required|integer',
            'updates.*.quantity' => 'required|numeric|min:0',
        ]);
        DB::beginTransaction();
        
        try {
            $now = Carbon::now();
            $modifiedBy = auth()->user()->code;
            $updatedIds = [];
           
            foreach ($validated['updates'] as $update) {
                $line = ApiPurchaseLine::find($update['id']);
                $line->Quantity = $update['quantity'];
                $line->ModifiedBy = $modifiedBy;
                $line->ModifiedDate = $now;
                $line->save();
            }
            DB::commit();
            return response()->json(['success' => true], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
    
    public function editItem(Request $request)
    {
        $validated = $request->validate([
            'id'        => 'required|integer',
            'document'  => 'required|string|max:15',
            'itemcode'  => 'required|string|max:15',
            'variant'   => 'required|string|max:25',
        ]);

        $item = ItemVariant::where('Code', $validated['itemcode'])->where('Variant', $validated['variant'])->first();

        // Kiểm tra xem itemcode + variant đã tồn tại ở dòng khác chưa
        $exists = ApiPurchaseLine::where('ItemCode', $validated['itemcode'])
                                 ->where('Variant', $validated['variant'])
                                 ->where('DocumentNo', $validated['document'])
                                 ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'ItemCode và Variant đã tồn tại ở dòng khác.'
            ], 422);
        }
   
        $line = ApiPurchaseLine::find($validated['id']);
        $line->ItemCode     = $validated['itemcode'];
        $line->Variant      = $validated['variant'];
        $line->ItemName     = $item->Name;
        $line->Unit         = $item->Unit;
        $line->Price        = $item->Price;
        $line->ModifiedBy   = auth()->user()->code;
        $line->ModifiedDate = Carbon::now();
        $line->save();
      
        return response()->json(['success' => true], 200);
    }

    public function destroy($id)
    {
        $purchaseline = ApiPurchaseLine::findOrFail($id);
        $purchaseline->delete();
        return response()->json(['success' => true], 200);
    }

    public function getMerge($id)
    {
        try {
            $data = DB::select("EXEC [dbo].[api_Merge] @Action = :action, @Industry = :industry"
                              , [
                                    'action' => 'Merge', 
                                    'industry' => $id
                                ]);

            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
}
