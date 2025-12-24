<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MergeOrder;
use App\Models\MergeOrderItem;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;

class MergeOrderController extends Controller
{
    // GET /api/merge-orders/{id}
    public function show($id)
    {
        try {
            // Load các quan hệ cần thiết
            $order = MergeOrder::with([
                'items', 
                'statusInfo', 
                'originalOrderItems.order' 
            ])
            ->where('DocumentNo', $id)
            ->firstOrFail();

            // Tính tổng tiền
            $subtotal = $order->items->sum(function ($item) {
                return $item->Quantity * $item->Price;
            });

            // Logic lấy thông tin gốc (như cũ)
            $supplierName = 'N/A';
            $intendedUse  = 'Gộp đơn';
            $firstOriginalItem = $order->originalOrderItems->first();

            if ($firstOriginalItem && $firstOriginalItem->order) {
                $originalHeader = $firstOriginalItem->order;
                $supplierName = $originalHeader->Supplier ?? 'N/A';
                $intendedUse  = $originalHeader->IntendedUse ?? 'Gộp đơn';
            }

            // Format dữ liệu trả về chuẩn theo Schema mới
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
                
                // --- THÔNG TIN TRACKING (HEADER) ---
                'created_by'            => $order->CreatedBy,
                'created_date'          => $order->CreatedDate,
                
                // Note: Thường là Sales hoặc Ghi chú chung
                'note'                  => $order->Note,           
                
                // ModifiedBy: Cung ứng hoặc Người sửa cuối cùng
                'modified_by'           => $order->ModifiedBy,     
                'modified_date'         => $order->ModifiedDate,   

                // Manager: Thông tin của Sếp/Leader
                'note_manager'          => $order->NoteManager,
                'modified_manager_by'   => $order->ModifiedManagerBy,
                'modified_manager_date' => $order->ModifiedManagerDate,

                // ITEMS (CHI TIẾT)
                'items' => $order->items->map(function ($item) {
                    return [
                        'id'               => $item->ID,
                        'purchase_line_id' => $item->PurchaseLineID, // Link về line gốc
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
                        // Tracking dòng
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

    // PUT /api/merge-orders/{id} (Dùng để duyệt đơn: 8 -> 2)
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
        
        // --- B. CUNG ỨNG (SUPPLY) HOẶC SALES HOẶC ADMIN ---
        // (Theo DB này, Cung ứng dùng cột ModifiedBy chung với Sales)
        else {
            // Header
            $headerUpdateData['ModifiedBy']   = $userCode;
            $headerUpdateData['ModifiedDate'] = $now;
            
            // Nếu có ghi chú, Cung ứng/Sales sẽ ghi vào cột Note chung
            if ($request->has('notes')) {
                $headerUpdateData['Note'] = $request->notes;
            }

            // Line
            $lineUpdateData['ModifiedBy']   = $userCode;
            $lineUpdateData['ModifiedDate'] = $now;
        }

        // 3. THỰC HIỆN UPDATE
        DB::connection('sqlsrv')->beginTransaction();
        try {
            // Update Header
            $order->update($headerUpdateData);

            // Update Lines
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
        
        // 1. LẤY TÊN BẢNG ĐỘNG TỪ MODEL (Best Practice)
        $headerModel = new MergeOrder();
        $lineModel   = new MergeOrderItem(); // 👈 Khởi tạo model Line để lấy tên bảng
        
        // Lấy tên thô: "API$Merge Header" và "API$Merge Line"
        $rawHeaderTbl = $headerModel->getTable(); 
        $rawLineTbl   = $lineModel->getTable();   
        
        // 🛠️ XỬ LÝ SQL SERVER: Bao ngoặc vuông [] vì tên bảng có dấu cách
        $tblHeader = '[' . $rawHeaderTbl . ']'; // "[API$Merge Header]"
        $tblLine   = '[' . $rawLineTbl . ']';   // "[API$Merge Line]"

        $query = MergeOrder::query();

        // ---------------------------------------------------------
        // A. PHẠM VI DỮ LIỆU (SCOPE)
        // ---------------------------------------------------------
        if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
            $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
            // Ở đây dùng tên cột 'Industry' bình thường vì Eloquent tự xử lý
            $query->whereIn('Industry', $allowedIndustries);
        }

        // ---------------------------------------------------------
        // B. CẤU HÌNH TRẠNG THÁI
        // ---------------------------------------------------------
        $pending = [];
        $processing = [];
        $total = []; 

        // TAB MERGED (Đang xử lý)
        if ($group === 'merged' || $group === 'merged_process') {
            if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')||$user->isRole('Supply')) {
                $pending = [8];      // Mới gộp
                $processing = [3];   // Đã duyệt
                $total = [8, 3];     
            } 
            elseif ($user->isRole('Leader')) {
                $pending = [2];      // Chờ duyệt
                $processing = [3];   // Đã duyệt
                $total = [2, 3];
            } else {
                $total = [8, 2, 3]; // Fallback
            }
        }
        // TAB COMPLETED (Hoàn thành)
        elseif ($group === 'merged_completed' || $group === 'completed') {
            $pending = [4];         
            $processing = [11];     
            $total = [4, 11];
        }

        if (empty($total)) {
            return response()->json(['total_orders' => 0, 'pending_orders' => 0, 'processing_orders' => 0, 'total_revenue' => 0]);
        }

        // ---------------------------------------------------------
        // C. ĐẾM SỐ LƯỢNG (Dùng biến $tblHeader)
        // ---------------------------------------------------------
        // Sử dụng $tblHeader để tránh lỗi cú pháp SQL Server
        $stats = $query->selectRaw("
            SUM(CASE WHEN $tblHeader.[Status] IN (" . implode(',', $total) . ") THEN 1 ELSE 0 END) as total,
            SUM(CASE WHEN $tblHeader.[Status] IN (" . implode(',', $pending) . ") THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN $tblHeader.[Status] IN (" . implode(',', $processing) . ") THEN 1 ELSE 0 END) as processing
        ")->first();

        // ---------------------------------------------------------
        // D. TÍNH DOANH THU (JOIN ĐỘNG)
        // ---------------------------------------------------------
        $revenue = 0;
        
        if ($stats->total > 0) {
            $revenueQuery = clone $query;
            
            // 1. Join dùng biến $tblLine (lấy từ Model MergeOrderItem)
            // Cú pháp: JOIN [API$Merge Line] as lines ON lines.DocumentNo = [API$Merge Header].DocumentNo
            $revenueQuery->join(
                DB::raw("$tblLine as lines"), 
                'lines.DocumentNo', 
                '=', 
                DB::raw("$tblHeader.[DocumentNo]") // Bọc DB::raw để Laravel không tự thêm ngoặc sai
            );

            // 2. Filter Status (Chỉ rõ bảng Header)
            $revenueQuery->whereIn(DB::raw("$tblHeader.[Status]"), $total);

            // 3. Tính tổng từ bảng Line
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
            // 2. LEADER: Thấy toàn bộ (Không filter Industry)
            elseif ($user->isRole('Leader')) {
                // No scope filter
            }

            $group = $request->get('group', 'merged'); // Mặc định là 'merged'

            // --- TRƯỜNG HỢP 1: TAB MERGED ORDERS (Đơn gộp) ---
            if ($group === 'merged' || $group === 'merged_process') {
                
                // Logic cho SUPPLY / HÀNH CHÍNH
                if ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
                    // Hiển thị: 8 (Mới gộp), 3 (Đã duyệt), 5 (Hủy - xem lịch sử)
                    $query->whereIn('Status', [8, 3,2, 5]);
                }
                
                // Logic cho LEADER
                elseif ($user->isRole('Leader')) {
                    // Hiển thị: 2 (Chờ duyệt), 3 (Đã duyệt), 5 (Hủy - xem lịch sử)
                    $query->whereIn('Status', [2, 3, 5]);
                }
                
                // Fallback (cho Admin hoặc role khác nếu có): Thấy hết các trạng thái đang chạy
                else {
                    $query->whereIn('Status', [8, 2, 3, 5]); 
                }
            }

            // --- TRƯỜNG HỢP 2: TAB COMPLETED (Đơn hoàn thành) ---
            elseif ($group === 'completed' || $group === 'merged_completed') {
                // Cả Supply và Leader đều thấy giống nhau ở đây
                // Hiển thị: 4 (Đang đặt hàng), 11 (Hoàn thành)
                $query->whereIn('Status', [4, 11]);
            }

            // ---------------------------------------------------------
            // C. TÌM KIẾM
            // ---------------------------------------------------------
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where('DocumentNo', 'like', "%{$search}%");
            }

            // ---------------------------------------------------------
            // D. PHÂN TRANG & FORMAT DỮ LIỆU
            // ---------------------------------------------------------
            $limit = $request->get('limit', 10);
            $orders = $query->paginate($limit);

            $data = $orders->getCollection()->map(function ($order) {
                // Tính tổng tiền
                $totalAmount = $order->items->sum(fn($item) => $item->Quantity * $item->Price);

                // Lấy item gốc đầu tiên để trích xuất thông tin chung
                $firstOriginalItem = $order->originalOrderItems->first();
                
                // Dùng toán tử null-safe (?->) để tránh lỗi nếu đơn gốc bị xóa hoặc null
                $supplierName = $firstOriginalItem?->order?->Supplier ?? 'N/A';
                $intendedUse  = $firstOriginalItem?->order?->IntendedUse ?? 'Gộp đơn';

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
                            // Object product hỗ trợ modal xem chi tiết
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
