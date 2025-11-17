<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Mail\SendMail;
use App\Models\ApiPurchaseHeader;
use Auth;

class SendMailController extends Controller
{
    public function purchase()
    {
        try {
            $user = auth()->user();
            $data = ApiPurchaseHeader::where('CreatedBy', $user->code)
                   ->orderByDesc('DocumentNo')
                   ->value('DocumentNo');

            $details = [
                'data' => $data. " với trạng thái đơn hàng là mới. Thông tin chi tiết vui lòng truy cập vào wed http://dathangnoibo.bitex.vn",
            ];

            Mail::to($user->email)
                ->cc('report@bitex.com.vn') 
                ->queue(new SendMail($details));
            return response()->json(['success' => $details], 200);
        } catch (Exception $ex) {
            return response()->json(['error' => $ex.getMessage()], 500);
        }
    }
}
