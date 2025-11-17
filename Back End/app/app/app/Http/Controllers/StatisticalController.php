<?php

namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\SendMail;
use App\Models\ApiPurchaseHeader;
use Auth;

class StatisticalController extends Controller
{
    public function getStatistical(Request $request)
    {
        try {
            $validated = $request->validate([
               'fromdate' => 'required|date',
               'todate' => 'required|date'
            ]);
         
            $data = DB::select("EXEC [dbo].[api_GoodsRequestStatistics] @Action = :action, @FromDate = :fromdate, @ToDate = :todate"
                              , ['action' => 'ThongKe', 
                                 'fromdate' => $request->fromdate,
                                 'todate' => $request->todate
                                ]);
            return response()->json(['data' => $data], 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }

    public function sendMail()
    {
        try {
            $code = auth()->user()->code;
            $receivers = auth()->user()->email; 
            
            $data = ApiPurchaseHeader::where('CreatedBy', $code)
                ->orderByDesc('DocumentNo')
                ->value('DocumentNo');

            $details = [
                'data' => $data. " với trạng thái đơn hàng là mới. Thông tin chi tiết vui lòng truy cập vào wed http://dathangnoibo.bitex.vn",
            ];

            Mail::to($receivers)
                ->cc('report@bitex.com.vn') 
                ->queue(new SendMail($details));
            return response()->json(['success' => $details], 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
}