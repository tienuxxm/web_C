<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MergeOrder;
use App\Models\MergeOrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;

class MergeOrderController extends Controller
{

    public function show($id)
    {
        try {
            $order = MergeOrder::with([
                'items.product',
                'statusInfo',
                'originalOrderItems.order'
            ])
                ->where('DocumentNo', $id)
                ->firstOrFail();

            $subtotal = $order->items->sum(function ($item) {
                return $item->Quantity * $item->Price;
            });

            $supplierName = 'N/A';
            $intendedUse  = 'Gộp đơn';
            $firstOriginalItem = $order->originalOrderItems->first();

            if ($firstOriginalItem && $firstOriginalItem->order) {
                $originalHeader = $firstOriginalItem->order;
                $supplierName = $originalHeader->Supplier;
                $intendedUse  = $originalHeader->IntendedUse;
            }
            $formattedOrder = [
                'id'                 => $order->DocumentNo,
                'order_number'       => $order->DocumentNo,
                'supplier_name'      => $supplierName,
                'intended_use'       => $intendedUse,
                'status'             => (int)$order->Status,
                'status_name'        => $order->statusInfo->Name ?? '',
                'order_date'         => $order->PostingDate,
                'estimated_delivery' => $order->ShipmentDate,
                'subtotal'           => $subtotal,
                'total_amount'       => $subtotal,
                'industry_id'        => $order->Industry,
                'created_by'            => $order->CreatedBy,
                'created_date'          => $order->CreatedDate,
                'note'                  => $order->Note,
                'modified_by'           => $order->ModifiedBy,
                'modified_date'         => $order->ModifiedDate,
                'note_manager'          => $order->NoteManager,
                'modified_manager_by'   => $order->ModifiedManagerBy,
                'modified_manager_date' => $order->ModifiedManagerDate,
                'items' => $order->items->map(function ($item) {
                    $erpPrice =  $item->product;
                    return [
                        'id'               => $item->ID,
                        'purchase_line_id' => $item->PurchaseLineID,
                        'product_code'     => $item->ItemCode,
                        'product_name'     => $item->ItemName,
                        'quantity'         => (float)$item->Quantity,
                        'quantity_old'     => (float)$item->QuantityOld,
                        'unit_price'       => (float)$item->Price,
                        'erp_price'            => $erpPrice->price,
                        'unit'             => $item->Unit,
                        'total'            => (float)($item->Quantity * $item->Price),
                        'product' => [
                            'id'    => $item->ItemCode,
                            'code'  => $item->ItemCode,
                            'name'  => $item->ItemName,
                            'price' => (float)$item->Price,
                            'color' => $item->Variant,
                        ],
                        'line_modified_by'           => $item->ModifiedBy,
                        'line_modified_date'         => $item->ModifiedDate,
                        'line_modified_manager_by'   => $item->ModifiedManagerBy,
                        'line_modified_manager_date' => $item->ModifiedManagerDate,
                    ];
                }),
            ];

            return response()->json(['order' => $formattedOrder]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $user = JWTAuth::user();
        $order = MergeOrder::where('DocumentNo', $id)->firstOrFail();

        $currentStatus = (int)$order->Status;
        $newStatus     = (int)$request->input('status');

        if ($newStatus === $currentStatus) {
            return response()->json(['message' => 'Bạn chưa cập nhật trạng thái đơn hàng.'], 422);
        }

        // 1. GỌI POLICY
        if ($user->cannot('updateStatus', [$order, $newStatus])) {
            return response()->json([
                'message' => "Bạn không có quyền chuyển từ trạng thái [$currentStatus] sang [$newStatus]."
            ], 403);
        }

        // 2. CHUẨN BỊ DỮ LIỆU (Mapping cột theo DB mới)
        $now = now();
        $userCode = $user->code;

        $headerUpdateData = ['Status' => $newStatus];
        $lineUpdateData   = ['Status' => $newStatus];

        // --- A. NHÓM LÃNH ĐẠO (LEADER / MANAGER) ---
        if ($user->isRole('Leader') || $user->isRole('Manage')) {
            // Header
            $headerUpdateData['ModifiedManagerBy']   = $userCode;
            $headerUpdateData['ModifiedManagerDate'] = $now;
            // Leader ghi chú vào cột NoteManager
            if ($request->has('notes')) {
                $headerUpdateData['NoteManager'] = $request->notes;
            }

            // Line
            $lineUpdateData['ModifiedManagerBy']   = $userCode;
            $lineUpdateData['ModifiedManagerDate'] = $now;
        } else {
            $headerUpdateData['ModifiedBy']   = $userCode;
            $headerUpdateData['ModifiedDate'] = $now;
            if ($request->has('notes')) {
                $headerUpdateData['Note'] = $request->notes;
            }
            $lineUpdateData['ModifiedBy']   = $userCode;
            $lineUpdateData['ModifiedDate'] = $now;
        }
        DB::connection('sqlsrv')->beginTransaction();
        try {
            $order->update($headerUpdateData);
            MergeOrderItem::where('DocumentNo', $id)->update($lineUpdateData);
            DB::connection('sqlsrv')->commit();
            return $this->show($id);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
        }
    }


    public function stats(Request $request)
    {
        $user = JWTAuth::user();
        $group = $request->get('group', 'merged');
        $headerModel = new MergeOrder();
        $lineModel   = new MergeOrderItem();
        $rawHeaderTbl = $headerModel->getTable();
        $rawLineTbl   = $lineModel->getTable();
        $tblHeader = '[' . $rawHeaderTbl . ']';
        $tblLine   = '[' . $rawLineTbl . ']';
        $query = MergeOrder::query();
        if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
            $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
            $query->whereIn('Industry', $allowedIndustries);
        }
        $pending = [];
        $processing = [];
        $total = [];
        if ($group === 'merged' || $group === 'merged_process') {
            if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam') || $user->isRole('Supply')) {
                $pending = [8];
                $processing = [3];
                $total = [8, 3];
            } elseif ($user->isRole('Leader')) {
                $pending = [2];
                $processing = [3];
                $total = [2, 3];
            } else {
                $total = [8, 2, 3];
            }
        } elseif ($group === 'merged_completed' || $group === 'completed') {
            $pending = [4];
            $processing = [11];
            $total = [4, 11];
        }

        if (empty($total)) {
            return response()->json(['total_orders' => 0, 'pending_orders' => 0, 'processing_orders' => 0, 'total_revenue' => 0]);
        }
        $stats = $query->selectRaw("
            SUM(CASE WHEN $tblHeader.[Status] IN (" . implode(',', $total) . ") THEN 1 ELSE 0 END) as total,
            SUM(CASE WHEN $tblHeader.[Status] IN (" . implode(',', $pending) . ") THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN $tblHeader.[Status] IN (" . implode(',', $processing) . ") THEN 1 ELSE 0 END) as processing
        ")->first();
        $revenue = 0;
        if ($stats->total > 0) {
            $revenueQuery = clone $query;
            $revenueQuery->join(
                DB::raw("$tblLine as lines"),
                'lines.DocumentNo',
                '=',
                DB::raw("$tblHeader.[DocumentNo]") // Bọc DB::raw để Laravel không tự thêm ngoặc sai
            );
            $revenueQuery->whereIn(DB::raw("$tblHeader.[Status]"), $total);
            $revenue = $revenueQuery->sum(DB::raw('lines.Quantity * lines.Price'));
        }
        return response()->json([
            'total_orders'      => (int) ($stats->total ?? 0),
            'pending_orders'    => (int) ($stats->pending ?? 0),
            'processing_orders' => (int) ($stats->processing ?? 0),
            'total_revenue'     => (float) $revenue
        ]);
    }

    public function index(Request $request)
    {
        try {
            $user = JWTAuth::user();
            $query = MergeOrder::with(['items', 'statusInfo', 'originalOrderItems.order'])
                ->orderBy('CreatedDate', 'desc');
            if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
                $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
                $query->whereIn('Industry', $allowedIndustries);
            } elseif ($user->isRole('Leader')) {
            }
            $group = $request->get('group', 'merged');
            if ($group === 'merged' || $group === 'merged_process') {
                if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
                    $query->whereIn('Status', [8, 3, 2, 5]);
                } elseif ($user->isRole('Leader')) {
                    $query->whereIn('Status', [2, 3, 5]);
                } else {
                    $query->whereIn('Status', [8, 2, 3, 5]);
                }
            } elseif ($group === 'completed' || $group === 'merged_completed') {
                $query->whereIn('Status', [4, 11]);
            }
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where('DocumentNo', 'like', "%{$search}%");
            }
            $limit = $request->get('limit', 10);
            $orders = $query->paginate($limit);
            $data = $orders->getCollection()->map(function ($order) {
                $totalAmount = $order->items->sum(fn($item) => $item->Quantity * $item->Price);
                $firstOriginalItem = $order->originalOrderItems->first();
                $supplierName = $firstOriginalItem?->order?->Supplier;
                $intendedUse  = $firstOriginalItem?->order?->IntendedUse;
                return [
                    'id'            => $order->DocumentNo,
                    'order_number'  => $order->DocumentNo,
                    'supplier_name' => $supplierName,
                    'intended_use'  => $intendedUse,
                    'customer_name' => $order->CreatedBy,
                    'created_at'    => $order->CreatedDate,
                    'order_date'    => $order->PostingDate,
                    'status'        => (int)$order->Status,
                    'status_name'   => $order->statusInfo?->Name ?? 'Unknown',
                    'total'         => $totalAmount,
                    'items_count'   => $order->items->count(),
                    'items'         => $order->items->map(function ($it) {
                        return [
                            'id'           => $it->ID,
                            'productName'  => $it->ItemName,
                            'product_code' => $it->ItemCode,
                            'quantity'     => (float)$it->Quantity,
                            'price'        => (float)$it->Price,
                            'product'      => [
                                'id'    => $it->ItemCode,
                                'code'  => $it->ItemCode,
                                'name'  => $it->ItemName,
                                'price' => (float)$it->Price,
                            ]
                        ];
                    })
                ];
            });

