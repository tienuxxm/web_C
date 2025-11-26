<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category; 
use Illuminate\Http\JsonResponse;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
class ProductController extends Controller
{
    use AuthorizesRequests;
    public function __construct()
    {
        $this->middleware('auth:api'); // Middleware bảo vệ bằng JWT
    }
    // public function store(Request $request): JsonResponse
    // {
    //     // 1️⃣ VALIDATE NGAY TRONG CONTROLLER
    //     $validated = $request->validate([
    //         'code'        => 'nullable|string|unique:products,code',
    //         'name'        => 'required|string|max:255',
    //         'price'       => 'required|numeric|min:0',
    //         'quantity'    => 'required|integer|min:0',
    //         'min_stock'  => 'required|integer|min:0',
    //         'description' => 'nullable|string',
    //         'image'       => 'nullable|image|max:2048',
    //         'category_id' => 'required|exists:categories,id',
    //         'color'       => 'nullable|string|max:50',
    //         'barcode'     => 'nullable|string|max:255', // Thêm validate cho barcode
    //         'status'      => 'in:active,inactive',
    //     ]);

    //     DB::beginTransaction();

    //     try {
    //         // 2️⃣ Upload ảnh nếu có
    //         if ($request->hasFile('image')) {
    //             $path = $request->file('image')->store('products', 'public');
    //             $validated['image'] = $path;
    //         }

    //         // 3️⃣ Gán người tạo (dù trong model có cũng nên gán rõ)
    //         $validated['created_by'] = auth()->id();

    //         // 4️⃣ Tạo sản phẩm (model sẽ tự sinh code nếu chưa có)
    //         $product = Product::create($validated)->load('category');

    //         DB::commit();

    //         return response()->json([
    //             'message' => 'Tạo sản phẩm thành công',
    //             'product' => $product,
    //         ], 201);
    //     } catch (\Throwable $e) {
    //         DB::rollBack();

    //         return response()->json([
    //             'message' => 'Lỗi tạo sản phẩm',
    //             'error'   => $e->getMessage(),
    //         ], 500);
    //     }
    // }
    // public function index(Request $request): JsonResponse
    // {
    //     $user = JWTAuth::user();
    //     $this->authorize('viewAny', Product::class);

    //     $query = Product::with('category');

    //     $roleName = $user->role->name_role;
    //     $deptName = $user->department ? $user->department->name_department : null;

    //     $isDirector = $roleName === 'giam_doc';
    //     $isManager = in_array($roleName, ['truong_phong', 'pho_phong']);
    //     $allowedDepts = ['KINH_DOANH', 'CUNG_UNG', 'HANH_CHANH'];
        
    //     // Xác định xem người dùng có phải cấp quản lý (có thể thấy inactive) hay không
    //     $isManagementLevel = $isDirector || ($isManager && in_array($deptName, $allowedDepts));

    //     if ($isManagementLevel) {
    //         // Cấp quản lý: Thấy tất cả sản phẩm có trạng thái ['active', 'out_of_stock', 'inactive'].
    //         // Họ có quyền thấy sản phẩm ngay cả khi Category đó bị inactive (để quản lý).
    //         $query->whereIn('products.status', ['active', 'out_of_stock', 'inactive']);
            
    //     } else {
    //         // Cấp nhân viên trở xuống: Chỉ thấy những sản phẩm active VÀ thuộc danh mục được phép VÀ danh mục đó phải ACTIVE.

    //         // 1. Lấy danh sách ID category mà được phép
    //         $allowedCategoryIds = $user->categories()->pluck('categories.id')->toArray();

    //         // 2. Thêm điều kiện: Sản phẩm phải thuộc các category này
    //         $query->whereIn('products.category_id', $allowedCategoryIds);
            
    //         // 3. Chỉ thấy sản phẩm có status là 'active'
    //         $query->where('products.status', 'active');
            
