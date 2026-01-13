import React from 'react';
import { createPortal } from 'react-dom';
import { X, Package, Clock, Truck, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// Định nghĩa 5 bước chuẩn theo API Backend
const TRACKING_STEPS = [
  { id: 1, label: 'Mới tạo', icon: Package },
  { id: 2, label: 'Đang xử lý', icon: Clock },       // PO: Chốt, MP: Chờ duyệt
  { id: 3, label: 'Đã duyệt ', icon: FileText }, // PO: Gộp, MP: Đã duyệt
  { id: 4, label: 'Đang đặt hàng', icon: Truck },
  { id: 5, label: 'Hoàn thành', icon: CheckCircle2 },
];

interface TrackingModalProps {
  order: any;
  onClose: () => void;
}

const TrackingModal: React.FC<TrackingModalProps> = ({ order, onClose }) => {
  const { theme } = useTheme();

  // Nếu tracking_step = -1 (Hủy/Trả về), ta sẽ hiển thị giao diện báo lỗi
  const isCancelled = order.tracking_step === -1;
  const currentStep = isCancelled ? 0 : order.tracking_step;

  // Class màu sắc động
  const modalClass = theme === 'light'
    ? 'bg-white border-gray-200 shadow-2xl'
    : 'glass-panel glass-panel-dark border-white/10';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Container */}
      <div className={`relative w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col ${modalClass}`}>

        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <div>
            <h2 className={`text-xl font-bold ${theme === 'light' ? 'text-bitex-primary' : 'text-white'}`}>
              Theo dõi đơn hàng
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mã đơn: <span className="font-mono font-bold">{order.id}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">

          {/* Info Box */}
          <div className={`mb-8 p-4 rounded-xl border flex items-center gap-4 ${isCancelled
              ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-500/20'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-500/20'
            }`}>
            <div className={`p-3 rounded-full ${isCancelled
                ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
              }`}>
              {isCancelled ? <AlertCircle size={24} /> : <Truck size={24} />}
            </div>
            <div>
              <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                {isCancelled ? 'Trạng thái dừng' : 'Dự kiến giao hàng'}
              </p>
              <p className={`text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {isCancelled
                  ? `Đơn hàng đã bị ${order.status_name}`
                  : (order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('vi-VN') : 'Đang cập nhật')
                }
              </p>
            </div>
          </div>

          {/* Deep Link Info (Nếu có Merge ID) */}
          {order.merged_id && (
            <div className="mb-8 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/30 text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <FileText size={16} />
              <span>
                Đơn này đã được gộp vào đơn cha <strong>{order.merged_id}</strong>. Tiến độ sẽ theo đơn cha.
              </span>
            </div>
          )}

          {/* Timeline Visualization */}
          {isCancelled ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 text-red-500 mb-4">
                <X size={32} />
              </div>
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Quy trình bị hủy bỏ</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Đơn hàng đang ở trạng thái <strong>{order.status_name}</strong>. Vui lòng liên hệ bộ phận liên quan.
              </p>
            </div>
          ) : (
            <div className="relative pl-2">
              {TRACKING_STEPS.map((step, index) => {
                const isActive = step.id <= currentStep;
                const isCurrent = step.id === currentStep;
                const isLast = index === TRACKING_STEPS.length - 1;

                return (
                  <div key={step.id} className="flex gap-4 pb-10 last:pb-0 relative">
                    {/* Connecting Line */}
                    {!isLast && (
                      <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${isActive && currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    )}

                    {/* Icon Circle */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}>
                      <step.icon size={18} />
                    </div>

                    {/* Text Content */}
                    <div className={`pt-1 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                      <h4 className={`font-bold text-base ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-500'}`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isCurrent
                          ? (isLast ? 'Đã hoàn thành' : 'Đang thực hiện') // 👈 FIX: Nếu là bước hiện tại VÀ là bước cuối -> Hiện "Đã hoàn thành"
                          : (isActive ? 'Hoàn tất' : 'Đang chờ')
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t text-center ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
    ,
    document.body

  );
};

export default TrackingModal;