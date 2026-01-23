<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Vendor;
use App\Http\Resources\VendorResource; // <--- Import Resource

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        try {
            
            $query = Vendor::select('No_', 'Name', 'Address'); 

            // 2. Logic lọc (Giữ nguyên như đã sửa)
            if ($request->has('industry') && !empty($request->industry)) {
                $query->whereHas('receiptLines', function ($q) use ($request) {
                    $q->where('Shortcut Dimension 1 Code', $request->industry);
                });
            }

            if ($request->has('q') && !empty($request->q)) {
                $search = $request->q;
                $query->where(function($q) use ($search) {
                    $q->where('No_', 'like', "%{$search}%")
                      ->orWhere('Name', 'like', "%{$search}%");
                });
            }

            // 3. Lấy dữ liệu
            $suppliers = $query->orderBy('Name', 'asc')->get();

            // 4. Trả về qua Resource (Biến đổi No_ -> code, Name -> name)
            return response()->json([
                'status' => 'success',
                'count'  => $suppliers->count(),
                'data'   => VendorResource::collection($suppliers) // <--- Dùng Collection Resource
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }
}