<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use App\Models\Order;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Carbon\Carbon;

class ExportController extends Controller
{
   public function exportMergedOrdersMultipleMonths(Request $request)
    {
        $user = JWTAuth::user();

        if (!$user || $user->department->name_department !== 'KINH_DOANH') {
            return response()->json(['message' => 'Bạn không có quyền xuất đơn'], 403);
        }

        $months = $request->input('months'); // ['07/2025', '08/2025']
        if (!is_array($months) || empty($months)) {
            return response()->json(['message' => 'Cần cung cấp danh sách tháng'], 422);
        }

        $orders = Order::with('items.product')
            ->where('merged', true)
            ->where('status', 'fulfilled')
            ->where('payment_status', 'paid')
            ->where(function ($query) use ($months) {
                foreach ($months as $month) {
                    if (preg_match('/^\d{2}\/\d{4}$/', $month)) {
                        [$m, $y] = explode('/', $month);
                        $query->orWhere(function ($sub) use ($m, $y) {
                            $sub->whereMonth('order_date', $m)
                                ->whereYear('order_date', $y);
                        });
                    }
                }
            })->get();

        if ($orders->isEmpty()) {
            return response()->json(['message' => 'Không có đơn hợp lệ'], 404);
        }

        $grouped = $orders->groupBy(function ($order) {
            return Carbon::parse($order->order_date)->format('m/Y');
        });

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $row = 1;

        foreach ($grouped as $month => $ordersInMonth) {
            // Ghi tiêu đề tháng
            $sheet->setCellValue("A{$row}", "Tháng: {$month}");
            $sheet->mergeCells("A{$row}:D{$row}");
            $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(14);
            $row += 1;

            // Ghi header
            $sheet->fromArray(['Mã SP', 'Tên SP', 'Đơn giá', 'Tổng SL'], null, "A{$row}");
            $sheet->getStyle("A{$row}:D{$row}")->getFont()->setBold(true);
            $row += 1;

            // Gom sản phẩm của tháng
            $productMap = [];
            foreach ($ordersInMonth as $order) {
                foreach ($order->items as $item) {
                    $key = $item->product_id;
                    if (!isset($productMap[$key])) {
                        $productMap[$key] = [
                            'product_code' => $item->product->code,
                            'product_name' => $item->product->name,
                            'price' => $item->unit_price,
                            'quantity' => 0
                        ];
                    }
                    $productMap[$key]['quantity'] += $item->quantity;
                }
            }

            // Ghi dữ liệu sản phẩm
            foreach ($productMap as $product) {
                $sheet->fromArray([
                    $product['product_code'],
                    $product['product_name'],
                    $product['price'],
                    $product['quantity']
                ], null, "A{$row}");
                $row++;
            }

            // Thêm dòng trống giữa các tháng
            $row++;
        }

        $filename = 'don-gop-theo-thang-' . now()->format('Ymd_His') . '.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportMergedOrdersMultipleYears(Request $request)
    {
        $user = JWTAuth::user();

        if (!$user || $user->department->name_department !== 'KINH_DOANH') {
            return response()->json(['message' => 'Bạn không có quyền xuất đơn'], 403);
        }

        $years = $request->input('years'); // ['2024', '2025']
        if (!is_array($years) || empty($years)) {
            return response()->json(['message' => 'Cần cung cấp danh sách năm'], 422);
        }

        $orders = Order::with('items.product')
            ->where('merged', true)
            ->where('status', 'fulfilled')
            ->where('payment_status', 'paid')
            ->where(function ($query) use ($years) {
                foreach ($years as $year) {
                    if (preg_match('/^\d{4}$/', $year)) {
                        $query->orWhereYear('order_date', $year);
                    }
                }
            })->get();

        if ($orders->isEmpty()) {
            return response()->json(['message' => 'Không có đơn hợp lệ'], 404);
        }

        $grouped = $orders->groupBy(function ($order) {
            return Carbon::parse($order->order_date)->format('Y');
        });

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $row = 1;

        foreach ($grouped as $year => $ordersInYear) {
            // Ghi tiêu đề năm
            $sheet->setCellValue("A{$row}", "Năm: {$year}");
            $sheet->mergeCells("A{$row}:E{$row}");
            $sheet->getStyle("A{$row}")->getFont()->setBold(true)->setSize(16);
            $row += 1;

            // Ghi header
            $sheet->fromArray(['Mã SP', 'Tên SP', 'Đơn giá', 'Tổng SL', 'Thành tiền'], null, "A{$row}");
            $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true);
            $row += 1;

            // Gom sản phẩm của năm
            $productMap = [];
            foreach ($ordersInYear as $order) {
                foreach ($order->items as $item) {
                    $key = $item->product_id;
                    if (!isset($productMap[$key])) {
                        $productMap[$key] = [
                            'product_code' => $item->product->code,
                            'product_name' => $item->product->name,
                            'price' => $item->unit_price,
                            'quantity' => 0
                        ];
                    }
                    $productMap[$key]['quantity'] += $item->quantity;
                }
            }

            // Ghi dữ liệu sản phẩm
            $yearTotal = 0;
            foreach ($productMap as $product) {
                $lineTotal = $product['price'] * $product['quantity'];
                $yearTotal += $lineTotal;
                
                $sheet->fromArray([
                    $product['product_code'],
                    $product['product_name'],
                    $product['price'],
                    $product['quantity'],
                    $lineTotal
                ], null, "A{$row}");
                $row++;
            }

            // Tổng năm
            $sheet->setCellValue("A{$row}", "Tổng năm {$year}:");
            $sheet->setCellValue("E{$row}", $yearTotal);
            $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true);
            $row += 2; // Thêm dòng trống giữa các năm
        }

        $filename = 'don-gop-theo-nam-' . now()->format('Ymd_His') . '.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
    public function exportOrder(Request $request)
    {
        $user = JWTAuth::user();

        if (!$user->isInDepartment('CUNG_UNG')) {
            return response()->json(['message' => 'Bạn không có quyền xuất đơn hàng'], 403);
        }

        $orderIds = $request->input('order_ids', []);
        if (empty($orderIds)) {
            return response()->json(['message' => 'Chưa chọn đơn nào để xuất'], 422);
        }

        $orders = Order::with(['items.product'])->whereIn('id', $orderIds)->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $row = 1;

        foreach ($orders as $order) {
            // Header cột: barcode | color | quantity | address | supplier_name
            $sheet->setCellValue("A{$row}", "barcode");
            $sheet->setCellValue("B{$row}", "color");
            $sheet->setCellValue("C{$row}", "quantity");
            $sheet->setCellValue("D{$row}", "address");
            $sheet->setCellValue("E{$row}", "supplier_name");
            $row++;

            foreach ($order->items as $item) {
                $sheet->setCellValue("A{$row}", $item->product->barcode ?? '');
                $sheet->setCellValue("B{$row}", $item->product->color ?? '');
                $sheet->setCellValue("C{$row}", $item->quantity);
                $sheet->setCellValue("D{$row}", $order->shipping_address);
                $sheet->setCellValue("E{$row}", $order->supplier_name);
                $row++;
            }

            // Dòng trắng ngăn giữa các đơn
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $fileName = 'danh_sach_don_hang_' . now()->format('Ymd_His') . '.xlsx';

        return new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        }, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
        ]);
    }
}
