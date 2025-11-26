<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Order;
use App\Models\Product;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use App\Models\Notification;
use PhpOffice\PhpSpreadsheet\IOFactory;




class OrderController extends Controller
{
    use AuthorizesRequests;
    public function __construct()
    {
        $this->middleware('auth:api'); // Middleware bảo vệ bằng JWT
    }
    
    public function store(Request $request)
    {
        $user = JWTAuth::user();
        $this->authorize('create', Order::class); // ① Kiểm tra quyền tổng

        // ② Validate đầu vào
        $validated = $request->validate([
            'orderDate'         => 'required|date',
            'shippingAddress'   => 'required|string',
            'supplier_name'     => 'required|string|max:255',
            'items'             => 'required|array|min:1',
            'items.*.productCode' => ['required', 'string', Rule::exists('products', 'code')],
            'items.*.quantity'  => 'required|integer|min:1',
            'status'            => ['nullable', Rule::in(Order::STATUSES)],
            'payment_status'    => ['nullable', Rule::in(Order::PAYMENT_STATUSES)],
            'estimatedDelivery' => 'nullable',
            'shipping'          => 'required|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        // ③ Xác định category_id của sản phẩm đầu tiên
        // ③ Xác định category_id và KIỂM TRA TRẠNG THÁI sản phẩm đầu tiên
        $firstProduct = Product::with('category') // Tải kèm category
                            ->where('code', $request->items[0]['productCode'])
                            ->firstOrFail();

        // CHECK 1: Sản phẩm phải 'active'
        if ($firstProduct->status !== 'active') {
            return response()->json([
                'message' => "Sản phẩm '{$firstProduct->name}' hiện không hoạt động và không thể thêm vào đơn."
            ], 422);
        }

        // CHECK 2: Danh mục của sản phẩm phải 'active'
        if (!$firstProduct->category || $firstProduct->category->status !== 'active') {
             return response()->json([
                'message' => "Danh mục '{$firstProduct->category->name}' của sản phẩm '{$firstProduct->name}' đang không hoạt động."
            ], 422);
        }

        $orderCategoryId = $firstProduct->category_id;

        // ④ Kiểm tra quyền theo category nếu là nhân viên
        if ($user->role->name_role === 'nhan_vien_chinh_thuc') {
            $allowed = $user->categories()->pluck('categories.id')->toArray();
            if (!in_array($orderCategoryId, $allowed)) {
                return response()->json(['message' => 'Bạn không được phép tạo đơn với danh mục này.'], 403);
            }
        }

        // ⑤ Kiểm tra các sản phẩm đều cùng category + tồn kho
        // ⑤ Kiểm tra các sản phẩm đều cùng category + tồn kho
        $subtotal = 0;
        foreach ($request->items as $item) {
            $product = Product::where('code', $item['productCode'])->firstOrFail();

            // CHECK 3: Kiểm tra trạng thái của các sản phẩm tiếp theo
            if ($product->status !== 'active') {
                return response()->json([
                    'message' => "Sản phẩm '{$product->name}' hiện không hoạt động và không thể thêm vào đơn."
                ], 422);
            }

            // 5.1 Kiểm tra cùng danh mục
            if ($product->category_id !== $orderCategoryId) {
                return response()->json([
                    'message' => 'Tất cả sản phẩm trong đơn phải thuộc cùng một danh mục.'
                ], 422);
            }
            
            // (Chúng ta không cần check category status ở đây nữa, 
            // vì đã check ở sản phẩm đầu tiên, và 5.1 đảm bảo tất cả cùng category)

            // 5.2 Tính tổng
            $subtotal += $item['quantity'] * $product->price;
        }

        // ⑥ Tính toán tổng tiền
        $tax      = round($subtotal * 0.08, 2);
        $shipping = $request->shipping;
        $total    = $subtotal + $tax + $shipping;

        $prefix = DB::table('categories')->where('id', $orderCategoryId)->value('prefix') ?? 'XX';
            $timestamp = now('Asia/Ho_Chi_Minh')->format('ymdHis');
            $random    = strtoupper(Str::random(4));
            $orderNumber = "{$prefix}-{$timestamp}-{$random}";

        // ⑦ Tạo đơn hàng và item trong transaction
        DB::beginTransaction();
        try {
            // ⑦.1 Lấy prefix theo category
            

            $order = Order::create([
                'order_number'       => $orderNumber,
                'total_amount'       => $total,
                'status'             => $request->status ?? 'draft',
                'payment_status'     => $request->payment_status ?? 'pending',
                'user_id'            => $user->id,
                'shipping_address'   => $request->shippingAddress,
                'supplier_name'      => $request->supplier_name,
                'order_date'         => $request->orderDate,
                'estimated_delivery' => $request->estimatedDelivery,
                'notes'              => $request->notes,
                'subtotal'           => $subtotal,
                'tax'                => $tax,
                'shipping'           => $shipping,
            ]);

            foreach ($request->items as $item) {
                $product = Product::where('code', $item['productCode'])->firstOrFail();

                OrderItem::create([
                    'order_id'     => $order->id,
                    'product_id'   => $product->id,
                    'quantity'     => $item['quantity'],
                    'unit_price'   => $product->price,
                    'product_name' => $product->name,
                    'barcode'     => $product->barcode, 
                    'color'       => $product->color, 
                    'line_total'   => $product->price * $item['quantity'],
                ]);
            }

            DB::commit();
            return response()->json([
                'message' => 'Order created successfully.',
                'order'   => $order->load('items.product'),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create order',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }


    public function update(Request $request, Order $order)
    {
        $user = JWTAuth::user();
        $this->authorize('update', $order);

        $statusBefore = $order->status;
        $statusAfter  = $request->get('status', $statusBefore);

        // 🎯 VALIDATE chuyển trạng thái đúng theo role
        if ($user->isInDepartment('KINH_DOANH') && $statusAfter !== $statusBefore) {
        if (!in_array($statusBefore, ['draft']) || $statusAfter !== 'pending') {
            return response()->json(['message' => 'KD chỉ được chuyển từ draft sang pending.'], 403);
            }
        }

        if ($user->isInDepartment('CUNG_UNG') && $statusAfter !== $statusBefore) {
            if ($statusBefore === 'pending' && $statusAfter === 'draft') {
                // OK
            } elseif( in_array($statusBefore, ['pending', 'rejected'])  && $statusAfter === 'approved') {
                // OK
            } else {
                return response()->json(['message' => 'CU chỉ được chuyển pending → draft hoặc pending → approved và rejected → approved.'], 403);
            }
        }

        if ($user->isRole('giam_doc') && $statusAfter !== $statusBefore) {
            if ($statusBefore !== 'approved' || !in_array($statusAfter, ['fulfilled', 'rejected'])) {
                return response()->json(['message' => 'GD chỉ được duyệt từ approved → fulfilled / rejected.'], 403);
            }
        }


        /* 2. Validate */
        $isPatch = $request->isMethod('patch');
        $req     = $isPatch ? 'sometimes' : 'required';

        $rules = [
            'orderDate'           => $req . '|date',
            'shippingAddress'     => $req . '|string',
            'supplier_name'       => $req . '|string|max:255',
            'items'               => $req . '|array|min:1',
            // 🔑 so sánh & validate theo productCode
            'items.*.productCode' => [$req, 'string', Rule::exists('products', 'code')],
            'items.*.quantity'    => $req . '|integer|min:1',
            'status'              => [$req, Rule::in(Order::STATUSES)],
            'payment_status'       => [$req, Rule::in(Order::PAYMENT_STATUSES)],
            'estimated_delivery'   => 'nullable|date|after_or_equal:orderDate',
            'shipping'            => 'sometimes|numeric|min:0',
            'notes'               => 'nullable|sometimes|string'
        ];
        $validated = $request->validate($rules);

        /* 3. Chuẩn bị dữ liệu mới */
        $hasItems = $request->has('items');
        $canModifyItemsFully = false;

        // 🎯 Kiểm tra quyền sửa sản phẩm
        if ($hasItems) {
            if ($user->isInDepartment('KINH_DOANH')) {
                if ($order->status !== 'draft') {
                    return response()->json(['message' => 'KINH DOANH chỉ được sửa đơn ở trạng thái draft.'], 403);
                }
                $canModifyItemsFully = true; // Được thêm / xoá / sửa sản phẩm
            } else {
                // Với CUNG ỨNG và GIÁM ĐỐC → chỉ được sửa số lượng sản phẩm
                $submittedCodes = collect($request->items)->pluck('productCode')->sort()->values();
                $existingCodes  = $order->items()->with('product')->get()
                                    ->pluck('product.code')->sort()->values();

                if ($submittedCodes->count() !== $existingCodes->count() ||
                    !$submittedCodes->every(fn($code, $idx) => $code === $existingCodes[$idx])) {
                    return response()->json(['message' => 'Bạn không được thêm/xoá hoặc thay đổi sản phẩm. Chỉ được chỉnh sửa số lượng.'], 403);
                }
            }
        }

        $subtotal   = 0;
        $newByCode  = collect();   // key = productCode

        if ($hasItems) {
             $firstProduct    = Product::where('code', $request->items[0]['productCode'])->firstOrFail();
            $orderCategoryId = $firstProduct->category_id;

            if (!$user->isManager()) {
                $allowed = $user->categories()->pluck('categories.id')->toArray();
            if (!$orderCategoryId || !in_array($orderCategoryId, $allowed)) {
                    return response()->json(['message' => 'Bạn không có quyền với danh mục này.'], 403);
                }
            }

            foreach ($request->items as $it) {
                $product = Product::where('code', $it['productCode'])->firstOrFail();

                if ($product->category_id !== $orderCategoryId) {
                    return response()->json(['message' => 'Tất cả sản phẩm phải cùng danh mục.'], 422);
                }

                $qty = $it['quantity'];
                $subtotal += $qty * $product->price;

                if ($canModifyItemsFully) {
                    // ✅ Trường hợp KINH DOANH: update đầy đủ
                    $newByCode->put($product->code, [
                        'product'  => $product,
                        'quantity' => $qty
                    ]);
                } else {
                    // ✅ Trường hợp CUNG ỨNG / GIÁM ĐỐC: chỉ update số lượng
                    $order->items()->where('product_id', $product->id)->update([
                        'quantity'   => $qty,
                        'line_total' => $product->price * $qty,
                    ]);
                }
            }

        }

        /* 4. Giao dịch */
        DB::beginTransaction();
        try {
            /* 4.1 Cập nhật header đơn */
            $order->fill($validated);

            // Cho phép cập nhật ngày giao hàng: chỉ khi CUNG ỨNG duyệt từ pending → approved
            if ($user->isInDepartment('CUNG_UNG') && $statusBefore === 'pending' && $statusAfter === 'approved') {
                if (!$request->filled('estimated_delivery')) {
                    return response()->json(['message' => 'Cần chọn ngày giao hàng khi duyệt đơn.'], 422);
                }
                if ($request->payment_status !== 'paid') {
                    return response()->json(['message' => 'Đơn hàng phải được thanh toán trước khi duyệt.'], 422);
                }
                $order->estimated_delivery = $request->estimated_delivery;
            } else {
                // Trường hợp khác không được sửa ngày giao hàng
                unset($validated['estimated_delivery']);
            }


            if ($hasItems) {
                $shipping = $request->get('shipping', $order->shipping ?? 0);
                $tax      = round($subtotal * 0.08, 2);
                $total    = $subtotal + $tax + $shipping;

                $order->subtotal     = $subtotal;
                $order->tax          = $tax;
                $order->shipping     = $shipping;
                $order->total_amount = $total;
            }
            $order->save();

            /* 4.2 Lấy danh sách item cũ theo productCode */
            $oldItems = $order->items()
                            ->with('product:id,code,name,price')
                            ->get()
                            ->keyBy(fn($item) => $item->product->code);   // key = productCode

                        /* a. Thêm mới / cập nhật */
            $keptProductIds = [];          // ⭐ sẽ chứa ID đã xử lý

            foreach ($newByCode as $code => $row) {
                $product = $row['product'];
                $qty     = $row['quantity'];

                $order->items()->updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'quantity'     => $qty,
                        'unit_price'   => $product->price,
                        'product_name' => $product->name,
                        'barcode'     => $product->barcode,
                        'color'       => $product->color,
                        'line_total'   => $product->price * $qty,
                    ]
                );

                $keptProductIds[] = $product->id;     // ⭐ thu thập ID
            }

            /* b. Xoá những product_id không còn được giữ lại */
            if ($canModifyItemsFully) {
                $order->items()->whereNotIn('product_id', $keptProductIds)->delete();
            }

            DB::commit();
            // 🔔 Gửi thông báo cho bộ phận có liên quan
            $relatedUsers = User::where('id', '!=', $user->id)->get();

            foreach ($relatedUsers as $u) {
                Notification::create([
                    'order_id'    => $order->id,
                    'sender_id'   => $user->id,
                    'user_id' => $u->id,
                    'type'        => 'order_updated',
                    'message'     => "Đơn hàng #{$order->order_number} vừa được chỉnh sửa bởi {$user->name}",
                    'expires_at' => now()->addHours(1),

                ]);
            }

            return response()->json([
                'message' => 'Order updated successfully.',
                'order'   => $order->load('items')
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Update failed',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
    public function index(Request $request)
    {
        $user = auth()->user();
        $this->authorize('viewAny', Order::class); 
        $query = Order::with('items.product')
            ->where('merged', false) ;// Chỉ lấy đơn chưa gộp

        // Xác định trạng thái phù hợp với từng vai trò/phòng
        if ($user->isRole('giam_doc')) {
            $query->whereIn('status', ['approved', 'rejected', 'fulfilled']);
        } elseif ($user->isInDepartment('KINH_DOANH') && ($user->isManager() || $user->isEmployee())) {
            $query->whereIn('status', ['draft', 'pending']);
        } elseif ($user->isInDepartment('CUNG_UNG') && ($user->isManager() || $user->isEmployee())) {
            $query->whereIn('status', ['pending', 'rejected', 'fulfilled']);
        } else {
            return response()->json(['message' => 'Bạn không có quyền xem đơn hàng'], 403);
        }

        $orders = $query->get();

        $filtered = $orders->filter(function ($order) use ($user) {
            return Gate::forUser($user)->allows('view', $order); // kiểm tra theo category nếu là nhân viên
        });

        // ✅ Phân trang thủ công
        $page = $request->input('page', 1);
        $perPage = 10;
        $paginated = $filtered->values()->forPage($page, $perPage);

        return response()->json([
            'data' => $paginated,
            'total' => $filtered->count(),
            'current_page' => $page,
            'last_page' => ceil($filtered->count() / $perPage),
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

    public function show(Order $order)          // <- route‑model binding
    {
        $user = JWTAuth::user();

        /* 1️⃣  Phân quyền: HEAD/DEPUTY xem tất cả – nhân viên bị Policy lọc */
        $this->authorize('view', $order);   
        if ($user->role->name_role === 'nhan_vien_chinh_thuc') {
            $allowed = $user->categories()->pluck('categories.id')->toArray();
            $orderCategoryId = $order->items->first()->product->category_id ?? null;

            if (!$orderCategoryId || !in_array($orderCategoryId, $allowed)) {
                return response()->json([
                    'message' => 'Bạn không được phép xem đơn hàng trong danh mục này.'
                ], 403);
            }
        }


        /* 2️⃣  Eager‑load quan hệ cần thiết */
        $order->load([
            'creator:id,name',
            'items.product:id,code,name,price,category_id',
            'items.product.category:id,prefix,name'
        ]);

        /* 3️⃣  Trả JSON */
        return response()->json([
            'message' => 'Chi tiết đơn hàng',
            'order'   => $order
        ]);
    }
    public function combine(Request $request)
    {
        $user = JWTAuth::user();

        if (!$user->isInDepartment('CUNG_UNG')) {
            return response()->json(['message' => 'Không có quyền gộp đơn'], 403);
        }

        $orderIds = $request->input('order_ids', []);
        if (empty($orderIds)) {
            return response()->json(['message' => 'Chưa chọn đơn hàng nào'], 422);
        }
        Order::whereIn('id', $orderIds)->update(['merged' => true]);


        $orders = Order::with('items.product')
            ->whereIn('id', $orderIds)
            ->where('status', 'fulfilled')
            ->where('payment_status', 'paid')
            ->get();

        if ($orders->count() < 1) {
            return response()->json(['message' => 'Không có đơn hợp lệ để gộp'], 422);
        }

        // Bắt đầu gom sản phẩm
        $itemsByProduct = collect();

        foreach ($orders as $order) {
        foreach ($order->items as $item) {
                $pid = $item->product_id;

                $existing = $itemsByProduct->get($pid);

                if ($existing) {
                    $existing['quantity'] += $item->quantity;
                } else {
                    $existing = [
                        'product'  => $item->product,
                        'quantity' => $item->quantity,
                    ];
                }

                $itemsByProduct->put($pid, $existing);
            }
        }


        DB::beginTransaction();
        try {
            $subtotal = 0;
            foreach ($itemsByProduct as $row) {
                $subtotal += $row['quantity'] * $row['product']->price;
            }

            $tax = round($subtotal * 0.08, 2);
            $shipping = 0;
            $total = $subtotal + $tax + $shipping;
            // Tự sinh order_number cho đơn gộp
            $prefix = 'XX'; // Hoặc lấy từ prefix chung (nếu có)
            $timestamp = now('Asia/Ho_Chi_Minh')->format('ymdHis');
            $random = strtoupper(Str::random(4));
            $orderNumber = "{$prefix}-{$timestamp}-{$random}";


            $newOrder = Order::create([
                'order_number'       => $orderNumber, 

                'user_id'         => $user->id,
                'order_date'      => now(),
                'shipping_address'=> 'Gộp từ nhiều đơn',
                'supplier_name'   => 'N/A',
                'estimated_delivery' => now()->addDays(7),
                'status'          => 'draft',
                'payment_status'  => 'pending',
                'subtotal'        => $subtotal,
                'tax'             => $tax,
                'shipping'        => $shipping,
                'total_amount'    => $total,
                'notes'           => 'Gộp từ đơn: ' . implode(', ', $orders->pluck('order_number')->toArray()),
            ]);

            foreach ($itemsByProduct as $row) {
                $product = $row['product'];
                $qty = $row['quantity'];

                OrderItem::create([
                    'order_id'     => $newOrder->id,
                    'product_id'   => $product->id,
                    'quantity'     => $qty,
                    'unit_price'   => $product->price,
                    'product_name' => $product->name,
                    'line_total'   => $qty * $product->price,
                ]);
                $product->increment('quantity', $qty); // ✅ cộng vào tồn kho

            }

            DB::commit();

            return response()->json([
                'message' => 'Đã gộp đơn thành công',
                'order'   => $newOrder->load('items.product'),
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gộp thất bại', 'error' => $e->getMessage()], 500);
        }
    }

    public function mergedByMonth()
    {
        $orders = Order::with('items.product')
            ->where('status', 'fulfilled')
            ->where('payment_status', 'paid')
            ->where('merged', true) // cột merged = true
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
                'total_revenue' => array_sum(array_map(function($item) {
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
        try {
            $user = JWTAuth::user();
            $this->authorize('create', Order::class);

            if (!$request->hasFile('file')) {
                return response()->json(['message' => 'Vui lòng chọn file Excel để import.'], 400);
            }

            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            // Bỏ qua dòng tiêu đề
            array_shift($rows);

            if (count($rows) === 0) {
                return response()->json(['message' => 'File Excel không có dữ liệu.'], 422);
            }

            // Gom nhóm sản phẩm theo (supplier_name + address)
            $groupedOrders = [];

            foreach ($rows as $index => $row) {
                $barcode  = trim($row['A'] ?? '');
                $color    = trim($row['B'] ?? '');
                $quantity = intval($row['C'] ?? 0);
                $address  = trim($row['D'] ?? '');
                $supplierName = trim($row['E'] ?? '');

                if (!$barcode || !$color || $quantity <= 0 || !$address || !$supplierName) {
                    return response()->json([
                        'message' => "Dòng " . ($index + 2) . " thiếu thông tin cần thiết."
                    ], 422);
                }

                $product = Product::where('barcode', $barcode)->where('color', $color)->first();
                if (!$product) {
                    return response()->json([
                        'message' => "Không tìm thấy sản phẩm {$barcode} - {$color} (Dòng " . ($index + 2) . ")"
                    ], 404);
                }

                $key = $supplierName . '___' . $address;
                $groupedOrders[$key][] = [
                    'product' => $product,
                    'quantity' => $quantity
                ];
            }

            $results = [];

            foreach ($groupedOrders as $groupKey => $items) {
                [$supplierName, $address] = explode('___', $groupKey);

                $subtotal = 0;
                $categoryId = null;
                $orderItems = [];

                foreach ($items as $item) {
                    $product = $item['product'];
                    $quantity = $item['quantity'];

                    // Gán danh mục đầu tiên
                    if (is_null($categoryId)) {
                        $categoryId = $product->category_id;

                        if ($user->role->name_role === 'nhan_vien_chinh_thuc') {
                            $allowed = $user->categories()->pluck('categories.id')->toArray();
                            if (!in_array($categoryId, $allowed)) {
                                return response()->json([
                                    'message' => "Bạn không có quyền tạo đơn với danh mục sản phẩm này: {$product->name}"
                                ], 403);
                            }
                        }
                    }

                    // Kiểm tra cùng danh mục
                    if ($product->category_id !== $categoryId) {
                        return response()->json([
                            'message' => "Tất cả sản phẩm trong mỗi đơn phải thuộc cùng danh mục. Danh mục khác nhau: {$product->name}"
                        ], 422);
                    }

                    $subtotal += $quantity * $product->price;

                    $orderItems[] = [
                        'product_id' => $product->id,
                        'quantity'   => $quantity,
                        'unit_price' => $product->price
                    ];
                }

                $tax = round($subtotal * 0.08, 2);
                $shipping = 0;
                $total = $subtotal + $tax + $shipping;

                // Tạo mã đơn
                $prefix = DB::table('categories')->where('id', $categoryId)->value('prefix') ?? 'XX';
                $timestamp = now('Asia/Ho_Chi_Minh')->format('ymdHis');
                $random = strtoupper(Str::random(4));
                $orderNumber = "{$prefix}-{$timestamp}-{$random}";

                // Tạo đơn hàng
                $order = Order::create([
                    'order_number'     => $orderNumber,
                    'user_id'          => $user->id,
                    'status'           => 'draft',
                    'subtotal'         => $subtotal,
                    'tax'              => $tax,
                    'shipping'         => $shipping,
                    'total_amount'     => $total,
                    'supplier_name'    => $supplierName,
                    'shipping_address' => $address,
                    'payment_status'   => 'pending',
                    'order_date'       => now(),
                ]);

                foreach ($orderItems as $item) {
                    $order->items()->create($item);
                }

                $results[] = [
                    'order_number' => $order->order_number,
                    'total_amount' => $total
                ];
            }

            return response()->json([
                'message' => 'Import thành công',
                'orders'  => $results
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi import Excel',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

}

    




