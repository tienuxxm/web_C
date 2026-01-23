<!DOCTYPE html>
<html lang="vi">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Purchase Order</title>
    <style>
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #333; }
        .header-table, .info-table, .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        
        /* Header Section */
        .company-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .vendor-info td { vertical-align: top; }
        
        /* Order Info Box */
        .order-meta {  padding: 10px; }
        .inner-table { width: 100%; border-collapse: collapse; }
        .inner-table td {  padding: 3px 0;  vertical-align: top;}
        .label-col {font-weight: bold;width: 80px; }
        .order-meta-table td { padding: 2px 5px; }
        .page-title { font-size: 24px; font-weight: bold; text-align: right; margin-top: 20px; }
        
        /* Items Table */
        .items-table th { border: 1px solid #000; padding: 5px; background-color: #eee; text-align: center; font-weight: bold; }
        .items-table td { border: 1px solid #000; padding: 5px; vertical-align: top; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .items-table thead {
            display: table-header-group; /* Lặp lại tiêu đề bảng ở mỗi trang mới */
        }
        .items-table tr {
            page-break-inside: avoid; /* Không cắt đôi dòng tr */
        }
        
        /* CSS cho Page Title */
        .page-title { 
            font-size: 24px; 
            font-weight: bold; 
            text-align: right; 
            margin-top: 20px; 
            margin-bottom: 5px; /* Tạo khoảng hở cho số trang bên dưới */
        }
        
        /* Footer */
        .footer-info td { padding: 2px 0; }
    </style>
</head>
<body>

    <table class="header-table">
        <tr>
            <td width="60%" class="vendor-info">
                <div class="company-title">{{ $vendor_name }}</div>
                <div>{{ $vendor_address }}</div>
                </td>
            
            <td width="40%" style="vertical-align: top;">

                <div class="page-title">Order</div>
                <script type="text/php">
                if (isset($pdf)) {
                    // Cấu hình Font và Size
                    $font = $fontMetrics->get_font("DejaVu Sans", "normal");
                    $size = 10;
                    
                    // Lấy tổng số trang
                    $pageText = "Page {PAGE_NUM} of {PAGE_COUNT}";
                    
                    // Tính toán vị trí (Cần căn chỉnh tọa độ X, Y cho khớp với dưới chữ Order)
                    // Tọa độ gốc (0,0) là góc trên cùng bên trái trang giấy
                    // Giả sử trang A4 rộng ~595pt. Cột phải chiếm 40% -> Canh lề phải khoảng 550pt
                    $y = 85;  // Độ cao Y (Cần test thực tế để chỉnh lên xuống)
                    $x = 505; // Độ ngang X (Canh lề phải)
                    
                    // Vẽ chữ lên PDF
                    $pdf->page_text($x, $y, $pageText, $font, $size, array(0,0,0));
                }
                </script>
            </td>
        </tr>
    </table>
    
   <table class="info-table">
        <tr>
            <td width="60%" style="vertical-align: top;">
                <div style="padding: 6px 0;"> 
                    <table class="inner-table">
                        <tr>
                            <td class="label-col">Vendor No:</td>
                            <td>{{ $vendor_code }}</td>
                        </tr>
                        <tr>
                            <td class="label-col">Purchaser:</td>
                            <td>{{ $purchaser_name }}</td>
                        </tr>
                        <tr>
                            <td class="label-col">Email:</td>
                            <td>bitex@bitex.com.vn</td>
                        </tr>
                    </table>
                </div>
            </td>

            <td width="40%" style="vertical-align: top;">
                <div class="order-meta">
                    <table class="inner-table">
                        <tr>
                            <td class="label-col">Order No.</td>
                            <td>{{ $order_number }}</td>
                        </tr>
                        <tr>
                            <td class="label-col">Date</td>
                            <td>{{ $order_date }}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th width="5%">No.</th>
                <th width="15%">Item Code</th>
                <th width="35%">Description</th>
                <th width="10%">Unit</th>
                <th width="10%">Quantity</th>
                <th width="10%">Unit Cost (VND)</th>
                <th width="15%">Amount (VND)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $index => $item)
            <tr>
                <td class="text-center">{{ $index + 1 }}</td>
                <td>{{ $item['code'] }}</td>
                <td>
                    {{ $item['name'] }}
                    @if($item['color'])
                        <br><small>(Màu: {{ $item['color'] }})</small>
                    @endif
                </td>
                <td class="text-center">{{ $item['unit'] }}</td>
                <td class="text-right">{{ number_format($item['quantity'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($item['price'], 0, ',', '.') }}</td>
                <td class="text-right">{{ number_format($item['total'], 0, ',', '.') }}</td>
            </tr>
            @endforeach
            
            <tr>
                <td colspan="6" class="text-right font-bold">Total VND</td>
                <td class="text-right font-bold">{{ number_format($total_amount, 0, ',', '.') }}</td>
            </tr>
        </tbody>
    </table>

    <div style="margin-top: 30px; font-size: 11px; text-align: center;">
    </div>

</body>
</html>