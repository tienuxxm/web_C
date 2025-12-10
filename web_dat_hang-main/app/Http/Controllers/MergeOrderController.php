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
            // 1. Eager load:
            // - items: Chi tiết đơn gộp (để tính tiền)
            // - statusInfo: Tên trạng thái
            // - originalOrderItems.order: Để lấy Supplier từ đơn gốc
            $order = MergeOrder::with([
                'items', 
                'statusInfo', 
                'originalOrderItems.order' 
            ])
            ->where('DocumentNo', $id)
            ->firstOrFail();

            // 2. Tính tổng tiền (dựa trên các dòng của đơn gộp)
            $subtotal = $order->items->sum(function ($item) {
                return $item->Quantity * $item->Price;
            });

            // 3. Logic lấy Nhà Cung Cấp & Mục Đích
            // Mặc định
            $supplierName = 'N/A'; // Hoặc 'Nhiều nguồn'
            $intendedUse  = 'Gộp đơn';

            // Lấy dòng đơn gốc đầu tiên thuộc về đơn gộp này
            $firstOriginalItem = $order->originalOrderItems->first();

            // Nếu tìm thấy đơn gốc -> Lấy thông tin Header của nó
            if ($firstOriginalItem && $firstOriginalItem->order) {
                $originalHeader = $firstOriginalItem->order;
                
                $supplierName = $originalHeader->Supplier ?? 'N/A';
                $intendedUse  = $originalHeader->IntendedUse ?? 'Gộp đơn';
            }

            // 4. Format dữ liệu trả về
            $formattedOrder = [
                'id'                 => $order->DocumentNo,
                'order_number'       => $order->DocumentNo,
                
                // Dữ liệu lấy từ logic ở bước 3
                'supplier_name'      => $supplierName, 
                'intended_use'       => $intendedUse,
                
                'status'             => (int)$order->Status,
                'status_name'        => $order->statusInfo->Name ?? 'Không xác định',
                'order_date'         => $order->PostingDate,
                'estimated_delivery' => $order->ShipmentDate,
                'notes'              => $order->Note,
                'subtotal'           => $subtotal,
                'total_amount'       => $subtotal,
                'industry_id'        => $order->Industry,
                'created_by'         => $order->CreatedBy,

                // ITEMS (Chi tiết đơn gộp)
                'items' => $order->items->map(function ($item) {
                    return [
                        'id'           => $item->ID, // ID dòng merge
                        'product_code' => $item->ItemCode,
                        'product_name' => $item->ItemName,
                        'quantity'     => (float)$item->Quantity,
                        'unit_price'   => (float)$item->Price,
                        'unit'         => $item->Unit,
                        'total'        => (float)($item->Quantity * $item->Price),

                        // Thông tin product để hiển thị trong Modal
                        'product' => [
                            'id'    => $item->ItemCode,
                            'code'  => $item->ItemCode,
                            'name'  => $item->ItemName,
                            'price' => (float)$item->Price,
                            'color' => $item->Variant,
                        ]
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

        // 1. Tìm đơn hàng gộp
        $order = MergeOrder::where('DocumentNo', $id)->firstOrFail();

        $currentStatus = (int)$order->Status;
        $newStatus     = (int)$request->input('status');
        if ($newStatus === $currentStatus) {
            return response()->json([
                'message' => 'Bạn chưa cập nhật trạng thái đơn hàng.'
            ], 422);
        }
        $canChange = false;
        // --- QUYỀN: ADMIN (Quyền lực nhất) ---
        if ($user->isRole('Administrator')) {
            $canChange = true;
        }
        // --- PHÂN QUYỀN: NHÓM CUNG ỨNG / ADMIN / HÀNH CHÍNH ---
        if ($user->isRole('Supply')) {

            // Flow 1: Từ Nháp (8) -> Gửi duyệt (2) hoặc Hủy (5)
            // (Đoạn này thay thế cho logic cũ của bạn)
            if ($currentStatus == 8) { // OrderStatus::TYPE_DA_DUYET
                if ($newStatus == 2) {
                    $canChange = true;
                }
            }

            // Flow 2: Từ Đã duyệt (3) -> Đang đặt hàng (4)
            elseif ($currentStatus == 3) { // OrderStatus::TYPE_DA_DUYET
                if ($newStatus == 4) {
                    $canChange = true;
                }
            }

            // Flow 3: Từ Đang đặt hàng (4) -> Hoàn thành (11)
            elseif ($currentStatus == 4) { // OrderStatus::TYPE_DANG_DAT_HANG
                if ($newStatus == 11) {
                    $canChange = true;
                }
            }
        }

        // --- PHÂN QUYỀN: NHÓM LÃNH ĐẠO (LEADER / GIÁM ĐỐC) ---
        // (Giữ logic này để Sếp có thể duyệt đơn từ 2 -> 3)
        elseif ($user->isRole('Leader') || $user->isRole('Manage')) {
            if ($currentStatus == 2) { // Đang chờ duyệt
                if (in_array($newStatus, [3, 5])) { // Duyệt (3) hoặc Từ chối (5)
                    $canChange = true;
                }
            }
        }

        // Kiểm tra kết quả phân quyền
        if (!$canChange) {
            return response()->json([
                'message' => "Bạn không có quyền chuyển từ trạng thái [$currentStatus] sang [$newStatus]."
            ], 403);
        }

        // 2. Cập nhật Header
        $order->update([
            'Status' => $newStatus,
            'Note'   => $request->notes ?? $order->Note
        ]);

        // 3. (QUAN TRỌNG) Cập nhật Status cho các dòng chi tiết (Merge Line)
        // Để đảm bảo dữ liệu đồng bộ, khi Header đổi trạng thái thì Line cũng phải đổi theo
        \App\Models\MergeOrderItem::where('DocumentNo', $id)->update([
            'Status' => $newStatus
        ]);

        return $this->show($id); // Trả về dữ liệu mới nhất
    }

    // Helper fake tên trạng thái (hoặc bạn có thể join bảng Status nếu muốn chuẩn)

    // GET /api/merge-orders
    public function index(Request $request)
    {
        try {
            $user = JWTAuth::user();
            // 1. Query
            $query = MergeOrder::with(['items', 'statusInfo'])->orderBy('CreatedDate', 'desc');

            // --- 👇 LOGIC LỌC MỚI DỰA TRÊN 'GROUP' (filterType) ---
        $group = $request->get('group');

        // 1. Nhóm 'merged_process': Quy trình duyệt (Leader/Cung ứng)
        if ($group === 'merged_process') {
            // Status: Merge/Nháp (8), Đã duyệt (3), Hủy (5)
            $query->whereIn('Status', [8, 3, 5,2]); 
        }
        
        // 2. Nhóm 'merged_completed': Theo dõi & Hoàn tất
        elseif ($group === 'merged_completed') {
            // Status: Đã duyệt (3), Đang đặt (4), Hoàn thành (11)
            $query->whereIn('Status', [ 4, 11]);
        }
            // (Có thể thêm logic lọc theo User/Phòng ban nếu cần)

            // 2. Phân trang
            $limit = $request->get('limit', 10);
            $orders = $query->paginate($limit);

            // 3. Format dữ liệu cho khớp với OrdersPage
            $data = $orders->getCollection()->map(function ($order) {
                // Tính tổng tiền
                $totalAmount = $order->items->sum(function ($item) {
                    return $item->Quantity * $item->Price;
                });

                $firstOriginalItem = $order->originalOrderItems->load('order')->first();

    // 2. Lấy thông tin Supplier và IntendedUse từ Header của đơn gốc
                $supplierName = 'N/A';
                $intendedUse = 'Gộp đơn';

                if ($firstOriginalItem && $firstOriginalItem->order) {
                    $supplierName = $firstOriginalItem->order->Supplier ?? 'N/A';
                    $intendedUse  = $firstOriginalItem->order->IntendedUse ?? 'Gộp đơn';
                }

                return [
                    'id' => $order->DocumentNo,
                    'order_number' => $order->DocumentNo,
                    'supplier_name' => $supplierName, // Hoặc logic lấy tên NCC
                    'intended_use' => $intendedUse,
                    'customer_name' => $order->CreatedBy,
                    'created_at' => $order->CreatedDate,
                    'order_date' => $order->PostingDate, // Để hiển thị cột Date
                    'status' => (int)$order->Status,
                    'status_name' => $order->statusInfo->Name, // Hàm helper cũ
                    'total' => number_format($totalAmount, 0, ',', '.'), // Format tiền
                    'items_count' => $order->items->count(),
                    'items' => $order->items->map(function ($it) { // Map items sơ lược cho tooltip
                        return [
                            'id' => $it->ID, // 👈 THÊM DÒNG NÀY
                            'productName' => $it->ItemName,
                            'product_code' => $it->ItemCode,
                            'quantity' => (float)$it->Quantity,

                            // Map thêm cấu trúc này để OrderModal không bị lỗi
                            'product' => [
                                'id' => $it->ItemCode,
                                'code' => $it->ItemCode,
                                'name' => $it->ItemName,
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