            $orders->setCollection($data);
            return response()->json($orders);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi tải danh sách', 'error' => $e->getMessage()], 500);
        }
    }

    // GET /api/merge-orders/items/{id}/distribution
    public function getDistribution($id)
    {
        try {
            // 1. Lấy dòng hàng trong đơn gộp
            $mergeItem = MergeOrderItem::findOrFail($id);

            $sourceIds = array_filter(explode('-', $mergeItem->PurchaseLineID));

            if (empty($sourceIds)) {
                return response()->json(['message' => 'Sản phẩm này được thêm thủ công.'], 200);
            }

            $originalItems = \App\Models\OrderItem::with(['order.user'])
                ->whereIn('ID', $sourceIds)
                ->get();

            // --- 👇 SỬA ĐOẠN NÀY (QUAN TRỌNG) ---
            // Tính tổng nhu cầu dựa trên QuantityOld (Sales yêu cầu)
            // Dùng fallback ?? 0 đề phòng dữ liệu cũ null
            $totalDemand = $originalItems->sum('QuantityOld');

            $supplyQty   = $mergeItem->Quantity; // Số thực tế Supply chốt trên đơn Gộp

            $distribution = [];

            // Kịch bản 1: Hàng về ĐỦ hoặc DƯ
            if ($supplyQty >= $totalDemand) {
                foreach ($originalItems as $item) {
                    // Lấy đúng số Sales yêu cầu
                    $reqQty = (float)($item->QuantityOld ?? $item->Quantity);

                    $distribution[] = [
                        'po_number'    => $item->DocumentNo,
                        'sales_name'   => $item->order->user->name ?? $item->CreatedBy,

                        'requested'    => $reqQty, // ✅ Hiển thị số Sales muốn (100)
                        'allocated'    => $reqQty, // ✅ Chia đủ (100)
                        'note'         => 'Đủ hàng'
                    ];
                }
                // Phần dư ra
                $remainder = $supplyQty - $totalDemand;
                if ($remainder > 0) {
                    $distribution[] = [
                        'po_number'    => 'KHO_DU_TRU',
                        'sales_name'   => 'Kho / Cung ứng',
                        'requested'    => 0,
                        'allocated'    => $remainder,
                        'note'         => 'Hàng dư nhập kho'
                    ];
                }
            }
            // Kịch bản 2: Thiếu hàng -> Chia tỷ lệ
            else {
                $ratio = ($totalDemand > 0) ? ($supplyQty / $totalDemand) : 0;

                // Debug (nếu cần): 550 / 300 = 1.83 (Trường hợp này ko xảy ra vì rơi vào if trên)
                // Ví dụ Supply chỉ có 200 / Demand 300 => Ratio 0.66

                foreach ($originalItems as $index => $item) {
                    $reqQty = (float)($item->QuantityOld ?? $item->Quantity);

                    $allocated = $reqQty * $ratio;

                    $distribution[] = [
                        'po_number'    => $item->DocumentNo,
                        'sales_name'   => $item->order->user->name ?? $item->CreatedBy,

                        'requested'    => $reqQty, // ✅ Hiển thị số Sales muốn
                        'allocated'    => (float)$allocated,
                        'note'         => 'Thiếu hàng (Cắt giảm)'
                    ];
                }
            }

            return response()->json([
                'product_name' => $mergeItem->ItemName,
                'total_supply' => $supplyQty,
                'total_demand' => $totalDemand,
                'status'       => ($supplyQty >= $totalDemand) ? 'sufficient' : 'shortage',
                'distribution' => $distribution
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi tính toán: ' . $e->getMessage()], 500);
        }
    }
}
