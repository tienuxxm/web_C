import React, { useEffect, useState } from 'react';
import { X, User, ArrowRight,TriangleAlert } from 'lucide-react';
import api from '../../services/api';
import MySwal from '../../utils/swal';

interface DistributionProps {
  itemId: number;
  onClose: () => void;
}

interface AllocationItem {
  po_number: string;
  sales_name: string;
  requested: number;
  allocated: number;
  note: string;
}

const DistributionModal: React.FC<DistributionProps> = ({ itemId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/merge-orders/items/${itemId}/distribution`);
        if (res.data.status === 'cancelled') {
          setIsCancelled(true);
          setData(res.data); // Vẫn set data để lấy tên sản phẩm
        } else {
          setIsCancelled(false);
          setData(res.data);
        }
      } catch (error) {
        onClose();
        MySwal.fire('Lỗi', 'Không thể tải chi tiết phân bổ', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId]);

  if (loading) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">

        {/* 1. Header (Luôn hiển thị) */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
          <div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Chi tiết Phân Bổ Hàng</h3>
            {/* Hiển thị tên SP nếu có data */}
            <p className="text-sm text-blue-600 truncate max-w-md">
              {data?.product_name || 'Đang tải...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"><X size={20} /></button>
        </div>

        {/* 2. BODY CONTENT: Xử lý các trường hợp Loading / Hủy / Có dữ liệu */}
        <div className="overflow-y-auto custom-scrollbar flex-1 relative">

          {/* TRƯỜNG HỢP 1: ĐANG TẢI */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : isCancelled ? (

            // TRƯỜNG HỢP 2: ĐƠN BỊ HỦY (Phần bạn muốn thêm)
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 px-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2 animate-bounce-slow">
                      <TriangleAlert size={30} />
                </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Đơn hàng gộp đã bị hủy
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Đơn gộp này đã bị từ chối. Do đó không có hàng hóa thực tế để phân bổ .
              </p>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 mt-2 border border-gray-200 dark:border-gray-600">
                💡 Gợi ý: Hãy kiểm tra lại trạng thái đơn hàng hoặc thực hiện chức năng <b>"Hoàn trả "</b> để xử lý lại.
              </div>
            </div>

          ) : data ? (

            // TRƯỜNG HỢP 3: CÓ DỮ LIỆU BÌNH THƯỜNG (Code cũ của bạn)
            <>
              {/* Summary Info */}
              <div className="p-4 grid grid-cols-3 gap-4 text-center border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Tổng Yêu Cầu</p>
                  <p className="text-xl font-bold text-blue-600">{data.total_demand}</p>
                </div>
                <div className="flex items-center justify-center text-gray-400">
                  <ArrowRight size={24} />
                </div>
                <div className={`p-3 rounded-lg ${data.status === 'shortage' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Thực Tế Cung Ứng</p>
                  <p className={`text-xl font-bold ${data.status === 'shortage' ? 'text-red-600' : 'text-green-600'}`}>
                    {data.total_supply}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-3">Sales / PO</th>
                      <th className="px-6 py-3 text-right">SL Yêu Cầu</th>
                      <th className="px-6 py-3 text-right">SL Giao</th>
                      <th className="px-6 py-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.distribution.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                              <User size={14} />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{row.sales_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{row.po_number}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">
                          {Number(row.requested).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {Number(row.allocated).toLocaleString()}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${row.po_number === 'KHO_DU_TRU'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800'
                            : row.requested > row.allocated
                              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
                              : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
                            }`}>
                            {row.note}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-500">Không có dữ liệu</div>
          )}
        </div>

        {/* 3. Footer (Luôn hiển thị) */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributionModal;