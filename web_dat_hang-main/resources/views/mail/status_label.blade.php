@if($status == 1) <span style="color: #eab308;">Mới tạo</span>
@elseif($status == 2) <span style="color: #f97316;">Chờ duyệt</span>
@elseif($status == 4) <span style="color: #3b82f6;">Đang đặt hàng</span>
@elseif($status == 8) <span style="color: #6366f1;">Đang gộp </span>
@else {{ $status }}
@endif
