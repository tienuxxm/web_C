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

    private function normalizeString($str)
    {
        if (!$str) return '';
        $str = \Illuminate\Support\Str::ascii($str);
        return strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $str));
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Product::query();

            // 1. Lọc sản phẩm Active (Blocked = 0)
            $query->orderBy('Code', 'asc');
            if ($request->has('q') && $request->q) {
                $cleanKeyword = $this->normalizeString($request->q);
                $query->where(function($sub) use ($cleanKeyword) {
                
                $sub->whereRaw("LOWER(REPLACE(REPLACE(REPLACE([Code], '-', ''), ' ', ''), '.', '')) LIKE ?", ["%{$cleanKeyword}%"])
                
               
                    ->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE([Name], '-', ''), ' ', ''), '.', '')) COLLATE SQL_Latin1_General_CP1_CI_AI LIKE ?", ["%{$cleanKeyword}%"])
                    
                    ->orWhereRaw("LOWER(REPLACE(REPLACE([Variant], '-', ''), ' ', '')) COLLATE SQL_Latin1_General_CP1_CI_AI LIKE ?", ["%{$cleanKeyword}%"]);
            });
            }

            if ($request->has('category_id') && $request->category_id !== 'all') {
                $catId = $request->category_id;
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