    //         // 4. FIX BUG QUAN TRỌNG: Chỉ lấy sản phẩm khi DANH MỤC (category) cũng đang ACTIVE
    //         $query->whereHas('category', function ($q) {
    //             $q->where('status', 'active');
    //         });
    //     }

    //     // 3️⃣ Phân trang (mặc định 10/sp, có thể truyền ?per_page=20 từ FE)
    //     $perPage = $request->integer('per_page', 10);
    //     $products = $query->latest()->paginate($perPage);

    //     // 4️⃣ Format lại từng item
    //     $data = $products->getCollection()->map(fn(Product $p) => [
    //         'id'          => $p->id,
    //         'name'        => $p->name,
    //         'code'        => $p->code,
    //         'price'       => $p->price,
    //         'quantity'    => $p->quantity,
    //         'min_stock'   => $p->min_stock,
    //         'description' => $p->description,
    //         'image'       => $p->image_url,
    //         'category'    => $p->category->name ?? null,
    //         'category_id' => $p->category_id,
    //         'category_status' => $p->category->status ?? 'inactive',
    //         'status'      => $p->status,
    //         'color'       => $p->color, 
    //         'barcode'     => $p->barcode,
    //         'created_at'  => $p->created_at->toDateString(),
    //         'sales'       => 0,
    //     ]);

    //     // 5️⃣ Trả về kết quả dạng phân trang
    //     return response()->json([
    //         'message'     => 'Danh sách sản phẩm',
    //         'products'    => $data,
    //         'pagination'  => [
    //             'current_page' => $products->currentPage(),
    //             'per_page'     => $products->perPage(),
    //             'total'        => $products->total(),
    //             'last_page'    => $products->lastPage(),
    //         ],
    //     ], 200);
    // }

    // public function update(Request $request,  $id)
    // {
    //     $product = Product::findOrFail($id);
    //     $user = JWTAuth::user();
    //     $this->authorize('update', $product);

    //     // Validate dữ liệu
    //     $validated = $request->validate([
    //         'name'        => 'sometimes|string|max:255',
    //         'price'       => 'sometimes|numeric|min:0',
    //         'quantity'    => 'sometimes|integer|min:0',
    //         'min_stock'   => 'sometimes|integer|min:0',
    //         'description' => 'sometimes|string|nullable',
    //         'image'       => 'nullable|image|max:2048',
    //         'category_id' => 'sometimes|exists:categories,id',
    //         'status'      => 'in:active,inactive,out_of_stock',
    //         'barcode'     => 'nullable|string|max:255',
    //         'color'       => 'nullable|string|max:50', 
    //     ]);

    //     DB::beginTransaction();
    //     try {
    //         // Nếu có ảnh mới thì upload và xóa ảnh cũ nếu cần
    //         if ($request->hasFile('image')) {
    //             // Xóa ảnh cũ nếu có
    //             if ($product->image && \Storage::disk('public')->exists($product->image)) {
    //                 \Storage::disk('public')->delete($product->image);
    //             }
    //             $path = $request->file('image')->store('products', 'public');
    //             $validated['image'] = $path;
    //         }

    //         $product->update($validated);
    //         $product->load('category');

    //         DB::commit();

    //         return response()->json([
    //             'message' => 'Cập nhật sản phẩm thành công',
    //             'product' => [
    //                 'id'         => $product->id,
    //                 'name'       => $product->name,
    //                 'price'      => $product->price,
    //                 'quantity'   => $product->quantity,
    //                 'min_stock'  => $product->min_stock,
    //                 'description'=> $product->description,
    //                 'image'      => $product->image_url,
    //                 'category'   => $product->category->name ?? null,
    //                 'category' =>$product->category_id,
    //                 'status'     => $product->status,
    //                 'color'      => $product->color,
    //                 'created_at' => $product->created_at->toDateString(),
    //                 'sales'      => 0,
    //             ],
    //         ], 200);
    //     } catch (\Throwable $e) {
    //         DB::rollBack();
    //         return response()->json([
    //             'message' => 'Lỗi cập nhật sản phẩm',
    //             'error'   => $e->getMessage(),
    //         ], 500);
    //     }
    //     }
    // public function updateStatus(Request $request, $id)
    // {
    //     $product = Product::findOrFail($id);
    //     $this->authorize('update', $product);

