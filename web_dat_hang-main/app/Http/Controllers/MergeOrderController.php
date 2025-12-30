<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MergeOrder;
use App\Models\MergeOrderItem;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;

class MergeOrderController extends Controller
{
 
    public function show($id)
    {
        try {
            $order = MergeOrder::with([
                'items', 
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
                $supplierName = $originalHeader->Supplier ?? 'N/A';
                $intendedUse  = $originalHeader->IntendedUse ?? 'Gộp đơn';
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
                    return [
                        'id'               => $item->ID,
                        'purchase_line_id' => $item->PurchaseLineID, 
                        'product_code'     => $item->ItemCode,
                        'product_name'     => $item->ItemName,
                        'quantity'         => (float)$item->Quantity,
                        'unit_price'       => (float)$item->Price,
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
        // (Nhớ đã khai báo protected $policies trong AuthServiceProvider)
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
        }
        else {
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
            if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')||$user->isRole('Supply')) {
                $pending = [8];      
                $processing = [3];  
                $total = [8, 3];     
            } 
            elseif ($user->isRole('Leader')) {
                $pending = [2];      
                $processing = [3];   
                $total = [2, 3];
            } else {
                $total = [8, 2, 3];
            }
        }
        elseif ($group === 'merged_completed' || $group === 'completed') {
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
            }
            elseif ($user->isRole('Leader')) {
            }

            $group = $request->get('group', 'merged');

            if ($group === 'merged' || $group === 'merged_process') {
                if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
                    $query->whereIn('Status', [8, 3,2, 5]);
                }
                elseif ($user->isRole('Leader')) {
                    $query->whereIn('Status', [2, 3, 5]);
                }
                else {
                    $query->whereIn('Status', [8, 2, 3, 5]); 
                }
            }
            elseif ($group === 'completed' || $group === 'merged_completed') {
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
}
