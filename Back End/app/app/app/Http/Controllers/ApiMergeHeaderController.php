<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;
use App\Models\ApiMergeHeader;
use App\Models\ApiMergeLine;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Auth;

class ApiMergeHeaderController extends Controller
{
    public function getDetailMerge($document)
    {
        try {
            $data = DB::select("EXEC [dbo].[api_Merge] @Action = :action, @DocumentNo = :documentNo"
                              , ['action' => 'DetailMerge', 'documentNo' => $document]);
            return response()->json($data, 200);
        } catch (\Exception $e) { 
            return response()->json(['error' => $e->getMessage()], 500); 
        }
    }
    
    public function approval(Request $request)
    {
        $validated = $request->validate([
            'document' => 'required|string|max:50',  
            'shipment' => 'required|date',
        ]);
        
        $header = ApiMergeHeader::where('DocumentNo', $validated['document'])->first();
        if (!$header) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $header->ShipmentDate = $validated['shipment'];
        $header->Status       = 2;
        $header->ModifiedBy   = auth()->user()->code;
        $header->ModifiedDate = Carbon::now();
        $header->save();

        ApiMergeLine::where('DocumentNo', $validated['document'])->update(['Status' => 2]);

        return response()->json(['success' => true], 200);
    }

    public function getMergeHeader(Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|integer|min:1',
            'fromdate' => 'required|date',
            'todate' => 'required|date',       
        ]);

        try {
            $data = DB::select("EXEC [dbo].[api_Merge] @Action = :action, @Status = :status, @FromDate = :fromdate, @ToDate = :todate"
                            , [
                                'action' => 'GetMergeHeader', 
                                'status' => $validated['status'],
                                'fromdate' => $validated['fromdate'],
                                'todate' => $validated['todate'],
                              ]);

            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
    
    public function updateStatus(Request $request)
    {
        $validated = $request->validate([
            'document' => 'required|string|max:50',  
            'status' => 'required|integer',
            'note' => 'required|string',
        ]);
        
        $header = ApiMergeHeader::where('DocumentNo', $validated['document'])->first();
        if (!$header) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $header->Status              = $validated['status'];
        $header->NoteManager         = $validated['note'];
        $header->ModifiedManagerBy   = auth()->user()->code;
        $header->ModifiedManagerDate = Carbon::now();
        $header->save();

        ApiMergeLine::where('DocumentNo', $validated['document'])->update(['Status' => $validated['status']]);

        return response()->json(['success' => true], 200);
    }
    
}
