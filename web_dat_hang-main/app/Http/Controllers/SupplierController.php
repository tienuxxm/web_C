<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Vendor;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    /**
     * Lấy danh sách Nhà cung cấp (Duy nhất) dựa trên lịch sử nhập hàng.
     * Hỗ trợ lọc theo Ngành hàng (Industry) và Tìm kiếm (q).
     */
    public function index(Request $request)
    {
        try {
            // 1. Khởi tạo Query từ Model Header (Bảng chứa tên NCC)
            $query = Vendor::query();

            // 2. JOIN với bảng Line (Bảng chứa mã sản phẩm để biết ngành hàng)
            // Cú pháp: join('Tên_Bảng as Alias', 'Khóa_Bảng_1', '=', 'Khóa_Bảng_2')
            $query->join(
                'view_Purch_ Rcpt_ Line as line', 
                'view_Purch_ Inv_ Header.Buy-from Vendor No_', 
                '=', 
                'line.Buy-from Vendor No_'
            );

            // 3. SELECT các cột cần thiết
            // Lưu ý: Đổi tên cột sang 'code' và 'name' cho Frontend dễ dùng
            $query->select(
                'view_Purch_ Inv_ Header.Buy-from Vendor No_ as code',
                'view_Purch_ Inv_ Header.Pay-to Name as name'
            );

            // 4. LỌC THEO NGÀNH HÀNG (Nếu có tham số ?industry=IT)
            if ($request->has('industry') && !empty($request->industry)) {
                // Sử dụng whereRaw để cắt chuỗi SQL: LEFT(No_, 2)
                $query->whereRaw("LEFT(line.No_, 2) = ?", [$request->industry]);
            }

            // 5. TÌM KIẾM (Nếu có tham số ?q=...)
            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where(function($q) use ($search) {
                    $q->where('view_Purch_ Inv_ Header.Buy-from Vendor No_', 'like', "%{$search}%")
                      ->orWhere('view_Purch_ Inv_ Header.Pay-to Name', 'like', "%{$search}%");
                });
            }

            // 6. QUAN TRỌNG NHẤT: DISTINCT
            // Loại bỏ tất cả các dòng trùng lặp mã và tên nhà cung cấp
            $suppliers = $query->distinct()->get();

            // 7. Trả về kết quả JSON
            return response()->json([
                'status' => 'success',
                'count'  => $suppliers->count(),
                'data'   => $suppliers
            ]);

        } catch (\Exception $e) {
            // Xử lý lỗi
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi lấy danh sách nhà cung cấp: ' . $e->getMessage()
            ], 500);
        }
    }
}