    //     $request->validate([
    //         'status' => 'required|in:active,inactive',
    //     ]);

    //     $product->update(['status' => $request->status]);

    //     return response()->json([
    //         'message' => 'Cập nhật trạng thái thành công',
    //         'status'  => $product->status,
    //     ]);
    // }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Product::query();

            // 1. Lọc sản phẩm Active (Blocked = 0)
            $query->where('Blocked', 0);
            $query->orderBy('Code', 'asc');

            // 2. Tìm kiếm
            // 2. Tìm kiếm (Hỗ trợ Tiếng Việt không dấu & Thêm cột Unit)
            if ($request->has('q') && $request->q) {
                $q = $request->q;
                
                // Sử dụng whereRaw để chèn lệnh COLLATE của SQL Server
                $query->where(function($sub) use ($q) {
                    // Cấu trúc: TênCột COLLATE ... LIKE ?
                    
                    // 1. Tìm theo Code (Mã)
                    $sub->whereRaw("[Code] COLLATE SQL_Latin1_General_CP1_CI_AI LIKE ?", ["%{$q}%"])
                    
                    // 2. Tìm theo Tên (Name) - Quan trọng nhất với tiếng Việt
                        ->orWhereRaw("[Name] COLLATE SQL_Latin1_General_CP1_CI_AI LIKE ?", ["%{$q}%"])
                        
                    // 3. Tìm theo Biến thể (Màu sắc)
                        ->orWhereRaw("[Variant] COLLATE SQL_Latin1_General_CP1_CI_AI LIKE ?", ["%{$q}%"])
                        
                    // 4. Tìm theo Đơn vị tính (Unit) - (Bạn muốn tìm thêm cột nào thì thêm vào đây)
                        ->orWhereRaw("[Unit] COLLATE SQL_Latin1_General_CP1_CI_AI LIKE ?", ["%{$q}%"]);
                        
                    // Lưu ý: Không nên tìm trên cột số (Price) bằng LIKE vì hiệu năng thấp và ít khi người dùng search giá bằng text.
                });
            }

            if ($request->has('category_id') && $request->category_id !== 'all') {
                $catId = $request->category_id;
                // Lọc các sản phẩm có Mã bắt đầu bằng Mã ngành hàng
                $query->where('Code', 'like', "{$catId}%");
            }

            // 3. Phân trang
            $perPage = $request->integer('per_page', 6);
            $products = $query->paginate($perPage);

            // --- Tối ưu tra cứu danh mục ---
            $catCodes = $products->getCollection()->map(fn($p) => substr($p->id, 0, 2))->unique();
            $categoriesMap = Category::whereIn('Code', $catCodes)->pluck('Description', 'Code');
            // 4. Map dữ liệu (BỎ TỒN KHO)
            $data = $products->getCollection()->map(function ($p) use ($categoriesMap) {
                $catCode = substr($p->id, 0, 2);
                $catName = $categoriesMap[$catCode] ?? $catCode;
                $uniqueId = $p->Code . ($p->Variant ? '-' . $p->Variant : '');

                return [
                    'id'          => $uniqueId,       
                    'code'        => $p->id,
                    'name'        => $p->name,
                    'price'       => $p->price,
                    
                    // Bỏ quantity/min_stock
                    // 'quantity' => ..., 
                    
                    'description' => $p->name,
                    'image'       => 'http://localhost:8000/images/default.png',
                    
                    'category'    => $catName,
                    'category_id' => $catCode,
                    
                    // Fix lỗi FE: Luôn trả về category_status là active (hoặc query thật nếu cần)
                    'category_status' => 'active', 
                    'unit'  => $p->Unit,
                    'status'      => $p->status,
                    'color'       => $p->variant,
                    'barcode'     => null,
                ];
            });

