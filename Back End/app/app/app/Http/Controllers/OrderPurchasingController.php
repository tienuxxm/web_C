<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Auth;

class OrderPurchasingController extends Controller
{
    /* ====== ORDER PURCHASING ====== */ 
    public function getMaxCode()
    {
        try {
            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] @Action = :action", ['action' => 'MaxCode']);
            return response()->json($data[0]->document, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function getOPChange(Request $request)
    {
        try {
            $validated = $request->validate([
               'fromdate' => 'required|date',
               'todate' => 'required|date',
               'department' => 'required'
            ]);
            
            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] 
                                     @Action = :action,
                                     @Department = :department,
                                     @FromDate = :fromdate, 
                                     @ToDate = :todate"
                             , [
                                    'action' => 'PurchaseHeader', 
                                    'department' => $request->department, 
                                    'fromdate' => $request->fromdate, 
                                    'todate' => $request->todate
                               ]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
    
    public function detailPurchase(Request $request)
    {
        try {
            $validated = $request->validate([
               'document' => 'required'
            ]);
            
            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] @Action = :action, @DocumentNo = :document"
                              , ['action' => 'DetailPurchase', 'document' => $request->document]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

   
    /* ====== END ORDER PURCHASING ====== */ 
    
    /* ====== THÔNG KÊ ====== */ 
    public function reportStatisticsDetail(Request $request)
    {
        try {
            $validated = $request->validate([
               'fromdate' => 'required|date',
               'todate' => 'required|date',
               'department' => 'required',
               'status' => 'required|integer|min:1'
            ]);
            
            $Fromdate = $request->fromdate;
            $Todate = $request->todate;
            $Department = $request->department;
            $Status = $request->status;

            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] @Action = :action, @Action1 = :action1, @Status = :status, @Department = :department, @FromDate = :fromdate, @ToDate = :todate"
                              , ['action' => 'ReportStatistics', 
                                 'action1' => 'Detail',
                                 'status' => $Status,
                                 'department' => $Department,
                                 'fromdate' => $Fromdate,
                                 'todate' => $Todate,
                                ]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function reportStatisticsTop10(Request $request)
    {
        try {
            $validated = $request->validate([
               'fromdate' => 'required|date',
               'todate' => 'required|date',
               'department' => 'required',
               'status' => 'required|integer|min:1'
            ]);
            
            $Fromdate = $request->fromdate;
            $Todate = $request->todate;
            $Department = $request->department;
            $Status = $request->status;

            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] @Action = :action, @Action1 = :action1, @Status = :status, @Department = :department, @FromDate = :fromdate, @ToDate = :todate"
                              , ['action' => 'ReportStatistics', 
                                 'action1' => 'Top10',
                                 'status' => $Status,
                                 'department' => $Department,
                                 'fromdate' => $Fromdate,
                                 'todate' => $Todate,
                                ]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
    /* ====== END THÔNG KÊ ====== */ 

    /* ====== LỊCH ĐẶT HÀNG ====== */ 
    public function getPurchaseByUser(Request $request)
    {
        try {
            $validated = $request->validate([
               'fromdate' => 'required|date',
               'todate' => 'required|date'
            ]);
            
            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] 
                                     @Action = :action,
                                     @UserCode = :usercode,
                                     @FromDate = :fromdate, 
                                     @ToDate = :todate"
                             , [
                                    'action' => 'History', 
                                    'usercode' => auth()->user()->code,
                                    'fromdate' => $request->fromdate, 
                                    'todate' => $request->todate
                               ]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
    /* ====== END LỊCH ĐẶT HÀNG ====== */ 
    /* ====== SAELS UPDATE ĐƠN HÀNG ====== */ 
    public function changePurchaseHeader()
    {
        try {
            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] @Action = :action, @UserCode = :usercode"
                             , [
                                    'action' => 'ChangePurchaseHeader', 
                                    'usercode' => auth()->user()->code
                               ]);

            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function detailPurchaseSupply(Request $request)
    {
        try {
            $validated = $request->validate([
               'document' => 'required'
            ]);
            
            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] @Action = :action, @DocumentNo = :document"
                              , ['action' => 'DetailPurchaseSupply', 'document' => $request->document]);
            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
    /* ====== END UPDATE ĐƠN HÀNG ====== */ 
    /* ====== GET PH BY SUPPLY ====== */ 
    public function purchaseHeaderBySupply(Request $request)
    {
        try {
            $validated = $request->validate([
               'fromdate' => 'required|date',
               'todate' => 'required|date',
               'department' => 'required'
            ]);

            $data = DB::select("EXEC [dbo].[api_OrderPurchasing] 
                                @Action = :action, 
                                @UserCode = :usercode, 
                                @Department = :department, 
                                @FromDate = :fromdate, 
                                @ToDate = :todate"
                             , [
                                    'action' => 'PurchaseHeaderBySupply', 
                                    'usercode' => auth()->user()->code,
                                    'department' => $request->department, 
                                    'fromdate' => $request->fromdate, 
                                    'todate' => $request->todate,
                               ]);

            return response()->json($data, 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
    /* ====== GET PH BY SUPPLY ====== */
}
