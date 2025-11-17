<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;
use App\Models\ApiMergeLine;
use App\Models\ApiMergeHeader;
use App\Models\ApiPurchaseLine;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Auth;

class ApiMergeLineController extends Controller
{
    public function insertlines(Request $request)
    {
        $validated = $request->validate([
            'industry'             => 'required|numeric',
            'lines.*.itemcode'     => 'required|string|max:15',
            'lines.*.variant'      => 'required|string|max:25',
            'lines.*.description'  => 'required|string|max:250',
            'lines.*.unit'         => 'required|string|max:50',
            'lines.*.quantity'     => 'required|numeric',
            'lines.*.id'           => 'required',
        ]);
        
        $now = Carbon::now();
        $createdBy = auth()->user()->code;

        DB::beginTransaction();
        try {
            // Insert ApiMergeHeader
            $result = DB::select("SELECT [dbo].[api_MergeNewCode]() AS [NewCode]");
            $newCode = $result[0]->NewCode ?? null;
            if (!$newCode) {
                return response()->json(['error' => 'Tạo mã không thành công'], 500);
            }
            
            $header = new ApiMergeHeader();
            $header->DocumentNo   = $newCode;
            $header->PostingDate  = $now;
            $header->ShipmentDate = $now;
            $header->Industry     = $validated['industry'];
            $header->Status       = 1;
            $header->CreatedBy    = $createdBy;
            $header->CreatedDate  = $now;
            $header->save();
            
            // Insert ApiMergeLine
            $lineCount = ApiMergeLine::where('DocumentNo', $newCode)->count();
            $inserts = [];
            foreach ($validated['lines'] as $index => $line) { 
                $inserts[] = [
                    'DocumentNo'     => $newCode,
                    'Line'           => (string)($lineCount + $index + 1),
                    'PostingDate'    => $now,
                    'ItemCode'       => $line['itemcode'],
                    'Variant'        => $line['variant'],
                    'ItemName'       => $line['description'],
                    'Unit'           => $line['unit'],
                    'Quantity'       => $line['quantity'],
                    'QuantityOld'    => $line['quantity'],
                    'Price'          => 0,
                    'Status'         => 1,
                    'PurchaseLineID' => $line['id'],
                    'CreatedBy'      => $createdBy,
                    'CreatedDate'    => $now,
                ];
            }
            ApiMergeLine::insert($inserts);
            
            DB::statement("EXEC [dbo].[api_Merge] @Action = :action, @DocumentNo = :documentNo"
                         , ['action' => 'UpdateStatusPurchase', 'documentNo' => $newCode]);

            DB::commit();

            return response()->json(['document' => $newCode], 200);
        } catch (\Exception $e) { 
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500); 
        }
    }
    
    public function detailMergeLine($document)
    {
        try {
            $data = DB::select("EXEC [dbo].[api_Merge] @Action = :action, @DocumentNo = :document"
                              , ['action' => 'DetailMergeLine', 'document' => $document]);
            
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            $mergeline = ApiMergeLine::findOrFail($id);
            $document = $mergeline->DocumentNo;
            $count = ApiMergeLine::where('DocumentNo', $document)->count();
            if ($count <= 1) {
                return response()->json([
                    'notification' => 'Không thể xóa dòng cuối cùng.'
                ], 200);
            }

            DB::statement("EXEC [dbo].[api_Merge] @Action = :action, @ID = :id"
                         , ['action' => 'DeleteMergeLine', 'id' => $id]);
                         
            $mergeline->delete();
            DB::commit();
            return response()->json(['notification' => "Xóa thành công"], 200);
        } catch (\Exception $e) { 
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500); 
        }
    }
}
