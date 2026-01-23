<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\Product;
use App\Models\OrderItem;
use App\Models\OrderStatus;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Category;
use App\Models\OrderOriginal;
use App\Models\MergeOrder;
use App\Models\MergeOrderItem;
use App\Policies\OrderPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

use function Symfony\Component\Clock\now;

class OrderController extends Controller
{
    use AuthorizesRequests;
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    // POST /api/orders
    public function store(Request $request)
    {
        $user = JWTAuth::user();
        $this->authorize('create', Order::class);
        $request->validate([
            'industry_id'   => 'required',
            'supplier_name' => 'nullable|string',
            'intended_use'  => 'required|string',
            'orderDate'     => 'required|date',
            'estimated_delivery' => 'required|date',
            'items'         => 'required|array|min:1',
            'items.*.productCode' => 'required',
            'items.*.quantity'    => 'required|numeric|min:1',
            'items.*.quantity_old' => 'nullable|numeric|min:1',
            'items.*.productName' => 'required',
        ]);
        DB::connection('sqlsrv')->beginTransaction();
        try {
            $prefix = 'PO' . date('ym');
            $lastOrder = Order::where('DocumentNo', 'like', $prefix . '%')
                ->orderBy('DocumentNo', 'desc')
                ->lockForUpdate()
                ->first();
            $nextNum = 1;
            if ($lastOrder) {
                $lastSeq = intval(substr($lastOrder->DocumentNo, -4));
                $nextNum = $lastSeq + 1;
            }
            $newDocumentNo = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);
            Order::create([
                'DocumentNo'   => $newDocumentNo,
                'PostingDate'  => $request->orderDate,
                'ShipmentDate' => $request->estimated_delivery,
                'Industry'     => $request->industry_id,
                'IntendedUse'  => $request->intended_use,
                'Supplier'     => $request->supplier_name ?? '',
                'Status'       => 1,
                'Note'         => $request->notes ?? '',
                'CreatedBy'    => $user->code,
                'CreatedDate'  => now(),
            ]);
            foreach ($request->items as $index => $itemData) {
                $inputQty = (float)$itemData['quantity_old'];
                $quantity    = $inputQty;
                $quantityOld = $inputQty;
                $cleanCode = $itemData['productCode'];
                $isIndustry18 = ($request->industry_id == 18);
                $variant = $itemData['variant'] ?? $itemData['color'] ?? ($isIndustry18 ? '000' : '');
                $prod = Product::where('code', $cleanCode)
                                ->where('Variant', $variant)       
                                ->first();
                if ($prod) {
                    $itemName = $prod->Name;
                    $price    = $prod->Price;
                    $unit     = $prod->Unit;
                    if (empty($variant)) $variant = $prod->color;
                } else {
                    $itemName = $itemData['productName'];
                    $price    = isset($itemData['price']) ? (float)$itemData['price'] : 0;
                    $unit     = 'CAI';
                }
                // Insert : Line
                OrderItem::create([
                    'DocumentNo'  => $newDocumentNo,
                    'Line'        => ($index + 1),
                    'PostingDate' => $request->orderDate,
                    'ItemCode'    => $cleanCode,
                    'Variant'     => $variant,
                    'ItemName'    => $itemName,
                    'Unit'        => $unit,
                    'Quantity'    => $quantity,
                    'QuantityOld' => $quantityOld,
                    'Price'       => $price,
                    'Status'      => 1,
                    'CreatedBy'   => $user->code,
                    'CreatedDate' => now(),
                ]);
            }

            DB::connection('sqlsrv')->commit();

            return response()->json(['message' => 'Tạo đơn hàng thành công', 'id' => $newDocumentNo], 201);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi tạo đơn hàng: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $user = JWTAuth::user();
        $order = Order::with('statusInfo')->where('DocumentNo', $id)->first();

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }
        $this->authorize('update', $order);
        $currentStatus = (int)$order->Status;
        $inputStatus   = (int)$request->input('status');
        if ($inputStatus !== $currentStatus) {
            if ($user->cannot('updateStatus', [$order, $inputStatus])) {
                return response()->json([
                    'message' => "Bạn không có quyền chuyển trạng thái từ [$currentStatus] sang [$inputStatus]."
                ], 403);
            }
        } else {
            $canSaveDraft = ($user->isRole('Sales') || $user->isInDepartment('IT')) && $currentStatus == 1;
            if (!$canSaveDraft) {
                return response()->json(['message' => 'Trạng thái không đổi và bạn không có quyền lưu nháp.'], 422);
            }
        }

        // if ($user->isRole('Supply')) {
        //     $finalSupplier = $request->supplier_name ?? $order->Supplier;

        //     if (empty($finalSupplier)) {
        //         return response()->json([
        //             'message' => 'Lỗi: Cung ứng bắt buộc phải nhập thông tin Nhà cung cấp.'
        //         ], 422);
        //     }
        // }

