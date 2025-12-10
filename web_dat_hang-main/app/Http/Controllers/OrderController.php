<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\Product;
use App\Models\OrderItem;
use App\Models\OrderStatus;
use App\Models\User;
use App\Models\Category;
use App\Models\OrderOriginal;
use App\Models\MergeOrder;
use App\Models\MergeOrderItem;


use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use App\Models\Notification;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\Log; // <--- Thêm dòng này



class OrderController extends Controller
{
    use AuthorizesRequests;
    public function __construct()
    {
        $this->middleware('auth:api'); // Middleware bảo vệ bằng JWT
    }

    // POST /api/orders
    public function store(Request $request)
    {
        $user = JWTAuth::user();
        $this->authorize('create', Order::class);
        // 1. Validate
        $validated = $request->validate([
            'industry_id'   => 'required', // Bắt buộc có ngành hàng
            'supplier_name' => 'required|string',
            'intended_use'  => 'required|string',
            'orderDate'     => 'required|date',
            'estimated_delivery' => 'required|date',
            'items'         => 'required|array|min:1',
            'items.*.productCode' => 'required',
            'items.*.productName' => 'nullable|string', // ✅ Chấp nhận tên từ FE
            'items.*.price'       => 'nullable|numeric', // ✅ Chấp nhận giá từ FE
            'items.*.quantity'    => 'required|numeric|min:1',
        ]);

        DB::connection('sqlsrv')->beginTransaction();

        try {
            // 2. Sinh mã đơn hàng (PO + YYMM + Sequence)
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

            // 3. Insert Bảng 1: Header
            Order::create([
                'DocumentNo'   => $newDocumentNo,
                'PostingDate'  => $request->orderDate,
                'ShipmentDate' => $request->estimated_delivery,
                'Industry'     => $request->industry_id,
                'IntendedUse'  => $request->intended_use,
                'Supplier'     => $request->supplier_name,
                'Status'       => 1, // Mới
                'Note'         => $request->notes ?? '',
                'CreatedBy'    => $user->code,
                'CreatedDate'  => now(),
            ]);

            // 4. Xử lý Items
            foreach ($request->items as $index => $itemData) {
                $quantity = (float)$itemData['quantity'];
                $cleanCode = $itemData['productCode'];

                // ✅ Logic Variant: Ưu tiên FE, nếu không có và là ngành 18 thì set '000'
                $isIndustry18 = ($request->industry_id == 18);
                $variant = $itemData['variant'] ?? $itemData['color'] ?? ($isIndustry18 ? '000' : '');

                // Query lại Product
                $prod = Product::where('code', $cleanCode)->first();

                if ($prod) {
                    // --- A. CÓ TRONG DB ---
                    $itemName = $prod->name;
                    $price    = $prod->price;
                    $unit     = $prod->unit;
                    // Nếu variant vẫn rỗng thì lấy màu mặc định của SP
                    if (empty($variant)) $variant = $prod->color;
                } else {
                    // --- B. NHẬP TAY (Ngành 18 hoặc SP ngoài) ---
                    $itemName = $itemData['productName'];
                    $price    = isset($itemData['price']) ? (float)$itemData['price'] : 0;
                    $unit     = 'CAI'; // Mặc định đơn vị tính
                }

                // Insert Bảng 2: Original (Lưu vết)
                \App\Models\OrderOriginal::create([
                    'DocumentNo'  => $newDocumentNo,
                    'PostingDate' => $request->orderDate,
                    'IntendedUse' => $request->intended_use,
                    'Supplier'    => $request->supplier_name,
                    'ItemCode'    => $cleanCode,
                    'Variant'     => $variant,
                    'ItemName'    => $itemName,
                    'Unit'        => $unit,
                    'Quantity'    => $quantity,
                    'Price'       => $price,
                    'Status'      => 1,
                    'Note'        => $request->notes,
                    'CreatedBy'   => $user->code,
                    'CreatedDate' => now(),
                ]);

                // Insert Bảng 3: Line (Chi tiết)
                OrderItem::create([
                    'DocumentNo'  => $newDocumentNo,
                    'Line'        => ($index + 1),
                    'PostingDate' => $request->orderDate,
                    'ItemCode'    => $cleanCode,
                    'Variant'     => $variant,
                    'ItemName'    => $itemName,
                    'Unit'        => $unit,
                    'Quantity'    => $quantity,
                    'QuantityOld' => $quantity,
                    'Price'       => $price,
                    'Status'      => 1,
                    'CreatedBy'   => $user->code,
                    'CreatedDate' => now(),
                ]);
            }

            DB::connection('sqlsrv')->commit();

            // 5. Load lại dữ liệu trả về
            $fullOrder = Order::with(['items', 'user', 'statusInfo'])
                ->where('DocumentNo', $newDocumentNo)
                ->first();

            $subtotal = $fullOrder->items->sum(fn($item) => $item->Quantity * $item->Price);

            // Map dữ liệu (Giữ nguyên đoạn map của bạn)
            $formattedOrder = [
                'id' => $fullOrder->DocumentNo,
                'order_number' => $fullOrder->DocumentNo,
                'supplier_name' => $fullOrder->Supplier,
                'intended_use' => $fullOrder->IntendedUse,
                'status' => (int)$fullOrder->Status,
                'status_name' => $fullOrder->statusInfo->Name ?? 'Mới',
                'industry_id' => $fullOrder->Industry,
                'payment_status' => 'pending',
                'order_date' => $fullOrder->PostingDate,
                'estimated_delivery' => $fullOrder->ShipmentDate,
                'notes' => $fullOrder->Note,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
                'items_count' => $fullOrder->items->count(),
                'items' => $fullOrder->items->map(function ($item) {
                    $uniqueProductId = $item->ItemCode . ($item->Variant ? '-' . $item->Variant : '');
                    return [
                        'id' => $item->ID ?? $item->Line,
                        'product_code' => $item->ItemCode,
                        'product_name' => $item->ItemName,
                        'quantity' => (float)$item->Quantity,
                        'price' => (float)$item->Price,
                        'total' => (float)($item->Quantity * $item->Price),
                        'product' => [
                            'id' => $uniqueProductId,
                            'code' => $item->ItemCode,
                            'name' => $item->ItemName,
                            'price' => (float)$item->Price,
                            'color' => $item->Variant,
                            'categoryId' => 10,
                        ]
                    ];
                }),
                'created_by' => $fullOrder->user->name ?? $fullOrder->CreatedBy,
            ];

            return response()->json([
                'message' => 'Tạo đơn hàng thành công',
                'order' => $formattedOrder,
            ], 201);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json([
                'message' => 'Lỗi tạo đơn hàng: ' . $e->getMessage()
            ], 500);
        }
    }


