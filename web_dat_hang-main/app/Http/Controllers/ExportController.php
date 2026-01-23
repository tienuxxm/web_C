<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Services\OrderExportService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use App\Models\Order;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Carbon\Carbon;

class ExportController extends Controller
{
    protected $orderExportService;
    public function __construct(OrderExportService $orderExportService)
    {
        $this->orderExportService = $orderExportService;
    }
    public function exportBatchZip(Request $request)
    {
        $request->validate([
            'order_ids' => 'required|array|min:1'
        ]);

        try {
            $orderIds = $request->input('order_ids');
            
            // 1. Gọi Service tạo file ZIP
            $zipPath = $this->orderExportService->generateBatchZip($orderIds);
            return response()->download($zipPath)->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi tạo file nén: ' . $e->getMessage()], 500);
        }
    }
    public function exportMergeOrderPdf( $id)
    {
        return $this->orderExportService->streamSinglePdf($id);
    }
}