        if (in_array($inputStatus, [10, 5]) && empty($request->notes || $request->note_supply || $request->note_manager)) {
            return response()->json(['message' => 'Bắt buộc nhập lý do vào ô Ghi chú.'], 422);
        }
        $now = now();
        $userCode = $user->code;
        $updateData = [
            'PostingDate'  => $request->orderDate,
            'ShipmentDate' => $request->estimated_delivery,
            'Supplier'     => $request->supplier_name ?? '',
            'IntendedUse'  => $request->intended_use,
            'Status'       => $inputStatus,
            'Note'         => $request->notes ?? $order->Note,
            'ModifiedBy'   => $userCode,
            'ModifiedDate' => $now,
        ];
        if ($user->isRole('Supply') || $user->isInDepartment('Cung ứng')) {
            $updateData['ModifiedSupplyBy']   = $userCode;
            $updateData['ModifiedSupplyDate'] = $now;
            if ($request->has('note_supply')) {
                $updateData['NoteSupply'] = $request->note_supply;
            }
        } elseif ($user->isRole('Leader') || $user->isRole('Manage')) {
            $updateData['ModifiedManagerBy']   = $userCode;
            $updateData['ModifiedManagerDate'] = $now;
            if ($request->has('note_manager')) {
                $updateData['NoteManager'] = $request->note_manager;
            }
        }
        DB::connection('sqlsrv')->beginTransaction();
        try {
            $order->update($updateData);
            if ($inputStatus !== 5) { // 5 = Hủy
                if ($user->can('editItems', $order)) {
                    // Xóa cũ
                    OrderItem::where('DocumentNo', $id)->delete();
                    // Tạo mới
                    foreach ($request->items as $index => $itemData) {
                        $cleanCode = $itemData['productCode'];
                        $quantity  = (float)$itemData['quantity'];
                        $quantityOld = (float)$itemData['quantity_old'];
                        $price     = (float)$itemData['price'];
                        // Variant Logic
                        $isIndustry18 = ($order->Industry == 18);
                        $variant = $itemData['variant'] ?? $itemData['color'] ?? ($isIndustry18 ? '000' : '');
                        $prod = Product::where('code', $cleanCode)
                                ->where('Variant', $variant)       
                                ->first();
                        if ($prod) {
                            $itemName = $prod->Name;
                            $unit     = $prod->Unit;
                            if (empty($variant)) $variant = $prod->color;
                        } else {
                            $itemName = $itemData['productName'] ?? 'N/A';
                            $price    = isset($itemData['price']) ? (float)$itemData['price'] : 0;
                            $unit     = 'CAI';
                        }
                        OrderItem::create([
                            'DocumentNo'  => $id,
                            'Line'        => $index + 1,
                            'PostingDate' => $request->orderDate,
                            'ItemCode'    => $cleanCode,
                            'Variant'     => $variant,
                            'ItemName'    => $itemName,
                            'Unit'        => $unit,
                            'Quantity'    => $quantity,
                            'QuantityOld' => $quantityOld,
                            'Price'       => $price,
                            'Status'      => $inputStatus,
                            'CreatedBy'   => $order->CreatedBy,
                            'CreatedDate' => $order->CreatedDate,
                            'ModifiedBy'   => $userCode,
                            'ModifiedDate' => $now,
                        ]);
                    }
                }
            }

            DB::connection('sqlsrv')->commit();
            return response()->json([
                'message' => 'Cập nhật thành công',
            ]);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $user = JWTAuth::user();
            $group = $request->get('group', 'all_orders');

            $query = Order::with(['items', 'user', 'statusInfo'])
                ->orderBy('CreatedDate', 'desc');

            // 1. SCOPE (Ai được xem gì)
            if ($user->isRole('Sales')) {
                $query->where('CreatedBy', $user->code);
            } elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
                $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
                $query->whereIn('Industry', $allowedIndustries);
            }

            // 2. FILTER STATUS
            $statusFilter = [];
            if ($group === 'all_orders') {
                if ($user->isRole('Sales')) {
                    $statusFilter = [1, 10];
                } elseif ($user->isInDepartment('Cung ứng')) {
                    $statusFilter = [1, 7];
                } else {
                    $statusFilter = [1, 7, 10];
                }
            } elseif ($group === 'completed') {
                $statusFilter = [4, 11];
            }

            if (!empty($statusFilter)) {
                $query->whereIn('Status', $statusFilter);
            }

