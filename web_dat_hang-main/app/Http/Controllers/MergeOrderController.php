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
                'user',
                'items.product',
                'statusInfo',
                'originalOrderItems.order',
                'managerUser',
                'modifierUser',
            ])
                ->where('DocumentNo', $id)
                ->firstOrFail();

            $subtotal = $order->items->sum(function ($item) {
                return $item->Quantity * $item->Price;
            });
            $history = [];
            if (!empty($order->Note)) {
                $history[] = [
                    'name' =>  $order->user->name ??'',
                    'content' => $order->Note,
                    'time' => $order->ModifiedDate
                ];
            }
            // 2. Note của Supply
            if (!empty($order->NoteSupply)) {
                $history[] = [
                    'name' => $order->supplyUser->name ??'',
                    'content' => $order->NoteSupply,
                    'time' => $order->ModifiedSupplyDate
                ];
            }

            // 3. Note của Leader
            if (!empty($order->NoteManager)) {
                $history[] = [
                    'name' => $order->managerUser->name ??'',
                    'content' => $order->NoteManager,
                    'time' => $order->ModifiedManagerDate
                ];
            }

            usort($history, function ($a, $b) {
                return strtotime($a['time']) - strtotime($b['time']);
            });

            $sourcePOs = collect();

            // Duyệt qua các items để tìm ra danh sách các PO cha duy nhất
            foreach ($order->originalOrderItems as $line) {
                if ($line->order) {
                    // Dùng DocumentNo làm key để không bị trùng lặp
                    if (!$sourcePOs->has($line->order->DocumentNo)) {
                        $sourcePOs->put($line->order->DocumentNo, [
                            'po_number' => $line->order->DocumentNo,
                            'note'      => $line->order->Note, // Note gốc của PO
                            'user'      => $line->order->user->name ?? $line->order->CreatedBy, // Người tạo PO
                            'created_at' => $line->order->CreatedDate
                        ]);
                    }
                }
            }
            // Chuyển về dạng mảng index (bỏ key)
            $poDetails = $sourcePOs->values()->all();

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
                'note_history'          => $history,
                'created_by'            => $order->CreatedBy,
                'created_date'          => $order->CreatedDate,
                'created_name'          => $order->user->name,
                'note'                  => $order->Note,
                'source_orders'         => $poDetails,
                'modified_by'           => $order->ModifiedBy,
                'modified_date'         => $order->ModifiedDate,
                'modified_by_name'      => $order->modifierUser->name ?? '',


                'note_manager'          => $order->NoteManager,
                'modified_manager_by'   => $order->ModifiedManagerBy,
                'modified_manager_date' => $order->ModifiedManagerDate,
                'modified_manager_name'    => $order->managerUser->name ?? '',

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
        if ($user->cannot('updateStatus', [$order, $newStatus])) {
            return response()->json([
                'message' => "Bạn không có quyền chuyển từ trạng thái [$currentStatus] sang [$newStatus]."
            ], 403);
        }

        $now = now();
        $userCode = $user->code;

        $headerUpdateData = ['Status' => $newStatus];
        $lineUpdateData   = ['Status' => $newStatus];

        if ($user->isRole('Leader')) {
            $headerUpdateData['ModifiedManagerBy']   = $userCode;
            $headerUpdateData['ModifiedManagerDate'] = $now;
            if ($request->has('note_manager')) {
                $headerUpdateData['NoteManager'] = $request->note_manager;
            }
            // Line
            $lineUpdateData['ModifiedManagerBy']   = $userCode;
            $lineUpdateData['ModifiedManagerDate'] = $now;
        } else {
            $headerUpdateData['ModifiedBy']   = $userCode;
            $headerUpdateData['ModifiedDate'] = $now;
            if ($request->has('note_supply')) {
                $headerUpdateData['Note'] = $request->note_supply;
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
            $mergeItem = MergeOrderItem::findOrFail($id);

            $sourceIds = array_filter(explode('-', $mergeItem->PurchaseLineID));
            if (empty($sourceIds)) return response()->json(['message' => 'Sản phẩm thêm thủ công.'], 200);

            $originalItems = \App\Models\OrderItem::with(['order.user'])
                ->whereIn('ID', $sourceIds)
                ->get();
            $totalApprovedWeight = $originalItems->sum(function ($item) {
                return ($item->Quantity > 0) ? $item->Quantity : 0;
            });
            $actualSupplyQty = $mergeItem->Quantity;
            $ratio = ($totalApprovedWeight > 0) ? ($actualSupplyQty / $totalApprovedWeight) : 0;

            $distribution = [];
            $totalSurplus = 0;

            foreach ($originalItems as $item) {
                $requested = (float)$item->QuantityOld;
                $approved  = (float)$item->Quantity;

                $rawAllocated = $approved * $ratio;


                if ($rawAllocated > $requested) {
                    $finalAllocated = $requested;
                    $surplus = $rawAllocated - $requested;
                    $totalSurplus += $surplus;
                    $note = 'Đủ hàng (Dư ' . $surplus . ' chuyển kho)';
                } else {
                    $finalAllocated = $rawAllocated;
                    $note = ($finalAllocated < $requested) ? 'Thiếu hàng' : 'Đủ hàng';
                }

                $distribution[] = [
                    'po_number'    => $item->DocumentNo,
                    'sales_name'   => $item->order->user->name ?? $item->CreatedBy,
                    'requested'    => $requested,
                    'approved'     => $approved,
                    'allocated'    => (float)$finalAllocated,
                    'note'         => $note
                ];
            }
            $totalAllocatedToSales = array_sum(array_column($distribution, 'allocated'));

            $finalInventory = $actualSupplyQty - $totalAllocatedToSales;

            if ($finalInventory > 0.0001) {
                $distribution[] = [
                    'po_number'    => 'KHO_DU_TRU',
                    'sales_name'   => 'Kho / Cung ứng',
                    'requested'    => 0,
                    'allocated'    => (float)$finalInventory,
                    'note'         => 'Hàng dư nhập kho'
                ];
            }

            return response()->json([
                'product_name' => $mergeItem->ItemName,
                'total_supply' => $actualSupplyQty,
                'total_demand' => $originalItems->sum('QuantityOld'),
                'status'       => 'calculated',
                'distribution' => $distribution
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }
}