    // PUT/PATCH /api/orders/{id}
    public function update(Request $request, $id)
    {
        $user = JWTAuth::user();
        // Load Order và Status hiện tại
        $order = Order::with('statusInfo')->where('DocumentNo', $id)->first();
        $this->authorize('update', $order);

        if (!$order) {
            return response()->json(['message' => 'Không tìm thấy đơn hàng'], 404);
        }

        // 1. XÁC ĐỊNH TYPE HIỆN TẠI VÀ TYPE ĐÍCH
        // Trong DB, cột Status lưu 'Type' (ví dụ: 1, 7, 8...)
        $currentType = (int)$order->Status;
        $inputStatusType = (int)$request->input('status');
        $targetStatusObj = OrderStatus::where('Type', $inputStatusType)->first();

        if (!$targetStatusObj) {
            return response()->json(['message' => "Trạng thái đích (Type: $inputStatusType) không tồn tại trong hệ thống"], 422);
        }
        $targetType = $inputStatusType;
        if ($targetType === $currentType) {
            // Ngoại lệ: Cho phép Sales/IT lưu lại đơn Mới (1) để cập nhật nội dung
            $isSalesSavingDraft = ($user->isRole('Sales') || $user->isInDepartment('IT'))
                && $currentType === OrderStatus::TYPE_MOI;
            if (!$isSalesSavingDraft) {
                return response()->json(['message' => 'Bạn chưa cập nhật trạng thái đơn hàng.'], 422);
            }
        }

        // 3. CHECK QUYỀN CHUYỂN TRẠNG THÁI
        if ($targetType !== $currentType) {
            $canChange = false;

            // --- QUYỀN: ADMIN ---
            if ($user->isRole('Administrator')) {
                $canChange = true;
            }

            // --- QUYỀN: KINH DOANH (SALES) / IT ---
            elseif ($user->isRole('Sales') || $user->isInDepartment('IT')) {
                if (in_array($currentType, [OrderStatus::TYPE_MOI, OrderStatus::TYPE_DIEU_CHINH])) {
                    if ($targetType === OrderStatus::TYPE_MOI) $canChange = true;
                }
            }

            // --- QUYỀN: CUNG ỨNG (SUPPLY) ---
            elseif ($user->isRole('Supply')) {
                // Flow 1: Mới -> Chốt (7) / Điều chỉnh (10) / Hủy (5)
                if ($currentType === OrderStatus::TYPE_MOI) {
                    if (in_array($targetType, [OrderStatus::TYPE_CHOT, OrderStatus::TYPE_DIEU_CHINH, OrderStatus::TYPE_HUY])) $canChange = true;
                }
                // Flow 2: Chốt -> Gộp (8) / Gửi duyệt (2) / Trả về (10)
                elseif ($currentType === OrderStatus::TYPE_CHOT) {
                    if (in_array($targetType, [OrderStatus::TYPE_MERGE])) $canChange = true;
                }
                // Flow 3: Gộp/Nháp -> Gửi duyệt / Điều chỉnh
                elseif ($currentType === OrderStatus::TYPE_MERGE) {
                    if (in_array($targetType, [OrderStatus::TYPE_CHO_DUYET])) $canChange = true;
                }
                // Flow 4: Đã duyệt -> Đặt hàng
                elseif ($currentType === OrderStatus::TYPE_DA_DUYET) {
                    if ($targetType === OrderStatus::TYPE_DANG_DAT_HANG) $canChange = true;
                }
                // Flow 5: Đang đặt -> Hoàn thành
                elseif ($currentType === OrderStatus::TYPE_DANG_DAT_HANG) {
                    if ($targetType === OrderStatus::TYPE_HOAN_THANH) $canChange = true;
                }
            }

            // --- QUYỀN: GIÁM ĐỐC (CEO) ---
            elseif ($user->isRole('Manage') || $user->isRole('Leader')) {
                if ($currentType === OrderStatus::TYPE_CHO_DUYET) {
                    if (in_array($targetType, [OrderStatus::TYPE_DA_DUYET, OrderStatus::TYPE_HUY])) $canChange = true;
                }
            }

            if (!$canChange) {
                return response()->json([
                    'message' => "Bạn không có quyền chuyển trạng thái từ [Type $currentType] sang [Type $targetType]."
                ], 403);
            }
        }
        if (in_array($targetType, [OrderStatus::TYPE_DIEU_CHINH, OrderStatus::TYPE_HUY]) && empty($request->notes)) {
            return response()->json(['message' => 'Bắt buộc nhập lý do vào ô Ghi chú.'], 422);
        }

        // 5. THỰC HIỆN UPDATE (TRANSACTION)
        DB::connection('sqlsrv')->beginTransaction();
        try {
            // A. Update Header (Lưu Type vào DB)
            $order->update([
                'PostingDate'  => $request->orderDate,
                'ShipmentDate' => $request->estimated_delivery,
                'Supplier'     => $request->supplier_name,
                'IntendedUse'  => $request->intended_use,
                'Status'       => $targetType, // ✅ Lưu Type
                'Note'         => $request->notes ?? '',
            ]);

            // B. Update Items (Chỉ thực hiện nếu không phải là Hủy đơn)
            if ($targetType !== OrderStatus::TYPE_HUY) {

                // Logic check quyền sửa items (như cũ)
                $allowEditItems = false;
                if ($user->isRole('Administrator')) $allowEditItems = true;
                elseif ($user->isRole('Sales')) {
                    if (in_array($currentType, [OrderStatus::TYPE_MOI, OrderStatus::TYPE_DIEU_CHINH])) $allowEditItems = true;
                } elseif ($user->isRole('Supply')) {
                    if (in_array($currentType, [OrderStatus::TYPE_MOI, OrderStatus::TYPE_CHOT, OrderStatus::TYPE_MERGE, OrderStatus::TYPE_DIEU_CHINH])) $allowEditItems = true;
                }

                if ($allowEditItems) {
                    OrderItem::where('DocumentNo', $id)->delete();

                    foreach ($request->items as $index => $itemData) {
                        $cleanCode = $itemData['productCode'];
                        $quantity  = (float)$itemData['quantity'];

                        // ✅ Logic Variant Update: Dựa vào Industry của Order gốc
                        $isIndustry18 = ($order->Industry == 18);
                        $variant = $itemData['variant'] ?? $itemData['color'] ?? ($isIndustry18 ? '000' : '');

                        $prod = \App\Models\Product::where('code', $cleanCode)->first();

                        if ($prod) {
                            // A. Có trong DB
                            $itemName = $prod->name;
                            $price    = $prod->price;
                            $unit     = $prod->unit;
                            if (empty($variant)) $variant = $prod->color;
                        } else {
                            // B. Nhập tay
                            $itemName = $itemData['productName'];
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
                            'QuantityOld' => $quantity,
                            'Price'       => $price,
                            'Status'      => $targetType,
                            'CreatedBy'   => $user->code,
                            'CreatedDate' => now(),
                        ]);
                    }
                }
            }

            DB::connection('sqlsrv')->commit();

            // Gọi lại hàm show để trả về dữ liệu chuẩn
            return $this->show($id);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi cập nhật: ' . $e->getMessage()], 500);
        }
    }

    // GET /api/order-statuses
    // app/Http/Controllers/OrderController.php
    public function getStatuses()
    {
        return OrderStatus::purchasing()
            ->select('ID', 'Name', 'Type') // <--- BẮT BUỘC PHẢI CÓ 'Type'
            ->orderBy('ID')
            ->get();
    }

    public function index(Request $request)
    {
        try {
            $user = JWTAuth::user();
            $this->authorize('viewAny', Order::class);

            // 1. Khởi tạo Query & Eager Load
            // Load sẵn 'items' để tính tổng tiền và 'user' để lấy tên người tạo
            $query = Order::with(['items', 'user', 'statusInfo'])
                ->orderBy('CreatedDate', 'desc'); // Đơn mới nhất lên đầu

            $group = $request->get('group');

            // Nhóm 'all_orders' (Đơn PO)
            if ($group === 'all_orders') {
                if ($user->isRole('Sales')) {
                    $query->where('CreatedBy', $user->code);
                }

                // 2. Nếu là CUNG ỨNG / HÀNH CHÍNH: Lọc theo danh sách Industry được cấp phép
                elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
                    // Lấy ra mảng các mã Industry mà user này được phép. 
                    // Ví dụ: ['GIAY', 'MAYMAC']
                    $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();

                    // Query: SELECT * FROM Orders WHERE Industry IN ('GIAY', 'MAYMAC')
                    $query->whereIn('Industry', $allowedIndustries);
                }

                // 3. Nếu là SẾP (Giam doc): Không where gì cả (thấy hết)
                elseif ($user->isRole('Leader')) {
                    // No filter
                }
                // Có thể lọc thêm theo Role ở đây nếu muốn bảo mật phía server
                // VD: Nếu là Sales chỉ lấy đơn status 1, 10
                $query->whereIn('Status', [1, 10, 7]);
            }

            // Nhóm 'cancelled'
            if ($group === 'cancelled') {
                $query->where('Status', 5); // Status Hủy
            }

            // 3. Tìm kiếm (Optional)
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where(function ($q) use ($search) {
                    $q->where('DocumentNo', 'like', "%{$search}%")
                        ->orWhere('Supplier', 'like', "%{$search}%");
                });
            }

            // 4. Lọc trạng thái (Optional)
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('Status', $request->status);
            }

            // 5. Phân trang
            $limit = $request->get('limit', 3);
            $orders = $query->paginate($limit);

            // 6. Format dữ liệu trả về (Transform)
            // Bước này cực kỳ quan trọng để Frontend dễ hiển thị
            $data = $orders->getCollection()->map(function ($order) {
                // Tính tổng tiền từ danh sách items
                $totalAmount = $order->items->sum(function ($item) {
                    return $item->Quantity * $item->Price;
                });

                return [
                    'id' => $order->DocumentNo,              // ID dùng cho key React
                    'order_number' => $order->DocumentNo,    // Mã đơn hiển thị
                    'supplier_name' => $order->Supplier,
                    'intended_use' => $order->IntendedUse,
                    'customer_name' => $order->user->name ?? $order->CreatedBy,
                    'created_at' => $order->CreatedDate,     // Ngày tạo
                    'status' => (int)$order->Status,         // 0: Nháp, 1: Chờ duyệt...
                    'status_name' => $order->statusInfo->Name ?? 'Không xác định',
                    'total_amount' => $totalAmount,          // Tổng tiền đã tính toán
                    'items_count' => $order->items->count(), // Số lượng mặt hàng

                    // Trả về luôn danh sách items để xem chi tiết nhanh (nếu cần)
                    'items' => $order->items->map(function ($item) {
                        return [
                            'id' => $item->ID,
                            'product_code' => $item->ItemCode,
                            'product_name' => $item->ItemName,
                            'quantity' => (float)$item->Quantity,
                            'price' => (float)$item->Price,
                            'total' => (float)($item->Quantity * $item->Price),
                        ];
                    })
                ];
            });

            // Gán lại data đã format vào object phân trang
            $orders->setCollection($data);

            return response()->json($orders);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi tải danh sách đơn hàng',
                'error' => $e->getMessage()
            ], 500);
        }
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
            // 1. Tìm đơn hàng theo DocumentNo (vì khóa chính của bạn là string)
            // Eager load 'items' và 'user' để tối ưu query
            $order = Order::with(['user', 'statusInfo', 'items.product'])
                ->where('DocumentNo', $id)
                ->firstOrFail();

            // 2. Tính toán các giá trị tiền (Do DB không lưu sẵn tổng)
            $subtotal = $order->items->sum(function ($item) {
                return $item->Quantity * $item->Price;
            });

            // Giả định thuế và ship = 0 nếu chưa có cột trong DB


            $totalAmount = $subtotal;

            // 3. Format dữ liệu chuẩn JSON để trả về Frontend
            // Cấu trúc này khớp với những gì hàm handleEditOrder bên React đang mong đợi
            $formattedOrder = [
                'id' => $order->ID,
                'order_number' => $order->DocumentNo,
                'supplier_name' => $order->Supplier,
                'intended_use' => $order->IntendedUse,
                'status' => (int)$order->Status,
                'status_name' =>  $order->statusInfo->Name,
                // Các trường này chưa có trong DB API$Purchase Header, 
                // ta gán giá trị mặc định để Frontend không bị lỗi
                'shipping_address' => '',

                'order_date' => $order->PostingDate, // Hoặc CreatedDate
                'estimated_delivery' => $order->ShipmentDate,
                'notes' => $order->Note,

                // Các con số tài chính
                'subtotal' => $subtotal,
                'tax' => 0,
                'shipping' => 0,
                'total_amount' => $subtotal,
                'industry_id' => $order->Industry,
                // Danh sách sản phẩm chi tiết
                'items' => $order->items->map(function ($item) use ($order) {
                    $uniqueProductId = $item->ItemCode . ($item->Variant ? '-' . $item->Variant : '');
                    // 👇 LẤY CATEGORY ID TỪ PRODUCT (An toàn)
                    $catId = $item->product ? $item->product->category_id : null;
                    // Nếu không có trong product, thử lấy từ Industry của Header làm fallback
                    if (!$catId) $catId = $order->Industry;
                    return [
                        'id' => $item->ID, // Dùng ID hoặc Line làm key
                        'product_code' => $item->ItemCode,
                        'product_name' => $item->ItemName,
                        'quantity' => (float)$item->Quantity,
                        'unit_price' => (float)$item->Price,
                        'unit' => $item->Unit,
                        'total' => (float)($item->Quantity * $item->Price),

                        // Object 'product' lồng nhau để phục vụ form sửa trên React
                        'product' => [
                            'id'    => $uniqueProductId, // 👈 QUAN TRỌNG NHẤT: Phải có ID này
                            'code' => $item->ItemCode,
                            'name' => $item->ItemName,
                            'price' => (float)$item->Price,
                            'unit' => $item->Unit,
                            'color' => $item->Variant,   // 👈 Nên thêm color để hiển thị rõ
                            // 👇 QUAN TRỌNG: Phải trả về categoryId ở đây
                            'categoryId' => $catId,
                        ]
                    ];
                }),

                // Thông tin người tạo (nếu cần hiển thị)
                'created_by' => $order->user->name ?? $order->CreatedBy,
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
    // Thêm vào OrderController.php
    // app/Http/Controllers/OrderController.php

    public function stats(Request $request)
    {
        $user = JWTAuth::user();

        // ✅ CÁCH CHUẨN: Lấy tên bảng động từ Model
        // Dù bạn có đổi tên bảng trong Order.php thành gì thì dòng này vẫn đúng.
        $tbl = (new Order)->getTable();

        $query = Order::query();

        // =================================================================
        // BƯỚC 1: LỌC PHẠM VI (SCOPE)
        // =================================================================

        // CASE A: SALES / KINH DOANH
        if ($user->isRole('Sales') || $user->isInDepartment('Kinh doanh')) {
            // SQL sẽ hiểu: WHERE [API$Purchase Header].[CreatedBy] = ...
            $query->where("$tbl.CreatedBy", $user->code);
        }

        // CASE B: CUNG ỨNG / HÀNH CHÍNH
        elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính')) {
            $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
            $query->whereIn("$tbl.Industry", $allowedIndustries);
        }

        // CASE C: LEADER / GIÁM ĐỐC (Xem hết)
        elseif ($user->isRole('Leader') || $user->isRole('giam_doc')) {
            // No filter
        }

        // CASE D: Khác
        else {
            $query->where("$tbl.CreatedBy", $user->code);
        }

        // =================================================================
        // BƯỚC 2: ĐẾM THEO TRẠNG THÁI
        // =================================================================

        $total = (clone $query)->count();
        $pending = 0;
        $processing = 0;

        // 1. SALES
        if ($user->isRole('Sales') || $user->isInDepartment('Kinh doanh')) {
            $pending    = (clone $query)->whereIn("$tbl.Status", [1])->count();
            $processing = (clone $query)->whereIn("$tbl.Status", [10])->count();
        }

        // 2. CUNG ỨNG / HÀNH CHÍNH
        elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính')) {
            $pending    = (clone $query)->whereIn("$tbl.Status", [1, 3])->count();
            $processing = (clone $query)->whereIn("$tbl.Status", [2, 4, 8])->count();
        }

        // 3. LEADER / GIÁM ĐỐC
        elseif ($user->isRole('Leader') || $user->isRole('giam_doc')) {
            $pending    = (clone $query)->where("$tbl.Status", 2)->count();
            $processing = (clone $query)->whereIn("$tbl.Status", [3, 4, 11])->count();
        }

        // =================================================================
        // BƯỚC 3: TÍNH DOANH THU
        // =================================================================

        // Đoạn này buộc phải JOIN để lấy Price/Quantity từ bảng Line
        // SQL Server rất khó tính, khi JOIN bắt buộc phải chỉ rõ cột nào thuộc bảng nào

        $revenue = (clone $query)
            ->join('API$Purchase Line as lines', "$tbl.DocumentNo", '=', 'lines.DocumentNo')
            ->sum(DB::raw('lines.Quantity * lines.Price'));

        return response()->json([
            'total_orders'      => $total,
            'pending_orders'    => $pending,
            'processing_orders' => $processing,
            'total_revenue'     => $revenue
        ]);
    }

    public function merge(Request $request)
    {
        $user = JWTAuth::user();
        $orderIds = $request->input('order_ids', []);

        if (empty($orderIds)) {
            return response()->json(['message' => 'Chưa chọn đơn hàng nào'], 422);
        }

        // 1. SỬA LẠI: Query theo TYPE_CHOT (7), không phải ID
        $orders = Order::with('items')
            ->whereIn('DocumentNo', $orderIds)
            ->where('Status', OrderStatus::TYPE_CHOT) // ✅ Đã sửa: Tìm Status = 7
            ->get();

        if ($orders->count() === 0) {
            return response()->json(['message' => 'Không có đơn hàng hợp lệ (Phải là status Chốt).'], 422);
        }
        
        if ($orders->pluck('Supplier')->unique()->count() > 1) {
            return response()->json([
                'message' => 'Các đơn hàng được chọn KHÔNG cùng Nhà Cung Cấp. Vui lòng kiểm tra lại.'
            ], 422);
        }
        if ($orders->pluck('Industry')->unique()->count() > 1) {
             return response()->json([
                'message' => 'Các đơn hàng được chọn KHÔNG cùng Ngành hàng.'
            ], 422);
        }
        // 2. Gom nhóm (Giữ nguyên logic)
        $mergedItems = [];
        $allSourceIds = [];

        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $key = $item->ItemCode . '_' . ($item->Variant ?? '');

                if (!isset($mergedItems[$key])) {
                    $mergedItems[$key] = [
                        'ItemCode' => $item->ItemCode,
                        'Variant'  => $item->Variant,
                        'ItemName' => $item->ItemName,
                        'Unit'     => $item->Unit,
                        'Price'    => $item->Price,
                        'Quantity' => 0,
                        'IDs'      => []
                    ];
                }
                $mergedItems[$key]['Quantity'] += $item->Quantity;

                if ($item->ID) {
                    $mergedItems[$key]['IDs'][] = $item->ID;
                    $allSourceIds[] = $item->ID;
                }
            }
        }

        DB::connection('sqlsrv')->beginTransaction();
        try {
            // 3. Tạo Header Merge
            $prefix = 'MP' . date('ym');
            $lastMerge = MergeOrder::where('DocumentNo', 'like', $prefix . '%')
                ->orderBy('DocumentNo', 'desc')
                ->lockForUpdate()
                ->first();
            $nextNum = $lastMerge ? intval(substr($lastMerge->DocumentNo, -4)) + 1 : 1;
            $newDocumentNo = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

            MergeOrder::create([
                'DocumentNo'   => $newDocumentNo,
                'PostingDate'  => now(),
                'ShipmentDate' => now()->addDays(3),
                'Industry'     => $orders->first()->Industry,

                // ✅ SỬA LẠI: Dùng hằng số TYPE_MERGE (8) cho nhất quán
                'Status'       => OrderStatus::TYPE_MERGE,

                'Note'         => "Gộp từ: " . implode(', ', $orderIds),
                'CreatedBy'    => $user->code,
                'CreatedDate'  => now(),
            ]);

            // 4. Tạo Line Merge
            $lineNum = 1;
            foreach ($mergedItems as $mItem) {
                $sourceIdsStr = implode('-', $mItem['IDs']);

                MergeOrderItem::create([
                    'DocumentNo'     => $newDocumentNo,
                    'Line'           => $lineNum,
                    'PostingDate'    => now(),
                    'ItemCode'       => $mItem['ItemCode'],
                    'Variant'        => $mItem['Variant'],
                    'ItemName'       => $mItem['ItemName'],
                    'Unit'           => $mItem['Unit'],
                    'Quantity'       => $mItem['Quantity'],
                    'QuantityOld'    => $mItem['Quantity'],
                    'Price'          => $mItem['Price'],

                    // ✅ SỬA LẠI: Dùng TYPE_MERGE (8)
                    'Status'         => OrderStatus::TYPE_MERGE,

                    'PurchaseLineID' => $sourceIdsStr,
                    'CreatedBy'      => $user->code,
                    'CreatedDate'    => now(),
                ]);
                $lineNum++;
            }

            // 5. Cập nhật Purchase Line (OrderItem)
            if (!empty($allSourceIds)) {
                OrderItem::whereIn('ID', $allSourceIds)->update([
                    'MergeHeaderID' => $newDocumentNo,

                    // ✅ SỬA LẠI: Lưu Status = 8 (Type), KHÔNG phải 14
                    'Status'        => OrderStatus::TYPE_MERGE
                ]);
            }

            // 6. Cập nhật Order gốc (Header)
            // ✅ SỬA LẠI: Lưu Status = 8 (Type), KHÔNG phải 14
            Order::whereIn('DocumentNo', $orderIds)
                ->update(['Status' => OrderStatus::TYPE_MERGE]);

            DB::connection('sqlsrv')->commit();

            return response()->json([
                'message' => 'Gộp đơn thành công',
                'merge_order_id' => $newDocumentNo
            ]);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    // GET /api/orders/ids
    public function getAllIds(Request $request)
    {
        $status = $request->query('status'); // Lấy tham số status từ URL

        // Query chỉ lấy cột DocumentNo (nhẹ và nhanh)
        $query = Order::query();

        if ($status) {
            $query->where('Status', $status);
        }

        // Bạn có thể thêm logic lọc theo User/Phòng ban nếu cần thiết
        // if (!$user->isManager()) { ... }

        // Pluck chỉ lấy ra mảng các giá trị của cột DocumentNo
        // Kết quả: ['PO001', 'PO002', 'PO003', ...]
        $ids = $query->pluck('DocumentNo');

        return response()->json($ids);
    }

    // POST /api/orders/split
    public function split(Request $request)
    {
        $user = JWTAuth::user();

        // Input: Mã đơn gộp hiện tại + Danh sách Line ID muốn tách ra
        $currentMergeId = $request->input('merge_id'); // MP25120001
        $lineIdsToSplit = $request->input('line_ids'); // [ID của dòng Xanh]

        $currentOrder = MergeOrder::where('DocumentNo', $currentMergeId)->firstOrFail();

        // Chỉ được tách khi đang ở trạng thái Nháp (8)
        if ($currentOrder->Status != 8) {
            return response()->json(['message' => 'Chỉ được tách đơn khi đang ở trạng thái Nháp.'], 422);
        }

        DB::connection('sqlsrv')->beginTransaction();
        try {
            // 1. Tạo đơn gộp MỚI (MP25120002) để chứa hàng bị tách
            $prefix = 'MP' . date('ym');
            $lastMerge = MergeOrder::where('DocumentNo', 'like', $prefix . '%')->orderBy('DocumentNo', 'desc')->lockForUpdate()->first();
            $nextNum = $lastMerge ? intval(substr($lastMerge->DocumentNo, -4)) + 1 : 1;
            $newDocumentNo = $prefix . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

            MergeOrder::create([
                'DocumentNo'   => $newDocumentNo,
                'PostingDate'  => now(),
                'ShipmentDate' => $currentOrder->ShipmentDate,
                'Industry'     => $currentOrder->Industry,
                'Status'       => 8, // Vẫn là Nháp
                'Note'         => "Tách ra từ đơn: " . $currentMergeId,
                'CreatedBy'    => $user->code,
                'CreatedDate'  => now(),
            ]);

            // 2. Chuyển các dòng đã chọn sang đơn mới
            // Thay vì xóa, ta update DocumentNo của nó sang đơn mới
            MergeOrderItem::whereIn('ID', $lineIdsToSplit)
                ->where('DocumentNo', $currentMergeId)
                ->update([
                    'DocumentNo' => $newDocumentNo, // Chuyển nhà
                    'Line' => DB::raw("Line"), // Có thể cần đánh lại số Line nếu kỹ tính
                    'ModifiedBy' => $user->code,
                    'ModifiedDate' => now()
                ]);

            DB::connection('sqlsrv')->commit();

            return response()->json([
                'message' => 'Đã tách sản phẩm sang đơn mới thành công.',
                'old_order_id' => $currentMergeId,
                'new_order_id' => $newDocumentNo
            ]);
        } catch (\Exception $e) {
            DB::connection('sqlsrv')->rollBack();
            return response()->json(['message' => 'Lỗi tách đơn: ' . $e->getMessage()], 500);
        }
    }

    public function mergedByMonth()
    {
        $orders = Order::with('items.product')
            ->where('status', 14)
            ->get();

        $grouped = $orders->groupBy(function ($order) {
            return Carbon::parse($order->order_date)->format('m/Y');
        });

        $result = [];

        foreach ($grouped as $month => $ordersInMonth) {
            $items = [];

            foreach ($ordersInMonth as $order) {
                foreach ($order->items as $item) {
                    $key = $item->product_id;

                    if (!isset($items[$key])) {
                        $items[$key] = [
                            'product_id' => $item->product_id,
                            'product_name' => $item->product_name,
                            'price' => $item->unit_price,
                            'total_quantity' => 0
                        ];
                    }

                    $items[$key]['total_quantity'] += $item->quantity;
                }
            }

            $result[] = [
                'month' => $month,
                'items' => array_values($items)
            ];
        }

        return response()->json($result);
    }

    public function mergedByYear()
    {
        $orders = Order::with('items.product')
            ->where('status', 'fulfilled')
            ->where('payment_status', 'paid')
            ->where('merged', true)
            ->get();

        $grouped = $orders->groupBy(function ($order) {
            return Carbon::parse($order->order_date)->format('Y');
        });

        $result = [];

        foreach ($grouped as $year => $ordersInYear) {
            $items = [];
            $monthlyBreakdown = [];

            // Group by month within the year for detailed breakdown
            $monthlyGroups = $ordersInYear->groupBy(function ($order) {
                return Carbon::parse($order->order_date)->format('m');
            });

            foreach ($monthlyGroups as $month => $ordersInMonth) {
                $monthItems = [];
                foreach ($ordersInMonth as $order) {
                    foreach ($order->items as $item) {
                        $key = $item->product_id;

                        // Add to yearly total
                        if (!isset($items[$key])) {
                            $items[$key] = [
                                'product_id' => $item->product_id,
                                'product_name' => $item->product_name,
                                'product_code' => $item->product->code ?? '',
                                'price' => $item->unit_price,
                                'total_quantity' => 0
                            ];
                        }
                        $items[$key]['total_quantity'] += $item->quantity;

                        // Add to monthly breakdown
                        if (!isset($monthItems[$key])) {
                            $monthItems[$key] = [
                                'product_id' => $item->product_id,
                                'product_name' => $item->product_name,
                                'product_code' => $item->product->code ?? '',
                                'price' => $item->unit_price,
                                'total_quantity' => 0
                            ];
                        }
                        $monthItems[$key]['total_quantity'] += $item->quantity;
                    }
                }

                $monthlyBreakdown[] = [
                    'month' => sprintf('%02d/%s', $month, $year),
                    'month_name' => Carbon::createFromFormat('m', $month)->format('F'),
                    'items' => array_values($monthItems)
                ];
            }

            $result[] = [
                'year' => $year,
                'total_items' => array_values($items),
                'monthly_breakdown' => $monthlyBreakdown,
                'total_revenue' => array_sum(array_map(function ($item) {
                    return $item['price'] * $item['total_quantity'];
                }, $items))
            ];
        }

        return response()->json($result);
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
            array_shift($rows); // Bỏ tiêu đề

            if (count($rows) === 0) {
                return response()->json(['message' => 'File Excel không có dữ liệu.'], 422);
            }

            $groupedOrders = [];
            $allowManualItems = ((int)$request->industry_id === 18);

            foreach ($rows as $index => $row) {
                // Đọc các cột
                $code     = trim($row['A'] ?? '');
                $name     = trim($row['B'] ?? '');
                $qty      = floatval($row['C'] ?? 0);
                $price    = floatval($row['D'] ?? 0);
                $supplier = trim($row['E'] ?? '');
                $color    = trim($row['F'] ?? '');

                // 👉 Đọc thêm 2 cột mới
                $intendedUse = trim($row['G'] ?? '');
                $note        = trim($row['H'] ?? '');

                if ($qty <= 0 || !$supplier) continue;

                // Logic tự sinh mã cho Ngành 18 (nếu trống)
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
                    'code'        => $code,
                    'name'        => $name,
                    'qty'         => $qty,
                    'price'       => $price,
                    'color'       => $color,
                    'intendedUse' => $intendedUse, // Lưu vào để dùng sau
                    'note'        => $note,        // Lưu vào để dùng sau
                    'line_index'  => $index + 2
                ];
            }

            $createdOrders = [];
            $industryId = (int)$request->industry_id;

            // Xử lý tạo đơn
            foreach ($groupedOrders as $supplierName => $items) {

                // Lấy IntendedUse và Note từ dòng đầu tiên của nhóm này
                // Nếu dòng đầu tiên trống thì mặc định
                $firstItem = $items[0];
                $orderIntendedUse = !empty($firstItem['intendedUse']) ? $firstItem['intendedUse'] : 'Import Excel';
                $orderNote        = !empty($firstItem['note']) ? $firstItem['note'] : 'Imported from Excel';

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
                // A. Tạo Header (Dùng Note và IntendedUse từ Excel)
                Order::create([
                    'DocumentNo'   => $newDocumentNo,
                    'PostingDate'  => now(),
                    'ShipmentDate' => now()->addDays(3),
                    'Industry'     => $industryId,
                    'IntendedUse'  => $orderIntendedUse, // ✅ Dùng dữ liệu Excel
                    'Supplier'     => $supplierName,
                    'Status'       => 1,
                    'Note'         => $orderNote,        // ✅ Dùng dữ liệu Excel
                    'CreatedBy'    => $user->code,
                    'CreatedDate'  => now(),
                ]);

                // B. Tạo Items
                $manualItemIndex = 1;

                foreach ($items as $i => $item) {
                    $cleanCode = $item['code'];
                    $variant   = $item['color'];

                    // Logic mã tự sinh 180000... (Giữ nguyên logic cũ nếu muốn)
                    if ($allowManualItems && str_starts_with($cleanCode, '18') && strlen($cleanCode) > 10) {
                        // Nếu là mã tạm sinh từ vòng lặp trước, ta reset lại theo chuẩn 180000xxxx
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

                    // Insert Original (Lưu Note từ Excel vào dòng này luôn nếu muốn)
                    \App\Models\OrderOriginal::create([
                        'DocumentNo'  => $newDocumentNo,
                        'PostingDate' => now(),
                        'IntendedUse' => $orderIntendedUse, // ✅
                        'Supplier'    => $supplierName,
                        'ItemCode'    => $cleanCode,
                        'Variant'     => $variant,
                        'ItemName'    => $itemName,
                        'Unit'        => $unit,
                        'Quantity'    => $item['qty'],
                        'Price'       => $price,
                        'Status'      => 1,
                        'Note'        => $orderNote,       // ✅ Fix lỗi NULL Note
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
                        'Quantity'    => $item['qty'],
                        'QuantityOld' => $item['qty'],
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
}
