<?php

namespace App\Http\Controllers;

use App\Models\Report;
use Illuminate\Http\Request;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;


class ReportController extends Controller
{
    use AuthorizesRequests;

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        // Lấy thông tin user từ token
        $user = JWTAuth::user();
        $this->authorize('viewAny', Report::class); // Kiểm tra quyền xem báo cáo
         $reports = in_array($user->role->name_role, ['truong_phong', 'pho_phong'])
        ? Report::all()
        : Report::where('user_id', $user->id)->get();
        

        return response()->json($reports);
    }

    public function store(Request $request)
    {
        // Kiểm tra quyền tạo report
        $user = JWTAuth::user();
        $this->authorize('create', Report::class);   // ← Laravel tự 403


        $validator = Validator::make($request->all(), [
            'product_name' => 'required|string|max:255',
            'quantity' => 'required|integer|min:1',
            'color' => 'required|string|max:50',
            'revenue' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $report = Report::create([
            'product_name' => $request->product_name,
            'quantity' => $request->quantity,
            'color' => $request->color,
            'revenue' => $request->revenue,
            'user_id' => $user->id,
        ]);

        return response()->json($report, 201);
    }

    public function show(Report $report)
    {
        $user = JWTAuth::user();
        $this->authorize('view', $report); // Kiểm tra quyền xem báo cáo

        return response()->json($report);
    }

    public function update(Request $request, $id)
    {
        $report = Report::findOrFail($id);
        $user = JWTAuth::user();

        // Kiểm tra quyền sửa
        if (!($user->id === $report->user_id || 
            ($user->is_department_head && $user->department_id === $report->user->department_id))) {
            return response()->json(['error' => 'Không có quyền cập nhật báo cáo'], 403);
        }

        $validator = Validator::make($request->all(), [
            'product_name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|integer|min:1',
            'color' => 'sometimes|string|max:50',
            'revenue' => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $report->update($request->all());

        return response()->json($report);
    }

    public function destroy($id)
    {
        $report = Report::findOrFail($id);
        $user = JWTAuth::user();

        // Kiểm tra quyền xóa
        if (!($user->id === $report->user_id || 
            ($user->is_department_head && $user->department_id === $report->user->department_id))) {
            return response()->json(['error' => 'Không có quyền xóa báo cáo'], 403);
        }

        $report->delete();

        return response()->json(['message' => 'Báo cáo đã được xóa thành công']);
    }
}