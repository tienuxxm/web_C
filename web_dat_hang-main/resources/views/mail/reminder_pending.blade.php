<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
        th { background-color: #0284c7; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h4 { margin-bottom: 5px; margin-top: 20px; color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 5px; }
        
        /* Style cho nút nhỏ trong bảng */
        .btn-sm {
            background-color: #16a34a; 
            color: white !important; 
            padding: 5px 10px; 
            text-decoration: none; 
            border-radius: 4px; 
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            white-space: nowrap;
        }
        .btn-sm:hover { background-color: #15803d; }
    </style>
</head>
<body>
    @php
        // Lấy URL Frontend từ .env (Mặc định local nếu chưa cấu hình)
        // Ví dụ: http://171.244.205.210:8500/web_dat_hang-main
        $feUrl = config('app.frontend_url');        
        $countPO = $pendingOrders ? $pendingOrders->count() : 0;
        $countMP = $pendingMergeOrders ? $pendingMergeOrders->count() : 0;
        $totalCount = $countPO + $countMP;
    @endphp

    <h3>Xin chào {{ $user->name }},</h3>
    <p>Bạn có <strong>{{ $totalCount }}</strong> đơn hàng đang chờ xử lý. Vui lòng kiểm tra chi tiết:</p>
    
    {{-- 1. BẢNG ĐƠN HÀNG THƯỜNG (PO) --}}
    @if($countPO > 0)
        <h4>Danh sách Đơn đặt hàng (PO)</h4>
        <table>
            <thead>
                <tr>
                    <th width="20%">Mã đơn</th>
                    <th width="20%">Ngày tạo</th>
                    <th width="25%">Tổng tiền</th>
                    <th width="20%">Trạng thái</th>
                    <th width="15%" style="text-align: center;">Hành động</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($pendingOrders as $order)
                <tr>
                    <td><strong>{{ $order->DocumentNo }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($order->PostingDate ?? $order->CreatedDate)->format('d/m/Y') }}</td>
                    <td>
                        {{-- Giả sử relation items đã load --}}
                        <strong>{{ number_format($order->items->sum(fn($i) => $i->Quantity * $i->Price), 0, ',', '.') }} đ</strong>
                    </td>
                    <td>
                        {{-- Hiển thị trạng thái đơn giản nếu chưa có component --}}
                        @include('mail.status_label', ['status' => $order->Status])
                    </td>
                    <td style="text-align: center;">
                        {{-- LINK THẦN THÁNH --}}
                        {{-- Trỏ thẳng về FE + Token + Mã đơn --}}
                        <a href="{{ $feUrl }}/magic-auth?token={{ $token }}&redirect=/orders&open_order={{ $order->DocumentNo }}" 
                           class="btn-sm" target="_blank">
                            Xem & Duyệt
                        </a>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- 2. BẢNG ĐƠN GỘP (MERGE) --}}
    @if($countMP > 0)
        <h4>Danh sách Đơn gộp (Merge)</h4>
        <table>
            <thead>
                <tr>
                    <th width="20%">Mã phiếu</th>
                    <th width="20%">Ngày tạo</th>
                    <th width="25%">Tổng tiền</th>
                    <th width="20%">Trạng thái</th>
                    <th width="15%" style="text-align: center;">Hành động</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($pendingMergeOrders as $mp)
                <tr>
                    <td><strong>{{ $mp->DocumentNo }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($mp->CreatedDate)->format('d/m/Y') }}</td>
                    <td>
                        <strong>{{ number_format($mp->items->sum(fn($i) => $i->Quantity * $i->Price), 0, ',', '.') }} đ</strong>
                    </td>
                    <td>
                        @include('mail.status_label', ['status' => $mp->Status])
                    </td>
                    <td style="text-align: center;">
                        {{-- LINK MERGE --}}
                        {{-- redirect=/orders-merged --}}
                        <a href="{{ $feUrl }}/magic-auth?token={{ $token }}&redirect=/orders-merged&open_order={{ $mp->DocumentNo }}" 
                           class="btn-sm" target="_blank">
                            Xem & Duyệt
                        </a>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif
    
    <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
        Hệ thống Đặt hàng Nội bộ Bitex.
    </p>
</body>
</html>