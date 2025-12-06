<?php

namespace App\Http\Controllers;

use App\Http\Controllers\ReportController;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\Category;
use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use App\Http\Resources\CategoryResource; 


class CategoryController extends Controller
{
    use AuthorizesRequests;
    public function __construct()
    {
        $this->middleware('auth:api');
    }
    // public function store(Request $request)
    // {
    //     $this->authorize('create', Category::class);
    //     $validated = $request->validate([
    //         'name' => 'required|string|max:255',
    //         'prefix' => 'required|string|max:10',
    //         'status' => ['required', Rule::in(['active', 'inactive'])],
    //         'description' => 'nullable|string',
    //         'user_emails' => 'array',
    //         'user_emails.*' => 'email|exists:users,email',
    //     ]);

    //     $category = Category::create($validated);

    //     if (!empty($validated['user_emails'])) {
    //         $userIds = User::whereIn('email', $validated['user_emails'])->pluck('id');
    //         $category->users()->sync($userIds); // bảng category_user
    //     }

    //     return response()->json(['category' => $category->load('users')]);
    // }


    // Xem danh sách danh mục
    // public function index()
    // {
    //     $user = JWTAuth::user();
    //     $this->authorize('viewAny', Category::class);

    //     // Bắt đầu câu truy vấn
    //     $query = Category::with('users');

    //     // ==== LOGIC LỌC THEO VAI TRÒ MỚI ====
    //     $userRole = $user->role->name_role;
    //     $userDept = $user->department ? $user->department->name_department : null;

    //     $isDirector = $userRole === 'giam_doc';
    //     $isManager = in_array($userRole, ['truong_phong', 'pho_phong']);
    //     $allowedDepts = ['KINH_DOANH', 'CUNG_UNG', 'HANH_CHANH'];

    //     $canSeeAll = $isDirector || ($isManager && in_array($userDept, $allowedDepts));

    //     // Nếu không phải cấp quản lý, chỉ cho xem 'active'
    //     if (!$canSeeAll) {
    //         $query->where('status', 'active');
    //     }
    //     // ======================================

    //     $categories = $query->orderBy('name', 'asc')->get(); // Sắp xếp theo tên

    //     return response()->json([
    //         'message' => 'Danh sách danh mục',
    //         'categories' => $categories,
    //     ]);
    // }

    // public function update(Request $request, Category $category)
    // {
    //     $this->authorize('update', $category);
    //     $validated = $request->validate([
    //         'name'         => 'required|string|max:255',
    //         'prefix'       => 'required|string|max:50',
    //         'status'       => 'required|in:active,inactive',
    //         'description'  => 'nullable|string',
    //         'user_emails'  => 'nullable|array',
    //         'user_emails.*'=> 'email|exists:users,email',
    //     ]);

    //     DB::beginTransaction();
    //     try {
    //         // Cập nhật category chính
    //         $category->update([
    //             'name'        => $validated['name'],
    //             'prefix'      => $validated['prefix'],
    //             'status'      => $validated['status'],
    //             'description' => $validated['description'] ?? null,
    //         ]);

    //         // Xử lý user_emails
    //         if (isset($validated['user_emails'])) {
    //             // Lấy danh sách user_id tương ứng
    //             $userIds = User::whereIn('email', $validated['user_emails'])->pluck('id')->toArray();

    //             // Gán lại hoàn toàn (xóa cái cũ, gán cái mới)
    //             $category->users()->sync($userIds);
    //         }

    //         DB::commit();

    //         return response()->json([
    //             'message'  => 'Category updated successfully',
    //             'category' => $category->load('users:id,name,email')
    //         ]);
    //     } catch (\Throwable $e) {
    //         DB::rollBack();
    //         return response()->json([
    //             'message' => 'Update failed',
    //             'error'   => $e->getMessage()
    //         ], 500);
    //     }
    // }

    // public function updateStatus(Request $request, Category $category)
    // {
    //     // Vẫn dùng policy 'update' vì đây là thay đổi dữ liệu/trạng thái
    //     $this->authorize('update', $category);
    //     $request->validate([
    //         'status' => 'required|in:active,inactive'
    //     ]);
        
    //     $category->update(['status' => $request->status]);

    //     return response()->json([
    //         'message' => 'Cập nhật trạng thái thành công',
    //         'status'  => $category->status,
    //     ]);
    // }

//    public function show($id)
//     {
//         $category = Category::with('users')->findOrFail($id);
//         $this->authorize('view', $category);

//         return response()->json([
//             'message' => 'Chi tiết danh mục',
//             'category' => $category
//         ]);
        
//     }

