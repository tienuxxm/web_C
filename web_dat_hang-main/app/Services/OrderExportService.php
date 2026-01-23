<?php

namespace App\Services;

use App\Models\MergeOrder;
use App\Models\Vendor;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use ZipArchive;
use Illuminate\Support\Facades\Storage;

class OrderExportService
{
    public function generateMergeOrderPdf($mergeOrderId)
    {
        // 1. Lấy dữ liệu Merge Order kèm các quan hệ cần thiết
        $order = MergeOrder::with([
            'items', 
            'user',       
            'originalOrderItems.order'
        ])->where('DocumentNo', $mergeOrderId)->first();

        if (!in_array((int)$order->Status, [3, 4, 11])) {
            throw new \Exception("Chỉ xuất được đơn hàng đã duyệt, đang đặt hàng hoặc hoàn thành.");
        }
        $supplierName = 'Unknown Vendor';
        $vendorAddress = 'N/A';
        $vendorCode ='';
        $firstOriginalItem = $order->originalOrderItems->first();
        if ($firstOriginalItem && $firstOriginalItem->order) {
            $supplierName = $firstOriginalItem->order->Supplier;
            
            // Tìm trong bảng Master Vendor
            $vendor = Vendor::where('Name', $supplierName)->first();
            if ($vendor) {
                $vendorAddress = $vendor->Address;
                $vendorCode = $vendor->No_;
            }
        }
        $purchaserName = $order->user ? $order->user->name : 'N/A';

        // 5. Chuẩn bị dữ liệu Items
        $itemsData = $order->items->map(function ($item) {
            return [
                'code'     => $item->ItemCode,
                'name'     => $item->ItemName,
                'color'    => $item->Variant,
                'unit'     => $item->Unit,
                'quantity' => $item->Quantity,
                'price'    => $item->Price,
                'total'    => $item->Quantity * $item->Price
            ];
        });
        // 6. Tổng hợp Data cho View
        $data = [
            'vendor_name'    => $supplierName,
            'vendor_address' => $vendorAddress,
            'vendor_code'    => $vendorCode,
            'order_number'   => $order->DocumentNo,
            'order_date'     => Carbon::parse($order->PostingDate)->format('F d, Y'), // Format: December 25, 2022
            'purchaser_name' => $purchaserName,
            'items'          => $itemsData,
            'total_amount'   => $itemsData->sum('total')
        ];
        // 7. Render PDF
        $pdf = Pdf::loadView('pdf.purchase_order', $data);
        $pdf->setOptions([
            'isPhpEnabled' => true, 
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled' => true
        ]);
        return $pdf;
    }
    public function streamSinglePdf($id)
    {
        $pdf = $this->generateMergeOrderPdf($id);
        return $pdf->stream("{$id}.pdf");
    }
    public function generateBatchZip(array $orderIds)
    {
        // Tạo tên file tạm
        $zipFileName = 'orders_' . now()->timestamp . '.zip';
        $zipPath = storage_path('app/public/' . $zipFileName);

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE) === TRUE) {
            
            foreach ($orderIds as $id) {
                try {
                    // Tạo PDF trong bộ nhớ
                    $pdf = $this->generateMergeOrderPdf($id);
                    $content = $pdf->output(); 

                    $zip->addFromString("{$id}.pdf", $content);
                } catch (\Exception $e) {
                    // Nếu 1 đơn lỗi, tạo file log text báo lỗi trong zip thay vì crash
                    $zip->addFromString("ERROR_{$id}.txt", "Lỗi xuất đơn hàng này: " . $e->getMessage());
                }
            }
            
            $zip->close();
        }

        return $zipPath;
    }
}