<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        
        /* Style cho bảng */
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } /* Thêm margin dưới bảng */
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
        th { background-color: #0284c7; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }

        /* Tiêu đề section */
        h4 { margin-bottom: 5px; margin-top: 20px; color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 5px; }

        /* Style cho Nút bấm - Đẩy xa ra bằng margin-top */
        .btn-container { text-align: center; margin-top: 40px; margin-bottom: 20px; }
        .btn { 
            background-color: #16a34a; 
            color: white !important; 
            padding: 12px 25px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold;
            display: inline-block;
        }
        .btn:hover { background-color: #15803d; }
    </style>
</head>
<body>
    @php
        // Tính tổng số lượng đơn cần xử lý
        $countPO = $orders ? $orders->count() : 0;
        $countMP = isset($mergeOrders) ? $mergeOrders->count() : 0;
        $totalCount = $countPO + $countMP;
    @endphp

    <h3>Xin chào {{ $user->name }},</h3>
    <p>Hệ thống nhận thấy bạn còn <strong>{{ $totalCount }}</strong> đơn hàng chờ xử lý.</p>
    
    {{-- 1. BẢNG ĐƠN HÀNG THƯỜNG (PO) --}}
    @if($countPO > 0)
        <h4>Danh sách Đơn đặt hàng </h4>
        <table>
            <thead>
                <tr>
                    <th width="20%">Mã đơn</th>
                    <th width="25%">Ngày tạo</th>
                    <th width="25%">Tổng tiền</th>
                    <th width="30%">Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($orders as $order)
                <tr>
                    <td><strong>{{ $order->DocumentNo }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($order->PostingDate ?? $order->CreatedDate)->format('d/m/Y ') }}</td>
                    <td>
                        {{-- Tính tổng tiền từ Items --}}
                        <strong>{{ number_format($order->items->sum(fn($i) => $i->Quantity * $i->Price), 0, ',', '.') }} đ</strong>
                    </td>
                    <td>
                        @include('mail.status_label', ['status' => $order->Status])
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
                    <th width="25%">Ngày tạo</th>
                    <th width="25%">Tổng tiền</th>
                    <th width="30%">Trạng thái</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($mergeOrders as $mp)
                <tr>
                    <td><strong>{{ $mp->DocumentNo }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($mp->CreatedDate)->format('d/m/Y ') }}</td>
                    <td>
                        {{-- Tính tổng tiền từ Items --}}
                        <strong>{{ number_format($mp->items->sum(fn($i) => $i->Quantity * $i->Price), 0, ',', '.') }} đ</strong>
                    </td>
                    <td>
                        @include('mail.status_label', ['status' => $mp->Status])
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- Nút bấm đã được chỉnh khoảng cách --}}
    <div class="btn-container">
        <a href="http://171.244.205.210:8500/web_dat_hang-main/" class="btn">Truy cập hệ thống ngay</a>
    </div>
    
    <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
        Email này được gửi tự động từ hệ thống Bitex Order. Vui lòng không trả lời email này.
    </p>
</body>
</html>

