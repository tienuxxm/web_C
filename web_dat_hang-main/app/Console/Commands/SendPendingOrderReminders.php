<?php

namespace App\Console\Commands;

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Order;
use App\Models\MergeOrder;
use App\Mail\PendingOrderReminder;
use App\Services\AuthService; 
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Cache; 
use Carbon\Carbon;
class SendPendingOrderReminders extends Command
{
    protected $signature = 'mail:remind-pending {--user_id= : Gửi riêng cho 1 user (optional)}';
    protected $description = 'Gửi email nhắc nhở đơn hàng Pending (PO & Merge)';
    protected $authService;

    public function __construct(AuthService $authService)
    {
        parent::__construct();
        $this->authService = $authService;
    }

  public function handle()
{
    // 1. Tạo Key cache theo ngày
    $todayKey = 'mail_reminders_sent_' . Carbon::now()->format('Y-m-d');

    if (Cache::has($todayKey)) {
        $this->info('✋ Hôm nay đã gửi mail nhắc nhở rồi. Bỏ qua.');
        return;
    }

    $this->info('🚀 Bắt đầu quét đơn hàng quá hạn 3 ngày...');
    
   
    $deadline = Carbon::now()->subDays(3);

    $users = User::all();
    $countEmails = 0;

    foreach ($users as $user) {
        $pendingOrders = collect([]);      
        $pendingMergeOrders = collect([]); 
        $shouldSendEmail = false;

        // --- A. ROLE: SALES (Sửa đơn bị trả về) ---
        if ($user->isRole('Sales')) {
            $pendingOrders = Order::where('CreatedBy', $user->code)
                                  ->where('Status', 10) // 10 = Điều chỉnh
                                  // Kiểm tra: Cung ứng trả về quá 3 ngày mà chưa sửa
                                  ->where('ModifiedSupplyDate', '<=', $deadline) 
                                  ->with('items')
                                  ->get();
            
            if ($pendingOrders->count() > 0) $shouldSendEmail = true;
        }

        // --- B. ROLE: CUNG ỨNG / HÀNH CHÍNH (Xử lý đơn Mới & Nháp) ---
        elseif ($user->isInDepartment('Cung ứng') || $user->isInDepartment('Hành chính - Miền Nam')) {
            $allowedIndustries = $user->allowedIndustries()->pluck('Code')->toArray();
            
            // 1. PO Mới (Status 1): Quá 3 ngày chưa ai xem (Dựa vào ngày tạo)
            $pendingOrders = Order::whereIn('Industry', $allowedIndustries)
                                  ->where('Status', 1) 
                                  ->where('CreatedDate', '<=', $deadline) // 👈 QUÁ 3 NGÀY
                                  ->with('items')
                                  ->get();

            // 2. Merge Nháp (Status 8): Đang làm dở quá 3 ngày chưa gửi duyệt (Dựa vào ngày sửa cuối)
            // LƯU Ý: Sửa lại Status từ 3 thành 8 như comment của bạn
            $pendingMergeOrders = MergeOrder::whereIn('Industry', $allowedIndustries)
                                            ->where('Status', 8) // 8 = Đang gộp (Draft)
                                            ->where('ModifiedDate', '<=', $deadline) // 👈 QUÁ 3 NGÀY
                                            ->with('items')
                                            ->get();

            if ($pendingOrders->count() > 0 || $pendingMergeOrders->count() > 0) {
                $shouldSendEmail = true;
            }
        }

        // --- C. ROLE: LEADER (Duyệt đơn) ---
        elseif ($user->isRole('Leader') || $user->Role === 'Leader') {
            
            // 1. Duyệt Merge (Status 2): Chờ duyệt quá 3 ngày
            $pendingMergeOrders = MergeOrder::where('Status', 2) // 2 = Chờ duyệt
                                            // 👇 QUAN TRỌNG: Phải thêm điều kiện này mới lọc được đơn cũ
                                            ->where('ModifiedDate', '<=', $deadline) 
                                            ->with('items')
                                            ->get();

            // 2. Duyệt PO (Status 2): Chờ duyệt quá 3 ngày
            $pendingOrders = Order::where('Status', 2)
                                  ->where('ModifiedDate', '<=', $deadline) // 👈 Thêm điều kiện này
                                  ->with('items')
                                  ->get();

            if ($pendingMergeOrders->count() > 0 || $pendingOrders->count() > 0) {
                $shouldSendEmail = true;
            }
        }

        // --- D. GỬI MAIL ---
       if ($shouldSendEmail) {
                try {
                    
                    $rawToken = $this->authService->generateTokenOnly($user);
                    Mail::to('tienht@bitex.com.vn')->send(
                        new PendingOrderReminder($user, $pendingOrders, $pendingMergeOrders, $rawToken)
                    );
                    
                    // GỬI THẬT (Khi chạy Production thì mở dòng này, đóng dòng trên)
                    // Mail::to($user->email)->send(
                    //    new PendingOrderReminder($user, $pendingOrders, $pendingMergeOrders, $magicLink)
                    // );

                    $this->info("📧 [{$user->Role}] Gửi cho {$user->email}: PO({$pendingOrders->count()}) - MP({$pendingMergeOrders->count()})");
                    $countEmails++;
            } catch (\Exception $e) {
                $this->error("❌ Lỗi gửi cho {$user->email}: " . $e->getMessage());
            }
        }
    }

    // 3. Lưu Cache đến hết ngày hôm nay (tránh việc 5 phút sau lại gửi tiếp)
    // now()->endOfDay() sẽ trả về thời gian 23:59:59 của hôm nay
    Cache::put($todayKey, true,now()->endOfDay());
    
    $this->info("🏁 Hoàn tất. Đã gửi {$countEmails} email nhắc nhở.");
}
}