            return response()->json([
                'message'     => 'Danh sách sản phẩm',
                'products'    => $data,
                'pagination'  => [
                    'current_page' => $products->currentPage(),
                    'per_page'     => $products->perPage(),
                    'total'        => $products->total(),
                    'last_page'    => $products->lastPage(),
                ],
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi', 'error' => $e->getMessage()], 500);
        }
    }
    /**
     * Lấy chi tiết 1 sản phẩm (Hỗ trợ ID kép: Code-Variant)
     */
    public function show($id)
    {
        try {
            // 1. TÌM SẢN PHẨM BẰNG RAW QUERY
            // Vì trong DB không có cột 'id' dạng 'Code-Variant', ta phải nối chuỗi trong SQL để so sánh
            // Cú pháp SQL Server: Dùng dấu + để nối chuỗi
            $product = Product::whereRaw(
                "Code + CASE WHEN Variant IS NOT NULL AND Variant <> '' THEN '-' + Variant ELSE '' END = ?", 
                [$id]
            )->first();

            if (!$product) {
                return response()->json(['message' => 'Không tìm thấy sản phẩm'], 404);
            }

            // 2. Lấy thông tin Danh mục (tương tự hàm index)
            $catCode = substr($product->Code, 0, 2);
            // Tra cứu tên danh mục, nếu không thấy thì lấy tạm mã
            $catName = Category::where('Code', $catCode)->value('Description') ?? $catCode;

            // 3. Trả về dữ liệu (Mapping giống hệt hàm index để FE không bị lỗi)
            return response()->json([
                'data' => [
                    'id'          => $id, // Trả lại đúng cái ID kép mà FE đã gửi lên
                    
                    'code'        => $product->Code,   // SKU thực tế
                    'name'        => $product->Name,
                    'variant'     => $product->Variant,
                    'unit'        => $product->Unit,
                    'price'       => (float)$product->Price,
                    
                    // Accessor trong Model sẽ tự dịch Blocked=0 -> 'active'
                    'status'      => $product->status, 
                    
                    'image'       => 'http://localhost:8000/images/default.png',
                    'description' => $product->Name, // Dùng tên làm mô tả
                    
                    // Thông tin danh mục
                    'category'    => $catName,
                    'category_id' => $catCode,
                    'category_status' => 'active', // Luôn active để hiện nút action
                    
                    'color'       => $product->Variant,
                    'barcode'     => null,
                    'sales'       => 0,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi lấy chi tiết', 'error' => $e->getMessage()], 500);
        }
    }

public function stats()
{
    try {
        // 1. Tổng sản phẩm
        $total = Product::count();

        // 2. Sản phẩm Active (Blocked = 0)
        $active = Product::where('Blocked', 0)->count();

        // 3. Tồn kho thấp & Hết hàng
        // Lưu ý: Vì hiện tại View của bạn chưa có cột tồn kho thật (bạn đang fake stock=100)
        // Nên tạm thời ta trả về 0 hoặc logic tương tự. 
        // Khi nào có cột 'Inventory' thật, bạn sửa lại: ->where('Inventory', '<', 10)
        $lowStock = 0; 
        $outOfStock = 0;

        return response()->json([
            'total_products'  => $total,
            'active_products' => $active,
            'low_stock'       => $lowStock,
            'out_of_stock'    => $outOfStock,
        ]);

    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
    // Vô hiệu hóa các chức năng ghi
    public function store(Request $request) { return response()->json(['message' => 'Read-only mode'], 403); }
    public function update(Request $request, $id) { return response()->json(['message' => 'Read-only mode'], 403); }
    public function destroy($id) { return response()->json(['message' => 'Read-only mode'], 403); }


}