            // 3. TÌM KIẾM
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where(function ($q) use ($search) {
                    $q->where('DocumentNo', 'like', "%{$search}%")
                        ->orWhere('Supplier', 'like', "%{$search}%");
                });
            }

            // 4. TRẢ VỀ KẾT QUẢ
            $orders = $query->paginate($request->get('limit', 10));

            $data = $orders->getCollection()->map(function ($order) {
                return [
                    'id'            => $order->DocumentNo,
                    'order_number'  => $order->DocumentNo,
                    'supplier_name' => $order->Supplier,
                    'intended_use'  => $order->IntendedUse,
                    'customer_name' => $order->user->name ?? $order->CreatedBy,
                    'created_at'    => $order->CreatedDate,
                    'status'        => (int)$order->Status,
                    'status_name'   => $order->statusInfo->Name ?? 'Unknown',
                    'total_amount'  => $order->items->sum(fn($i) => $i->Quantity * $i->Price),
                    'items_count'   => $order->items->count(),

                    // --- 👇 THÔNG TIN TRACKING (MỚI THÊM) ---
                    'note'                  => $order->Note,

                    // Thông tin Cung ứng
                    'note_supply'           => $order->NoteSupply,
                    'modified_supply_by'    => $order->ModifiedSupplyBy,
                    'modified_supply_date'  => $order->ModifiedSupplyDate,

                    // Thông tin Lãnh đạo
                    'note_manager'          => $order->NoteManager,
                    'modified_manager_by'   => $order->ModifiedManagerBy,
                    'modified_manager_date' => $order->ModifiedManagerDate,

                    // Thông tin sửa cuối cùng
                    'modified_by'           => $order->ModifiedBy,
                    'modified_date'         => $order->ModifiedDate,

                    'items' => $order->items->map(function ($item) {
                        return [
                            'id'           => $item->ID,
                            'product_name' => $item->ItemName,
                            'quantity'     => (float)$item->Quantity,
                            'price'        => (float)$item->Price,
                            'total'        => (float)($item->Quantity * $item->Price),
                            // Tracking dòng
                            'line_modified_by'   => $item->ModifiedBy,
                            'line_modified_date' => $item->ModifiedDate,
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

    public function getStatuses()
    {
        return OrderStatus::purchasing()
            ->select('ID', 'Name', 'Type') // <--- BẮT BUỘC PHẢI CÓ 'Type'
            ->orderBy('ID')
            ->get();
    }
    public function stats(Request $request)
    {
        $user = JWTAuth::user();
        $group = $request->get('group', 'all_orders');

        $tbl = (new Order)->getTable();
        $query = Order::query();

        // 1. SCOPE
        if ($user->isRole('Sales')) {
            $query->where("$tbl.CreatedBy", $user->code);
        } elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam') || $user->isRole('Supply')) {
            $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
            $query->whereIn("$tbl.Industry", $allowedIndustries);
        }
        // 2. CẤU HÌNH ĐẾM
        $pending = [];
        $processing = [];
        $total = [];

        if ($group === 'all_orders') {
            if ($user->isRole('Sales')) {
                $pending = [1];      // Mới
                $processing = [10];  // Điều chỉnh
                $total = [1, 10];
            } elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam') || $user->isRole('Supply')) {
                $pending = [1];      // Mới (cần duyệt)
                $processing = [7];   // Đã chốt (cần gộp)
                $total = [1, 7];
            }
        } elseif ($group === 'completed') {
            $pending = [4];          // Đang đặt hàng
            $processing = [11];      // Hoàn thành
            $total = [4, 11];
        }

        // 3. THỰC HIỆN ĐẾM
        if (empty($total)) {
            return response()->json(['total_orders' => 0, 'pending_orders' => 0, 'processing_orders' => 0, 'total_revenue' => 0]);
        }

        $stats = $query->selectRaw("
            SUM(CASE WHEN Status IN (" . implode(',', $total) . ") THEN 1 ELSE 0 END) as total,
            SUM(CASE WHEN Status IN (" . implode(',', $pending) . ") THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN Status IN (" . implode(',', $processing) . ") THEN 1 ELSE 0 END) as processing
        ")->first();

        // 4. TÍNH DOANH THU (Chỉ tính trên các đơn trong Status Total)
        $revenue = 0;
        if ($stats && $stats->total > 0) {
            $revenue = (clone $query)
                ->whereIn("$tbl.Status", $total)
                ->join('API$Purchase Line as lines', "$tbl.DocumentNo", '=', 'lines.DocumentNo')
                ->sum(DB::raw('lines.Quantity * lines.Price'));
        }

        return response()->json([
            'total_orders'      => (int) ($stats->total ?? 0),
            'pending_orders'    => (int) ($stats->pending ?? 0),
            'processing_orders' => (int) ($stats->processing ?? 0),
            'total_revenue'     => (float) $revenue
        ]);
    }
    /** ----------- DELETE ----------- */
    public function destroy($orderNumber)
    {
        $user = JWTAuth::user();
        $order = Order::where('order_number', $orderNumber)->firstOrFail();


        // Gọi policy delete (tự động kiểm tra trạng thái và phòng ban)
        $this->authorize('delete', $order);

        DB::beginTransaction();
        try {
            $order->items()->delete();
            $order->delete();

            DB::commit();
            return response()->json(['message' => 'Đơn hàng đã được xóa.']);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Lỗi khi xóa đơn hàng.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // GET /api/orders/{id}
    public function show($id)
    {
        try {
            $order = Order::with(['user', 'statusInfo', 'items.product', 'supplyUser', 'managerUser', 'modifierUser',])
                ->where('DocumentNo', $id)
                ->firstOrFail();

            $subtotal = $order->items->sum(function ($item) {
                return $item->Quantity * $item->Price;
            });
            $history = [];
            if (!empty($order->Note)) {
                $history[] = [
                    'name' =>  $order->user->name ?? '',
                    'content' => $order->Note,
                    'time' => $order->ModifiedDate
                ];
            }
            // 2. Note của Supply
            if (!empty($order->NoteSupply)) {
                $history[] = [
                    'name' => $order->supplyUser->name ?? '',
                    'content' => $order->NoteSupply,
                    'time' => $order->ModifiedSupplyDate
                ];
            }

            // 3. Note của Leader
            if (!empty($order->NoteManager)) {
                $history[] = [
                    'name' => $order->managerUser->name ?? '',
                    'content' => $order->NoteManager,
                    'time' => $order->ModifiedManagerDate
                ];
            }

            usort($history, function ($a, $b) {
                return strtotime($a['time']) - strtotime($b['time']);
            });
            $formattedOrder = [
                'id' => $order->ID,
                'order_number' => $order->DocumentNo,
                'supplier_name' => $order->Supplier,
                'intended_use' => $order->IntendedUse,
                'status' => (int)$order->Status,
                'status_name' =>  $order->statusInfo->Name,
                'order_date' => $order->PostingDate,
                'note_history' => $history,

                'created_by'            => $order->CreatedBy,
                'created_date'          => $order->CreatedDate,
                'created_name'          => $order->user->name,

                'modified_supply_by'    => $order->ModifiedSupplyBy,
                'modified_supply_date'  => $order->ModifiedSupplyDate,
                'modified_supply_name'  => $order->supplyUser->name ?? '',
                'note_supply'           => $order->NoteSupply,

                'modified_manager_by'   => $order->ModifiedManagerBy,
                'modified_manager_date' => $order->ModifiedManagerDate,
                'note_manager'          => $order->NoteManager,

                'modified_by'           => $order->ModifiedBy,
                'modified_date'         => $order->ModifiedDate,
                'estimated_delivery' => $order->ShipmentDate,
                'notes' => $order->Note,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
                'industry_id' => $order->Industry,
                'items' => $order->items->map(function ($item) use ($order) {
                    $uniqueProductId = $item->ItemCode . ($item->Variant ? '-' . $item->Variant : '');
                    $catId = $item->product ? $item->product->category_id : null;
                    if (!$catId) $catId = $order->Industry;
                    $erpPrice = $item->product ? (float)$item->product->price : 0;
                    return [
                        'id' => $item->ID,
                        'product_code' => $item->ItemCode,
                        'product_name' => $item->ItemName,
                        'quantity' => (float)$item->Quantity,
                        'quantity_old' => (float)$item->QuantityOld,
                        'unit_price' => (float)$item->Price,
                        'erp_price' => $erpPrice,
                        'unit' => $item->Unit,
                        'total' => (float)($item->Quantity * $item->Price),
                        'product' => [
                            'id'    => $uniqueProductId,
                            'code' => $item->ItemCode,
                            'name' => $item->ItemName,
                            'price' => (float)$item->Price,
                            'unit' => $item->Unit,
                            'color' => $item->Variant,
                            'categoryId' => $catId,
                        ]
                    ];
                }),
            ];
            return response()->json([
                'order' => $formattedOrder
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng ' . $id], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi tải chi tiết đơn hàng', 'error' => $e->getMessage()], 500);
        }
    }

    public function checkMergeAvailability(Request $request)
    {
        $orderIds = $request->input('order_ids', []);
        if (empty($orderIds)) return response()->json([]);

        // 1. Lấy thông tin các đơn PO được chọn
        $orders = Order::whereIn('DocumentNo', $orderIds)->get();

        if ($orders->isEmpty()) return response()->json([]);

        $firstOrder = $orders->first();
        $supplier = $firstOrder->Supplier;
        $industry = $firstOrder->Industry;
        $existingMerges = MergeOrder::where('Status', 8)
            ->where('Industry', $industry)
            ->whereHas('originalOrderItems.order', function ($q) use ($supplier) {
                $q->where('Supplier', $supplier);
            })
            ->withCount('items')
            ->orderBy('CreatedDate', 'desc')
            ->get(['DocumentNo', 'PostingDate', 'Note', 'CreatedDate']);


        // Trả về danh sách để FE hiển thị
        return response()->json([
            'valid' => true,
            'supplier' => $supplier,
            'industry' => $industry,
            'existing_merges' => $existingMerges
        ]);
    }

    public function merge(Request $request)
    {
        $user = JWTAuth::user();
        $orderIds = $request->input('order_ids', []);
        $targetMergeId = $request->input('target_merge_id'); // ID đơn gộp cũ (nếu chọn)

        if (empty($orderIds)) return response()->json(['message' => 'Chưa chọn đơn hàng'], 422);

        $orders = Order::with('items')
            ->whereIn('DocumentNo', $orderIds)
            ->where('Status', OrderStatus::TYPE_CHOT)
            ->get();

        if ($orders->count() === 0) return response()->json(['message' => 'Không có đơn hàng hợp lệ.'], 422);

        DB::connection('sqlsrv')->beginTransaction();
        try {

            $timestamps = $orders->map(function ($o) {
                return \Carbon\Carbon::parse($o->ShipmentDate)->timestamp;
            })->toArray();
            $targetMergeOrder = null;
            if ($targetMergeId) {
                $targetMergeOrder = MergeOrder::with('items')->where('DocumentNo', $targetMergeId)->firstOrFail();
                if ($targetMergeOrder->Status != 8) {
                    throw new \Exception("Đơn gộp $targetMergeId không còn ở trạng thái Nháp.");
                }
                $timestamps[] = \Carbon\Carbon::parse($targetMergeOrder->ShipmentDate)->timestamp;
            }

            // 3. Tính trung bình cộng
            $avgTimestamp = array_sum($timestamps) / count($timestamps);
            $avgShipmentDate = \Carbon\Carbon::createFromTimestamp($avgTimestamp);


            $mergeOrder = null;

            if ($targetMergeOrder) {
                // A. TRƯỜNG HỢP GỘP VÀO ĐƠN CŨ
                $mergeOrder = $targetMergeOrder;

                // Cập nhật Header
                $mergeOrder->update([
                    'ShipmentDate' => $avgShipmentDate, // Cập nhật ngày trung bình mới
                    'ModifiedBy'   => $user->code,
                    'ModifiedDate' => now(),
                ]);
            } else {
                // B. TRƯỜNG HỢP TẠO MỚI (Code cũ của bạn)
                $prefix = 'MP' . date('ym');
                $lastMerge = MergeOrder::where('DocumentNo', 'like', $prefix . '%')
                    ->orderBy('DocumentNo', 'desc')->lockForUpdate()->first();
                $nextNum = $lastMerge ? intval(substr($lastMerge->DocumentNo, -4)) + 1 : 1;
                $newDocumentNo = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);


                $mergeOrder = MergeOrder::create([
                    'DocumentNo'   => $newDocumentNo,
                    'PostingDate'  => $orders->first()->PostingDate,
                    'ShipmentDate' => $avgShipmentDate,
                    'Industry'     => $orders->first()->Industry,
                    'Status'       => OrderStatus::TYPE_MERGE,
                    'Note'         => null,
                    'CreatedBy'    => $user->code,
                    'CreatedDate'  => now(),
                ]);
            }

            // --- XỬ LÝ ITEMS (QUAN TRỌNG: CỘNG DỒN) ---
            // Gom nhóm items từ các PO mới
            $newItemsDict = [];
            foreach ($orders as $order) {
                foreach ($order->items as $item) {
                    $key = $item->ItemCode . '_' . ($item->Variant ?? '');
                    if (!isset($newItemsDict[$key])) {
                        $newItemsDict[$key] = [
                            'obj' => $item, // Giữ object để lấy thông tin name, unit...
                            'qty' => 0,
                            'qty_old' => 0,
                            'ids' => []
                        ];
                    }
                    $newItemsDict[$key]['qty'] += $item->Quantity;
                    $newItemsDict[$key]['qty_old'] += $item->QuantityOld;
                    $newItemsDict[$key]['ids'][] = $item->ID;
                }
            }

            // Duyệt qua danh sách items mới gom được để Insert hoặc Update vào đơn Merge
            foreach ($newItemsDict as $key => $data) {
                $itemSample = $data['obj'];
                $newQty     = $data['qty'];
                $newQtyOld  = $data['qty_old'];
                $newIdsStr  = implode('-', $data['ids']);

                // Tìm xem trong đơn Merge đã có sản phẩm này chưa
                $existingLine = MergeOrderItem::where('DocumentNo', $mergeOrder->DocumentNo)
                    ->where('ItemCode', $itemSample->ItemCode)
                    ->where('Variant', $itemSample->Variant ?? '') // Cần xử lý null variant cẩn thận
                    ->first();

                if ($existingLine) {
                    // UPDATE: Cộng dồn số lượng và nối chuỗi ID
                    $existingLine->update([
                        'Quantity'       => $existingLine->Quantity + $newQty,
                        'QuantityOld'    => $existingLine->QuantityOld + $newQtyOld,
                        'PurchaseLineID' => $existingLine->PurchaseLineID . '-' . $newIdsStr, // Nối thêm ID mới
                        'ModifiedBy'     => $user->code,
                        'ModifiedDate'   => now()
                    ]);
                } else {
                    // INSERT: Tạo dòng mới (Lấy Line number tiếp theo)
                    $maxLine = MergeOrderItem::where('DocumentNo', $mergeOrder->DocumentNo)->max('Line') ?? 0;

                    MergeOrderItem::create([
                        'DocumentNo'     => $mergeOrder->DocumentNo,
                        'Line'           => $maxLine + 1,
                        'PostingDate'    => now(),
                        'ItemCode'       => $itemSample->ItemCode,
                        'Variant'        => $itemSample->Variant,
                        'ItemName'       => $itemSample->ItemName,
                        'Unit'           => $itemSample->Unit,
                        'Quantity'       => $newQty,
                        'QuantityOld'    => $newQtyOld,
                        'Price'          => $itemSample->Price,
                        'Status'         => 8,
                        'PurchaseLineID' => $newIdsStr,
                        'CreatedBy'      => $user->code,
                        'CreatedDate'    => now(),
                    ]);
                }
            }

            // Cập nhật trạng thái các PO con
            Order::whereIn('DocumentNo', $orderIds)->update(['Status' => OrderStatus::TYPE_MERGE]);

            // Cập nhật trạng thái các dòng PO con (để biết nó thuộc MergeHeader nào)
            $allNewSourceIds = [];
            foreach ($newItemsDict as $d) $allNewSourceIds = array_merge($allNewSourceIds, $d['ids']);

            if (!empty($allNewSourceIds)) {
                \App\Models\OrderItem::whereIn('ID', $allNewSourceIds)->update([
                    'MergeHeaderID' => $mergeOrder->DocumentNo,
                    'Status'        => OrderStatus::TYPE_MERGE
                ]);
            }

            DB::connection('sqlsrv')->commit();

            return response()->json([
                'message' => 'Gộp đơn thành công',
                'merge_order_id' => $mergeOrder->DocumentNo
            ]);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }



    public function getAllIds(Request $request)
    {
        $status = $request->query('status'); // Lấy tham số status từ URL

        // Query chỉ lấy cột DocumentNo (nhẹ và nhanh)
        $query = Order::query();

        if ($status) {
            $query->where('Status', $status);
        }


        $ids = $query->pluck('DocumentNo');

        return response()->json($ids);
    }
    // POST /api/orders/split
    public function split(Request $request)
    {
        $user = JWTAuth::user();
        $currentMergeId = $request->input('merge_id');
        $lineIdsToSplit = $request->input('line_ids'); // Mảng ID các dòng muốn tách

        // 1. Load đơn hiện tại
        $currentOrder = MergeOrder::where('DocumentNo', $currentMergeId)->firstOrFail();

        if ($currentOrder->Status != 8) {
            return response()->json(['message' => 'Chỉ được tách đơn khi đang ở trạng thái Nháp.'], 422);
        }

        // -----------------------------------------------------------
        // 2. [THÊM MỚI] KIỂM TRA SỐ LƯỢNG ĐỂ CHẶN
        // -----------------------------------------------------------
        // Đếm tổng số dòng hiện có của đơn gốc
        $totalLines = MergeOrderItem::where('DocumentNo', $currentMergeId)->count();

        // Nếu số lượng muốn tách >= Tổng số dòng hiện có -> Chặn luôn
        if (count($lineIdsToSplit) >= $totalLines) {
            return response()->json([
                'message' => 'Không thể tách hết toàn bộ sản phẩm. Đơn gốc phải giữ lại ít nhất 1 dòng.'
            ], 422);
        }
        // -----------------------------------------------------------

        DB::connection('sqlsrv')->beginTransaction();
        try {
            // 3. Tạo đơn gộp MỚI
            $prefix = 'MP' . date('ym');
            $lastMerge = MergeOrder::where('DocumentNo', 'like', $prefix . '%')
                ->orderBy('DocumentNo', 'desc')
                ->lockForUpdate()->first();
            $nextNum = $lastMerge ? intval(substr($lastMerge->DocumentNo, -4)) + 1 : 1;
            $newDocumentNo = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

            // Tạo Note cho đơn mới (kế thừa Note cũ nếu muốn)
            $newNote = $currentOrder->Note;


            MergeOrder::create([
                'DocumentNo'   => $newDocumentNo,
                'PostingDate'  => now(),
                'ShipmentDate' => $currentOrder->ShipmentDate,
                'Industry'     => $currentOrder->Industry,
                'Status'       => 8,
                'Note'         => $newNote,
                'CreatedBy'    => $user->code,
                'CreatedDate'  => now(),
            ]);

            // 4. Di chuyển các dòng (Line) sang đơn mới
            MergeOrderItem::whereIn('ID', $lineIdsToSplit)
                ->where('DocumentNo', $currentMergeId)
                ->update([
                    'DocumentNo' => $newDocumentNo,
                    'Line' => DB::raw("Line"),
                    'ModifiedBy' => $user->code,
                    'ModifiedDate' => now()
                ]);

            // 5. Cập nhật Purchase Line (Đổi MergeHeaderID cho đơn gốc)
            // Lấy lại danh sách dòng vừa chuyển sang đơn mới để tìm PurchaseLineID gốc
            $movedLines = MergeOrderItem::where('DocumentNo', $newDocumentNo)->get();
            $originalLineIds = [];
            foreach ($movedLines as $mLine) {
                $ids = explode('-', $mLine->PurchaseLineID);
                foreach ($ids as $id) if (is_numeric($id)) $originalLineIds[] = $id;
            }

            if (!empty($originalLineIds)) {
                \App\Models\OrderItem::whereIn('ID', $originalLineIds)
                    ->update(['MergeHeaderID' => $newDocumentNo]);
            }

            DB::connection('sqlsrv')->commit();

            return response()->json([
                'message' => 'Đã tách đơn thành công.',
                'old_order_id' => $currentMergeId,
                'new_order_id' => $newDocumentNo
            ]);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi tách đơn: ' . $e->getMessage()], 500);
        }
    }
    public function search(Request $request)
    {
        $q = $request->query('q', '');

        $orders = Order::with(['items.product.category'])
            ->where('order_number', 'like', "%$q%")
            ->orWhere('supplier_name', 'like', "%$q%")
            ->orWhereHas('items', function ($query) use ($q) {
                $query->where('product_name', 'like', "%$q%");
            })
            ->orWhereHas('items.product', function ($query) use ($q) {
                $query->where('barcode', 'like', "%$q%")
                    ->orWhere('color', 'like', "%$q%");
            })
            ->orWhereHas('items.product.category', function ($query) use ($q) {
                $query->where('name', 'like', "%$q%");
            })
            ->get();

        return response()->json($orders);
    }
    public function importMultipleOrders(Request $request)
    {
        $user = JWTAuth::user();
        $this->authorize('create', Order::class);

        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'Vui lòng chọn file Excel.'], 400);
        }
        if (!$request->industry_id) {
            return response()->json(['message' => 'Vui lòng chọn Ngành hàng trước khi import.'], 422);
        }

        DB::connection('sqlsrv')->beginTransaction();

        try {
            $file = $request->file('file');
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getPathname());
            $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, true);
            array_shift($rows);

            if (count($rows) === 0) {
                return response()->json(['message' => 'File Excel không có dữ liệu.'], 422);
            }

            $groupedOrders = [];
            $allowManualItems = ((int)$request->industry_id === 18);

            foreach ($rows as $index => $row) {
                // Đọc các cột
                $code     = trim($row['A'] ?? '');
                $name     = trim($row['B'] ?? '');
                $quantity = floatval($row['C'] ?? 0);
                $price    = floatval($row['D'] ?? 0);
                $supplier = trim($row['E'] ?? '');
                $color    = trim($row['F'] ?? '');

                // Đọc thêm các cột mở rộng
                $intendedUse = trim($row['G'] ?? '');
                $note        = trim($row['H'] ?? '');

                // 👉 THAY ĐỔI 1: Đọc thêm cột I (Ngày giao hàng)
                $shipmentDateRaw = trim($row['I'] ?? '');

                if ($quantity <= 0 || !$supplier) continue;

                // Logic tự sinh mã cho Ngành 18
                if (empty($code) && $allowManualItems) {
                    $code = '18' . date('ymd') . str_pad($index, 4, '0', STR_PAD_LEFT);
                }
                if (empty($color) && $allowManualItems) {
                    $color = '000';
                }

                if (empty($code)) {
                    return response()->json(['message' => "Dòng " . ($index + 2) . ": Thiếu Mã sản phẩm (Cột A)."], 422);
                }

                // Gom nhóm
                $groupedOrders[$supplier][] = [
                    'code'         => $code,
                    'name'         => $name,
                    'quantity'     => $quantity,
                    'price'        => $price,
                    'color'        => $color,
                    'intendedUse'  => $intendedUse,
                    'note'         => $note,
                    'shipmentDate' => $shipmentDateRaw, // 👉 Lưu ngày vào mảng
                    'line_index'   => $index + 2
                ];
            }

            $createdOrders = [];
            $industryId = (int)$request->industry_id;

            // Xử lý tạo đơn
            foreach ($groupedOrders as $supplierName => $items) {

                // Lấy dữ liệu Header từ dòng đầu tiên của nhóm
                $firstItem = $items[0];
                $orderIntendedUse = !empty($firstItem['intendedUse']) ? $firstItem['intendedUse'] : 'Import Excel';
                $orderNote        = !empty($firstItem['note']) ? $firstItem['note'] : 'Imported from Excel';

                // 👉 THAY ĐỔI 2: Xử lý Ngày giao hàng
                // Nếu Excel có ngày thì parse, nếu không thì mặc định +3 ngày
                $orderShipmentDate = now();
                if (!empty($firstItem['shipmentDate'])) {
                    try {
                        // Chuyển dấu / thành - để Carbon dễ hiểu format d/m/Y hoặc Y-m-d
                        $orderShipmentDate = \Carbon\Carbon::parse(str_replace('/', '-', $firstItem['shipmentDate']));
                    } catch (\Exception $e) {
                        // Nếu ngày sai định dạng thì giữ nguyên mặc định +3 ngày
                    }
                }

                // Sinh mã PO
                $prefix = 'PO' . date('ym');
                $lastOrder = Order::where('DocumentNo', 'like', $prefix . '%')
                    ->orderBy('DocumentNo', 'desc')
                    ->lockForUpdate()
                    ->first();

                $nextNum = 1;
                if ($lastOrder) {
                    $lastSeq = intval(substr($lastOrder->DocumentNo, -4));
                    $nextNum = $lastSeq + 1;
                }
                $newDocumentNo = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

                // A. Tạo Header
                Order::create([
                    'DocumentNo'   => $newDocumentNo,
                    'PostingDate'  => now(),
                    'ShipmentDate' => $orderShipmentDate, // 👉 Sử dụng ngày đã xử lý
                    'Industry'     => $industryId,
                    'IntendedUse'  => $orderIntendedUse,
                    'Supplier'     => $supplierName,
                    'Status'       => 1,
                    'Note'         => $orderNote,
                    'CreatedBy'    => $user->code,
                    'CreatedDate'  => now(),
                ]);

                // B. Tạo Items
                $manualItemIndex = 1;

                foreach ($items as $i => $item) {
                    $cleanCode = $item['code'];
                    $variant   = $item['color'];

                    if ($allowManualItems && str_starts_with($cleanCode, '18') && strlen($cleanCode) > 10) {
                        $cleanCode = '180000' . str_pad($manualItemIndex, 4, '0', STR_PAD_LEFT);
                        $manualItemIndex++;
                        if (empty($variant)) $variant = '000';
                    }

                    $prod = Product::where('code', $cleanCode)->first();

                    if ($prod) {
                        $itemName = $prod->name;
                        $price    = $prod->price;
                        $unit     = $prod->unit;
                        $variant  = $item['color'] ?: $prod->color;
                    } else {
                        if (!$allowManualItems) {
                            DB::connection('sqlsrv')->rollBack();
                            return response()->json(['message' => "Lỗi dòng {$item['line_index']}: Mã '{$cleanCode}' không tồn tại."], 422);
                        }
                        if (empty($item['name']) || empty($item['price'])) {
                            DB::connection('sqlsrv')->rollBack();
                            return response()->json(['message' => "Lỗi dòng {$item['line_index']}: Thiếu Tên hoặc Giá cho hàng nhập tay."], 422);
                        }
                        $itemName = $item['name'];
                        $price    = $item['price'];
                        $unit     = 'CAI';
                    }

                    // Insert Original
                    \App\Models\OrderOriginal::create([
                        'DocumentNo'  => $newDocumentNo,
                        'PostingDate' => now(),
                        'IntendedUse' => $orderIntendedUse,
                        'Supplier'    => $supplierName,
                        'ItemCode'    => $cleanCode,
                        'Variant'     => $variant,
                        'ItemName'    => $itemName,
                        'Unit'        => $unit,
                        'Quantity'    => $item['quantity'],
                        'Price'       => $price,
                        'Status'      => 1,
                        'Note'        => $orderNote,
                        'CreatedBy'   => $user->code,
                        'CreatedDate' => now(),
                    ]);

                    // Insert Line
                    \App\Models\OrderItem::create([
                        'DocumentNo'  => $newDocumentNo,
                        'Line'        => ($i + 1),
                        'PostingDate' => now(),
                        'ItemCode'    => $cleanCode,
                        'Variant'     => $variant,
                        'ItemName'    => $itemName,
                        'Unit'        => $unit,
                        'Quantity'    => $item['quantity'],
                        'QuantityOld' => $item['quantity'],
                        'Price'       => $price,
                        'Status'      => 1,
                        'CreatedBy'   => $user->code,
                        'CreatedDate' => now(),
                    ]);
                }
                $createdOrders[] = $newDocumentNo;
            }

            DB::connection('sqlsrv')->commit();
            return response()->json([
                'message' => 'Import thành công ' . count($createdOrders) . ' đơn hàng.',
                'orders'  => $createdOrders
            ]);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi import: ' . $e->getMessage()], 500);
        }
    }
    public function sendReminders(Request $request)
    {
        $todayKey = 'mail_reminders_sent_' . Carbon::now()->format('Y-m-d');
        if ($request->input('force') === true) {
            Cache::forget($todayKey);
            $message = 'Đã ép buộc gửi mail (Xóa cache cũ).';
        } else {
            $message = 'Đã kích hoạt kiểm tra nhắc nhở (Chế độ tự động).';
        }
        Artisan::call('mail:remind-pending');
        $output = Artisan::output();
        return response()->json([
            'message' => $message,
            'output' => $output
        ], 200);
    }
    public function unMerge($id)
    {
        $user = JWTAuth::user();

        DB::connection('sqlsrv')->beginTransaction();
        try {
            // 1. Tìm đơn Gộp
            $mergeOrder = MergeOrder::where('DocumentNo', $id)->first();
            if (!$mergeOrder) {
                return response()->json(['message' => 'Không tìm thấy đơn gộp có mã: ' . $id], 404);
            }
            if ($mergeOrder->Status != 8) {
                return response()->json(['message' => 'Không thể hủy đơn đã xử lý (Khác trạng thái GỘP).'], 422);
            }

            // 2. Lấy danh sách các dòng đơn con đang liên kết
            $childItems = OrderItem::where('MergeHeaderID', $id)->get();

            // Lấy danh sách mã đơn PO cha (unique)
            $poDocumentNos = $childItems->pluck('DocumentNo')->unique()->toArray();

            // 3. Reset các dòng đơn con (OrderItems)
            OrderItem::where('MergeHeaderID', $id)
                ->update([
                    'MergeHeaderID' => null, // Gỡ liên kết
                    'Status'        => 7,    // Quay về trạng thái Chốt
                    'ModifiedBy'    => $user->code,
                    'ModifiedDate'  => now()
                ]);

            // 4. Reset các đơn PO cha (Orders)
            if (!empty($poDocumentNos)) {
                Order::whereIn('DocumentNo', $poDocumentNos)
                    ->update([
                        'Status'       => 7, // Quay về trạng thái Chốt
                        'ModifiedBy'   => $user->code,
                        'ModifiedDate' => now()
                    ]);
            }

            // 5. Xóa dữ liệu bảng Merge
            MergeOrderItem::where('DocumentNo', $id)->delete(); // Xóa Line
            $mergeOrder->delete();                              // Xóa Header

            DB::connection('sqlsrv')->commit();

            return response()->json(['message' => 'Đã hủy đơn gộp và trả lại trạng thái cho các đơn PO.'], 200);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi hủy đơn: ' . $e->getMessage()], 500);
        }
    }
   
    public function history(Request $request)
    {
        try {
            $user = JWTAuth::user();
            $limit = $request->get('limit', 6);
            $type = $request->get('type', 'PO'); 

        
            if ($type === 'PO') {
                $query = Order::with(['statusInfo', 'items.mergeOrder.statusInfo','user']) 
                    ->orderBy('CreatedDate', 'desc');

                // Filter tìm kiếm
                if ($request->has('q')) {
                    $q = $request->q;
                    $query->where('DocumentNo', 'like', "%{$q}%");
                }
                
                // Filter trạng thái
                if ($request->has('status')) {
                    $query->where('Status', $request->status);
                }

                $orders = $query->paginate($limit);

                // Transform dữ liệu
                $data = $orders->getCollection()->map(function ($order) {
                    $linkedMergeOrder = null;
                    $realStatusName = $order->statusInfo->Name ?? 'Unknown';
                    $realDeliveryDate = $order->ShipmentDate;
                    
                    // Logic tìm đơn gộp cha (MP)
                    $firstItem = $order->items->first();
                    if ($firstItem && $firstItem->mergeOrder) {
                        $linkedMergeOrder = $firstItem->mergeOrder;
                        
                        // Nếu PO đang là trạng thái GỘP (8), hiển thị thông tin theo đơn cha
                        if ($order->Status == 8) {
                            $realStatusName = "Gộp: " . ($linkedMergeOrder->statusInfo->Name ?? 'Đang xử lý');
                            $realDeliveryDate = $linkedMergeOrder->ShipmentDate; 
                        }
                    }

                    // --- LOGIC MAPPING TRACKING STEP CHO PO ---
                    $statusId = (int)$order->Status;
                    $trackingStep = 1;
                    // Nhóm Mới
                    if (in_array($statusId, [1])) { 
                        $trackingStep = 1; 
                    } 
                    // Nhóm Chốt (Chờ Supply xử lý/Gộp)
                    elseif (in_array($statusId, [7, 10])) { 
                        $trackingStep = 2; 
                    } 
                    // Nhóm Đã Gộp (8) -> Check tiến độ của MP cha
                    elseif ($statusId == 8) {
                        $trackingStep = 3; 
                        if ($linkedMergeOrder) {
                            $mpStatus = (int)$linkedMergeOrder->Status;
                            if ($mpStatus == 4) $trackingStep = 4; // MP đang đặt hàng
                            if ($mpStatus == 11) $trackingStep = 5; // MP hoàn thành
                            if ($mpStatus == 5) $trackingStep = -1; // MP đã hủy/
                            if ($mpStatus == 2) $trackingStep = 2;
                            if ($mpStatus == 8) $trackingStep = 2;
                        }
                    } 
                    // Nhóm Đang đặt hàng (Đi lẻ, không qua gộp)
                    elseif ($statusId == 4) { 
                        $trackingStep = 4; 
                    } 
                    // Nhóm Hoàn thành
                    elseif ($statusId == 11) { 
                        $trackingStep = 5; 
                    } 
                    // Các trạng thái đang duyệt (2, 3) -> Coi như đang ở bước 2
                    else { 
                        $trackingStep = 2; 
                    }

                    return [
                        'type'              => 'PO',
                        'id'                => $order->DocumentNo,
                        'created_at'        => $order->CreatedDate,
                        'delivery_date'     => $realDeliveryDate,
                        'supplier_name'     => $order->Supplier,
                        'total_amount'      => $order->items->sum(fn($i) => $i->Quantity * $i->Price),
                        'item_count'        => $order->items->count(),
                        'created_name'        => $order->user->name,
                        
                        'status_code'       => $statusId,
                        'status_name'       => $realStatusName,
                        'tracking_step'     => $trackingStep, 
                        'merged_id'         => $linkedMergeOrder ? $linkedMergeOrder->DocumentNo : null,
                    ];
                });

                $orders->setCollection($data);
                return response()->json($orders);
            }

            // 2. LOGIC LẤY DANH SÁCH MP (Merge Orders)
           
            else if ($type === 'MP') {
                $query = MergeOrder::with(['statusInfo', 'items','originalOrderItems.order'])
                    ->orderBy('CreatedDate', 'desc');

                if ($request->has('q')) {
                    $query->where('DocumentNo', 'like', "%{$request->q}%");
                }

                $mps = $query->paginate($limit);

                $data = $mps->getCollection()->map(function ($mp) {
                    // --- LOGIC MAPPING TRACKING STEP CHO MP ---
                    $statusId = (int)$mp->Status;
                    $trackingStep = 1;

                    if (in_array($statusId, [5])) {
                        $trackingStep = -1; // Hủy/Trả về
                    } elseif ($statusId == 8) {
                        $trackingStep = 2;  // Nháp (Draft)
                    } elseif ($statusId == 2) {
                        $trackingStep = 2;  // Chờ duyệt
                    } elseif ($statusId == 3) {
                        $trackingStep = 3;  // Đã duyệt
                    } elseif ($statusId == 4) {
                        $trackingStep = 4;  // Đang đặt hàng
                    } elseif ($statusId == 11) {
                        $trackingStep = 5;  // Hoàn thành
                    } else {
                        $trackingStep = 2;
                    }

                    return [
                        'type'              => 'MP',
                        'id'                => $mp->DocumentNo,
                        'created_at'        => $mp->CreatedDate,
                        'delivery_date'     => $mp->ShipmentDate,
                        'supplier_name'     => $mp->originalOrderItems->first()->order->Supplier,
                        'total_amount'      => $mp->items->sum(fn($i) => $i->Quantity * $i->Price),
                        'item_count'        => $mp->items->count(),
                        'item_summary'      => $mp->items->first() ? $mp->items->first()->ItemName . '...' : '',
                        'created_name'        => $mp->originalOrderItems->first()->order->user->name,
                        
                        
                        'status_code'       => $statusId,
                        'status_name'       => $mp->statusInfo->Name ?? 'Unknown',
                        'tracking_step'     => $trackingStep,
                        'merged_id'         => null
                    ];
                });

                $mps->setCollection($data);
                return response()->json($mps);
            }

        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi tải lịch sử đơn hàng', 'error' => $e->getMessage()], 500);
        }
    }
}
