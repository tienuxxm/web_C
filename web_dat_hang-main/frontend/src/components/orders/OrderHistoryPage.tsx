import React, { useState, useEffect } from 'react';
import { Search, Package, Calendar, ChevronRight, RotateCcw, Layers } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import TrackingModal from './TrackingModal';
import toast from 'react-hot-toast';

// Định nghĩa kiểu dữ liệu khớp với API trả về
interface OrderHistoryItem {
  type: 'PO' | 'MP';
  id: string; 
  created_at: string;
  delivery_date: string;
  supplier_name: string;
  total_amount: number;
  item_count: number;
  item_summary: string;
  status_code: number;
  status_name: string;
  tracking_step: number;
  created_name :string;
  merged_id: string | null;
}

const OrderHistoryPage: React.FC = () => {
  const { theme } = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState<'PO' | 'MP'>('PO');
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryItem | null>(null);

  // Fetch Data
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('orders/history', {
        params: {
          type: activeTab,
          page: page,
          limit: 6,
          q: searchTerm
        }
      });
      
      // API Laravel trả về dạng paginate object
      const data = res.data; 
      setOrders(data.data);
      setTotalPages(data.last_page);
      
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải lịch sử đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Reload khi đổi tab hoặc đổi trang
  useEffect(() => {
    fetchOrders();
  }, [searchTerm,activeTab, page]); // Search thì nên làm debounce hoặc bấm nút mới tìm

  // Helper hiển thị màu trạng thái
  const getStatusColor = (step: number) => {
    if (step === -1) return 'text-red-400 bg-red-500/10 border-red-500/30'; // Hủy
    if (step === 4) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'; // Hoàn thành
    if (step === 5) return'text-green-400 bg-green-500/10 border-green-500/30';
    if (step === 3) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    if (step === 2) return 'text-blue-400 bg-blue-500/10 border-blue-500/30'; // Đang xử lý
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'; // Mới
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* 1. Header & Filter */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${theme === 'light' ? 'bg-white shadow-sm border-gray-200' : 'glass-panel glass-panel-dark border-white/10'}`}>
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'light' ? 'text-bitex-primary' : 'text-white'}`}>
            Lịch sử đơn hàng
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Theo dõi tiến độ xử lý và vận chuyển
          </p>
        </div>

        {/* Search Box */}
        <div className="relative group w-full md:w-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders()} // Enter để tìm
              placeholder="Tìm mã đơn..." 
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <button 
             onClick={fetchOrders}
             className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
             <RotateCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Tabs Switcher */}
      <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('PO'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'PO' 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Đơn hàng (PO)
        </button>
        <button
          onClick={() => { setActiveTab('MP'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'MP' 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Đơn gộp (MP)
        </button>
      </div>

      {/* 3. Orders List */}
      <div className={`rounded-2xl border overflow-hidden relative flex flex-col ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'glass-panel glass-panel-dark border-white/10'}`}>
         
         {/* Loading Overlay */}
         {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/60 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* --- START: UPDATED TABLE STRUCTURE --- */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            {/* Header: Style giống OrdersPage */}
            <thead className={`border-b ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/50 border-gray-700/50'}`}>
              <tr>
                <th className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-14">
                  {/* Cột icon loại đơn */}
                  Type
                </th>
                <th className="p-4 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Mã đơn hàng
                </th>
                <th className="p-4 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider hidden sm:table-cell">
                  Ngày tạo
                </th>
                <th className="p-4 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="p-4 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider text-center">
                  Trạng thái
                </th>
                <th className="p-4 text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30 text-sm">
              {orders.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                     <Layers size={48} className="mx-auto mb-3 opacity-20" />
                     <p>Không tìm thấy đơn hàng nào</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                    
                    {/* Cột 1: Icon Type (PO/MP) */}
                    <td className="p-4 align-middle">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                         order.type === 'PO' 
                           ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                           : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                      }`}>
                         <Package size={16} />
                      </div>
                    </td>

                    {/* Cột 2: Mã đơn + Summary */}
                    <td className="p-4 align-middle">
                      <div>
                         <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {order.id}
                         </div>
                         <div className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate" title={order.item_summary}>
                            {order.created_name || 'Chưa có thông tin SP'}
                         </div>
                         {/* Mobile Only: Date shown here on small screens */}
                         <div className="sm:hidden text-[10px] text-gray-400 mt-1">
                            {new Date(order.created_at).toLocaleDateString('vi-VN')}
                         </div>
                      </div>
                    </td>

                    {/* Cột 3: Ngày tạo (Hidden on mobile) */}
                    <td className="p-4 align-middle hidden sm:table-cell">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                         <Calendar size={14} className="opacity-60" />
                         <span>{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>

                    {/* Cột 4: Tổng tiền */}
                    <td className="p-4 align-middle font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total_amount)}
                    </td>

                    {/* Cột 5: Trạng thái (Badge style mới) */}
                    <td className="p-4 align-middle text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.tracking_step)}`}>
                        {order.status_name}
                      </span>
                    </td>

                    {/* Cột 6: Action Button */}
                    <td className="p-4 align-middle text-right">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm active:scale-95"
                      >
                        <span className="text-xs font-medium">Chi tiết</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
       

        {/* Pagination (Nếu cần) */}
        {totalPages > 1 && (
           <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-white/10 disabled:opacity-50"
              >Prev</button>
              <span className="px-3 py-1 text-sm text-gray-500">Trang {page} / {totalPages}</span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded bg-gray-100 dark:bg-white/10 disabled:opacity-50"
              >Next</button>
           </div>
        )}
      </div>

      {/* Tracking Modal */}
      {selectedOrder && (
        <TrackingModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
};

export default OrderHistoryPage;