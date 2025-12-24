<!DOCTYPE html>
<html lang="vi">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Đơn Đặt Hàng - {{ $order->DocumentNo }}</title>
    <style>
        /* 1. Cấu hình Font chữ hỗ trợ Tiếng Việt */
        body {
            font-family: "DejaVu Sans", sans-serif;
            font-size: 12px;
            color: #333;
        }

        /* 2. Cấu trúc Layout */
        .container { width: 100%; margin: 0 auto; }
        
        /* Header: Logo và Thông tin công ty */
        .header-table { width: 100%; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .company-name { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #0056b3; }
        
        /* Tiêu đề Đơn hàng */
        .po-title { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
        
        /* Thông tin Nhà cung cấp & Giao hàng */
        .info-section { width: 100%; margin-bottom: 20px; }
        .info-table { width: 100%; }
        .info-table td { vertical-align: top; padding: 5px; }
        
        /* Bảng sản phẩm */
        .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .items-table th { background-color: #f0f0f0; border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; }
        .items-table td { border: 1px solid #000; padding: 8px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-bold { font-weight: bold; }

        /* Tổng tiền */
        .total-section { margin-top: 10px; text-align: right; }
        
        /* Chữ ký */
        .signature-section { margin-top: 50px; width: 100%; }
        .signature-box { width: 33%; float: left; text-align: center; }
        .signature-title { font-weight: bold; margin-bottom: 50px; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td>
                <div class="company-name">CÔNG TY CP XNK BÌNH TÂY (BITEX)</div>
                <div>Địa chỉ: ... (Điền địa chỉ công ty bạn) ...</div>
                <div>Điện thoại: ... - Email: ...</div>
            </td>
            <td class="text-right">
                <div><strong>Ngày in:</strong> {{ now()->format('d/m/Y H:i') }}</div>
                <div><strong>Người in:</strong> {{ $user_print }}</div>
            </td>
        </tr>
    </table>

    <div class="po-title">ĐƠN ĐẶT HÀNG (PURCHASE ORDER)</div>
    <div class="text-center" style="margin-bottom: 20px;">Số: <strong>{{ $order->DocumentNo }}</strong></div>

    <div class="info-section">
        <table class="info-table">
            <tr>
                <td width="50%">
                    <strong>NHÀ CUNG CẤP (SUPPLIER):</strong><br>
                    Tên: {{ $order->Supplier }}<br>
                    </td>
                <td width="50%">
                    <strong>THÔNG TIN ĐƠN HÀNG:</strong><br>
                    Ngày đặt hàng: {{ \Carbon\Carbon::parse($order->PostingDate)->format('d/m/Y') }}<br>
                    Ngày dự kiến giao: {{ \Carbon\Carbon::parse($order->ShipmentDate)->format('d/m/Y') }}<br>
                    Mục đích: {{ $order->IntendedUse }}<br>
                    Ghi chú: {{ $order->Note }}
                </td>
            </tr>
        </table>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th width="5%">STT</th>
                <th width="15%">Mã hàng</th>
                <th width="35%">Tên hàng hóa / Dịch vụ</th>
                <th width="10%">ĐVT</th>
                <th width="10%">Số lượng</th>
                <th width="10%">Đơn giá</th>
                <th width="15%">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            @php $totalAmount = 0; @endphp
            @foreach($order->items as $index => $item)
            @php 
                $lineTotal = $item->Quantity * $item->Price;
                $totalAmount += $lineTotal;
            @endphp
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td class="text-center">{{ $item->ItemCode }}</td>
                <td>
                    {{ $item->ItemName }}
                    @if($item->Variant && $item->Variant !== '000') 
                        <br><small>({{ $item->Variant }})</small> 
                    @endif
                </td>
                <td class="text-center">{{ $item->Unit }}</td>
                <td class="text-center">{{ number_format($item->Quantity, 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($item->Price, 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($lineTotal, 0, ',', '.') }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="6" class="text-right text-bold">TỔNG CỘNG (VNĐ):</td>
                <td class="text-right text-bold">{{ number_format($totalAmount, 0, ',', '.') }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-title">NGƯỜI LẬP PHIẾU</div>
            <br><br><br>
            <div>{{ $order->user->name ?? $order->CreatedBy }}</div>
        </div>
        
        <div class="signature-box">
            <div class="signature-title">TRƯỞNG BỘ PHẬN</div>
            <br><br><br>
            </div>

        <div class="signature-box">
            <div class="signature-title">DUYỆT BỞI</div>
            <div style="font-size: 10px; color: red;">(Đã ký điện tử)</div>
            <br><br>
            <div><strong>{{ $approverName }}</strong></div>
            <div>{{ now()->format('d/m/Y') }}</div>
        </div>
    </div>

</body>
</html>