    // public function destroy(Category $category)
    // {
    //     // 1. Kiểm tra quyền (vẫn dùng policy 'delete' như cũ)
    //     $this->authorize('delete', $category);

    //     // 2. Thực hiện "xóa mềm"
    //     try {
    //         // Thay vì $category->delete();
    //         $category->status = 'inactive';
    //         $category->save();

    //         // 3. Trả về thông báo thành công
    //         return response()->json([
    //             'message' => 'Đã cập nhật trạng thái danh mục thành Tạm ngưng (inactive).'
    //         ]);

    //     } catch (\Throwable $e) {
    //         // 4. Trả về lỗi nếu có sự cố
    //         return response()->json([
    //             'message' => 'Failed to update category status.',
    //             'error'   => $e->getMessage()
    //         ], 500);
    //     }
    // }

    public function index()
    {
        try {
            $userCode = auth()->payload()->get('code');

            $categories = Category::query()
                // 1. LỌC: Chỉ lấy danh mục mà TÔI được phép xem (Giữ bảo mật)
               
                // 2. LOAD QUAN HỆ: Tải TOÀN BỘ user thuộc danh mục này
                // (QUAN TRỌNG: Không được where UserCode ở đây nữa, để nó load hết mọi người)
                ->with('users') 
                ->orderBy('Description', 'asc')
                ->get();

            // 3. XỬ LÝ DỮ LIỆU
            $data = $categories->map(function ($cat) use ($userCode) {
                
                // A. Lấy danh sách Email của TẤT CẢ mọi người trong danh mục này
                // pluck('email') sẽ lấy cột email ra thành một mảng: ['a@test.com', 'b@test.com']
                $userEmails = $cat->users->pluck('email')->filter()->values();

                // B. Tìm Status của CHÍNH TÔI (để hiển thị nút xanh/đỏ active)
                // Vì danh sách users bây giờ có nhiều người, ta phải tìm đúng mình
                $me = $cat->users->firstWhere('code', $userCode); 
                $myStatus = $me ? $me->pivot->Status : 1;

                return [
                    'id'          => $cat->Code,
                    'name'        => $cat->Description,
                    'description' => $cat->Description,
                    
                    // Status của riêng user đang đăng nhập
                    'status'      => $myStatus == 1 ? 'active' : 'inactive',
                    
                    'prefix'      => 'CAT',
                    
                    // Danh sách toàn bộ user được phân quyền (để hiển thị trong Modal hoặc Tooltip)
                    'users' => $userEmails, 
                ];
            });

            return response()->json([
                'message' => 'Danh sách danh mục',
                'categories' => $data
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        try {
            $myUserCode = auth()->payload()->get('code');

            // 1. TÌM CATEGORY THEO ID
            $category = Category::query()
                ->where('Code', $id) // Tìm theo Code (Vd: '001')
                
                // 3. LOAD DỮ LIỆU: Tải 'users' để lấy danh sách email và status
                ->with('users') 
                ->first();

            if (!$category) {
                return response()->json(['message' => 'Không tìm thấy danh mục hoặc bạn không có quyền truy cập'], 404);
            }

            // 4. XỬ LÝ DỮ LIỆU (Giống hệt hàm index)
            
            // A. Lấy danh sách Email của TẤT CẢ mọi người
            $userEmails = $category->users->pluck('email')->filter()->values();

            // B. Tìm Status của CHÍNH TÔI
            $me = $category->users->firstWhere('code', $myUserCode);
            $myStatus = $me ? $me->pivot->Status : 0;

            $data = [
                'id'          => $category->Code,
                'name'        => $category->Description,
                'description' => $category->Description,
                
                // Status của riêng user đang đăng nhập
                'status'      => $myStatus == 1 ? 'active' : 'inactive',
                
                // Prefix giả lập
                'prefix'      => 'CAT',
                
                // QUAN TRỌNG: Trả về danh sách email để Modal hiển thị
                'users' => $userEmails, 
            ];

            // Trả về key 'data' vì Frontend (Resource) thường bọc trong data
            // Hoặc trả trực tiếp $data tùy vào cách bạn config axios
            return response()->json([
                'message' => 'Chi tiết danh mục',
                'categories'    => $data 
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }
    
    // GỠ BỎ: Bỏ qua các hàm store/update/destroy vì view là Read-Only
    public function store(Request $request) { return response()->json(['message' => 'Chức năng này không được hỗ trợ'], 403); }
    public function update(Request $request, $id) { return response()->json(['message' => 'Chức năng này không được hỗ trợ'], 403); }
    public function destroy($id) { return response()->json(['message' => 'Chức năng này không được hỗ trợ'], 403); }


}
