import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Search, RotateCcw, Edit, Eye, Package, Clock, CheckCircle,
  XCircle, AlertCircle, GitMerge, Upload, HandCoins,Download,CheckSquare,Square,
 Split, Filter,
} from 'lucide-react'; 
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { OrderPayload, OrderFromAPI } from './OrderModal';
import OrderModal from './OrderModal';
import { getCurrentUser } from '../../utils/auth';
import { useLocation } from 'react-router-dom';
import MySwal from '../../utils/swal';
import { getStatConfig } from '../../utils/orderStatusMapping';
import toast from 'react-hot-toast';

interface OrderItem {
  productCode: string;
  productName: string;
  quantity: number;
  quantity_old: number;
  price: number;
  color: string;
}

interface StatusOption {
  ID: number;
  Name: string;
  Type: number;
}

interface Order {
  id: string;
  orderNumber: string;
  supplier_name: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status_name: string;
  status: number;
  shippingAddress: string;
  orderDate: string;
  estimatedDelivery: string;
  notes: string;
}

interface OrdersPageProps {
  mode: 'normal' | 'merged'|'completed';
  filterType?: string;
}



const OrdersPage: React.FC<OrdersPageProps> = ({ mode, filterType }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [importIndustryId, setImportIndustryId] = useState<string>('');
  const { searchTerm: initialSearch } = location.state || {};
  const [search, setSearch] = useState(initialSearch || '');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allStatuses, setAllStatuses] = useState<StatusOption[]>([]);
  const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    revenue: 0
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {

      const endpoint = mode === 'merged' ? '/merge-orders' : '/orders';

      const params = {
        page,
        q: search,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        limit: 6,
        group: filterType
      };
      const res = await api.get(endpoint, { params });
      const mappedOrders: Order[] = res.data.data.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        supplier_name: o.supplier_name || 'N/A',
        customerName: o.customer_name,
        intendedUse: o.intended_use,
        total: o.total_amount ?? o.total ?? 0,
        status: Number(o.status),
        status_name: o.status_name,
        orderDate: o.created_at || o.order_date,
        itemsCount: o.items_count,
        items: o.items ? o.items.map((i: any) => ({
          id: i.id,
          productCode: i.product_code,
          productName: i.product_name,
          quantity: i.quantity,
          quantityOld: i.quantity_old,
          price: i.price || 0,
          total: i.total ?? 0
        })) : []
      }));

      setOrders(mappedOrders);
      setLastPage(res.data.last_page);

    } catch (error) {
      console.error("Failed to fetch orders", error);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
    console.log(currentUser.role.name_role);
    console.log(currentUser.department.name_department);
  };



  const loadStats = async () => {
    try {
      const endpoint = mode === 'merged' ? '/merge-orders/stats' : '/orders/stats';

      const params = {
        group: filterType
      };

      const res = await api.get(endpoint, { params });

      setStats({
        total: res.data.total_orders,
        pending: res.data.pending_orders,
        processing: res.data.processing_orders,
        revenue: res.data.total_revenue
      });
    } catch (error) {
      console.error("Lỗi tải thống kê", error);
    }
  };
  useEffect(() => {
    const fetchCategories = async () => {
      try {

        const res = await api.get('/categories');

        setCategories(res.data.categories || []);
      } catch (e) {
        console.error("Lỗi tải danh mục", e);
      }
    };
    fetchCategories();
  }, []);

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderFromAPI | null>(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);


  const filteredOrders = useMemo(() => {
    let temp = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      temp = temp.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.supplier_name.toLowerCase().includes(q)
      );
    }
    return temp;
  }, [orders, search]);


  const getStatusIcon = (statusId: number) => {
    switch (statusId) {
      case 1:
        return <Clock className="h-4 w-4" />;
      case 2:
      case 6:
      case 10:
        return <AlertCircle className="h-4 w-4" />;
      case 3:
      case 7:
      case 13:
        return <CheckCircle className="h-4 w-4" />;
      case 5:
        return <XCircle className="h-4 w-4" />;
      case 9:
      case 15:
        return <Package className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 1:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 2:
      case 6:
      case 10:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 3:
      case 7:
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 4:
      case 8:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 9:
      case 11:
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 5:
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-gray-500 bg-gray-400/10 border-gray-400/30';
    }
  };

  const handleAddOrder = () => {
    setEditingOrder(null);
    setReadOnlyMode(false);
    setShowModal(true);
  };

  const handleEditOrder = async (order: Order, readOnly = false) => {
    try {
      const orderId = order.id || order.orderNumber;
      const isMergeOrder = orderId?.toString().startsWith('MP'); // Check tiền tố MP
      const url = isMergeOrder
        ? `/merge-orders/${orderId}`
        : `/orders/${orderId}`;
      const res = await api.get(url);
      const apiOrder = res.data.order;

      const orderFromAPI: OrderFromAPI = {
        ...apiOrder,
        orderNumber: apiOrder.order_number,
        supplierName: apiOrder.supplier_name ?? '',
        paymentStatus: apiOrder.payment_status,
        intendedUse: apiOrder.intended_use,
        orderDate: apiOrder.order_date,
        estimatedDelivery: apiOrder.estimated_delivery ?? '',
        notes: apiOrder.notes ?? '',
        subtotal: Number(apiOrder.subtotal),
        total: Number(apiOrder.total_amount),
        source_orders: apiOrder.source_orders || [],
        items: apiOrder.items.map((it: any) => ({
          id: it.id,
          product: {
            id: it.product.id || '',
            code: it.product?.code || '',
            name: it.product?.name || '',
            price: Number(it.product?.price || 0),
            color: it.product?.color,
            unit: it.unit || it.product?.unit,
          },
          quantity: Number(it.quantity),
          quantityOld: Number(it.quantity_old),
          price: Number(it.unit_price),
          erpPrice: Number(it.erp_price),
          unit:it.unit,
        }))
      };
      setReadOnlyMode(readOnly);
      setEditingOrder(orderFromAPI);
      setShowModal(true);
      toast.success('Đơn hàng đã được tải thành công!');
    } catch (err) {
      toast.error('Không thể tải đơn hàng từ server');
    }
  };
  
  useEffect(() => {
  // 1. Kiểm tra xem có lệnh mở đơn từ Session không
  const autoOpenCode = sessionStorage.getItem('AUTO_OPEN_ORDER_CODE');

  if (autoOpenCode) {
    console.log("Tìm thấy lệnh mở đơn:", autoOpenCode);
    const fakeOrderObj = { id: autoOpenCode, orderNumber: autoOpenCode } as any;
    handleEditOrder(fakeOrderObj);
    sessionStorage.removeItem('AUTO_OPEN_ORDER_CODE');
  }
}, []);

  const handleDeleteOrder = async (order: Order) => {
    const result = await MySwal.fire({
      title: 'Bạn có chắc muốn xóa?',
      text: `Đơn hàng ${order.orderNumber} sẽ bị xóa`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;
    try {
      const res = await api.delete(`/orders/${order.orderNumber}`);
      toast.success('Đã xóa đơn hàng');
      fetchOrders();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Xóa thất bại';
      toast.error(message);
    }
  };



  const handleSaveOrder = async (orderData: OrderPayload) => {
    if (editingOrder) {
      try {
        const isMergeOrder = editingOrder.orderNumber.startsWith('MP') || editingOrder.orderNumber.startsWith('MP');
        const url = isMergeOrder
          ? `/merge-orders/${editingOrder.orderNumber}`
          : `/orders/${editingOrder.orderNumber}`;
        const res = await api.put(url, orderData);
        fetchOrders();
        setShowModal(false);
        toast.success('Cập nhật đơn hàng thành công!');
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Cập nhật đơn hàng thất bại');
      }
    }
    else {
      try {
        const payload = {
          orderDate: orderData.orderDate,
          supplier_name: orderData.supplier_name,
          industry_id: orderData.industry_id,
          intended_use: orderData.intended_use,
          status: orderData.status,
          estimated_delivery: orderData.estimated_delivery,
          notes: orderData.notes,
          items: orderData.items.map(it => ({
            productCode: it.productCode,
            quantity: it.quantity,
            quantity_old: it.quantity_old,
            productName: it.productName,
            price: it.price,
            color: it.variant ,
          })),
        };
        await api.post('/orders', payload);
        fetchOrders();
        setShowModal(false);
        toast.success('Tạo đơn hàng thành công!');
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Tạo đơn hàng thất bại');
      }
    }
  };
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const isSelectable = (order: any) => {
    const status = Number(order.status);
    if (mode === 'normal') {
      return status === 7;
    }
    if (mode === 'merged' || mode === 'completed') {
      return [3, 4, 11].includes(status);
    }
    
    return false;
  };
  const eligibleOrders = useMemo(() => {
    return orders.filter(o => isSelectable(o));
  }, [orders, mode]);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };
  const isHeaderChecked = eligibleOrders.length > 0 && 
                          eligibleOrders.every(o => selectedOrders.includes(o.id));
  const handleSelectAll = () => {
    if (isHeaderChecked) {
      const currentIds = eligibleOrders.map(o => o.id);
      setSelectedOrders(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      const newIds = eligibleOrders.map(o => o.id);
      setSelectedOrders(prev => Array.from(new Set([...prev, ...newIds])));
    }
  };
  const handleMergeOrders = async () => {
    // 1. Kiểm tra có đơn trùng không
    try {
      // Show loading
      MySwal.fire({ title: 'Đang kiểm tra...', didOpen: () => MySwal.showLoading() });

      const checkRes = await api.post('/orders/check-merge', { order_ids: selectedOrders });
      const existingMerges = checkRes.data.existing_merges || [];

      let targetMergeId = null;

      // 2. Nếu có đơn trùng -> Hiển thị bảng chọn
      if (existingMerges.length > 0) {
        // Đóng loading cũ
        MySwal.close();

        const { value: selectedMerge } = await MySwal.fire({
          title: 'Tìm thấy Đơn Gộp khả dụng',
          html: `
              <div class="text-left">
                  <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
                      Nhà cung cấp <b class="text-gray-900 dark:text-white">${checkRes.data.supplier}</b> đang có các đơn gộp chờ xử lý. 
                      <br/>Bạn có muốn gộp vào không?
                  </p>

                  <div class="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                      ${existingMerges.map((m: any) => `
                          <label class="flex items-center p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors 
                              hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              
                              <input type="radio" name="merge_choice" value="${m.DocumentNo}" 
                                  class="mr-3 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500 dark:bg-gray-700 focus:ring-blue-500">
                              
                              <div>
                                  <div class="font-bold text-gray-800 dark:text-gray-100">${m.DocumentNo}</div>
                                  <div class="text-xs text-gray-500 dark:text-gray-400">
                                      Ngày tạo: ${new Date(m.CreatedDate || m.PostingDate).toLocaleDateString('vi-VN')}
                                  </div>
                                  <div class="text-xs text-gray-500 dark:text-gray-400 italic truncate max-w-xs opacity-80">
                                      ${m.Note || 'Không có ghi chú'}
                                  </div>
                              </div>
                          </label>
                      `).join('')}

                      <label class="flex items-center p-3 cursor-pointer transition-colors
                          bg-blue-50/50 hover:bg-blue-100/50
                          dark:bg-blue-900/20 dark:hover:bg-blue-900/40">
                          
                          <input type="radio" name="merge_choice" value="NEW" checked
                              class="mr-3 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-500 dark:bg-gray-700 focus:ring-blue-500">
                          
                          <div class="font-bold text-blue-700 dark:text-blue-400">
                              ➕ Tạo Đơn Gộp Mới
                          </div>
                      </label>
                  </div>
              </div>
          `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Tiếp tục',
          cancelButtonText: 'Hủy bỏ',
          preConfirm: () => {
            // Lấy giá trị radio được chọn
            const selected = document.querySelector('input[name="merge_choice"]:checked') as HTMLInputElement;
            return selected ? selected.value : null;
          }
        });

        if (!selectedMerge) return; // Hủy bỏ

        if (selectedMerge !== 'NEW') {
          targetMergeId = selectedMerge;
        }
      }
      else {
        const confirm = await MySwal.fire({
          title: 'Xác nhận gộp đơn?',
          text: `Bạn sẽ tạo đơn gộp mới từ ${selectedOrders.length} đơn PO.`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Gộp ngay'
        });
        if (!confirm.isConfirmed) return;
      }

      MySwal.fire({ title: 'Đang xử lý gộp...', didOpen: () => MySwal.showLoading() });

      await api.post('/orders/merge', {
        order_ids: selectedOrders,
        target_merge_id: targetMergeId 
      });

      await MySwal.fire('Thành công!', 'Đã gộp đơn hàng.', 'success');

      setSelectedOrders([]);
      fetchOrders();

    } catch (error: any) {
      MySwal.fire('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };
  const handleUnmerge = async (mergeId: string) => {
    // 1. Hiển thị Popup xác nhận (Giao diện Darkmode chuẩn)
    console.log("ID gửi lên server:", mergeId);
    const result = await MySwal.fire({
      title: 'Hủy Đơn Gộp?',
      html: `
        <div class="text-left">
            <p class="mb-4 text-base text-gray-700 dark:text-gray-300">
                Bạn có chắc chắn muốn xóa đơn gộp <b class="text-gray-900 dark:text-white font-bold">${mergeId}</b> không?
            </p>
            
            <div class="p-4 rounded-xl border bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20">
                <p class="text-sm font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    ⚠️ Lưu ý quan trọng:
                </p>
                <ul class="list-disc pl-5 text-sm text-red-800/80 dark:text-red-200/70 space-y-1">
                    <li>Đơn gộp <span class="font-semibold">${mergeId}</span> sẽ bị xóa vĩnh viễn.</li>
                    <li>Các đơn con sẽ được hoàn trả về trạng thái <span class="font-bold text-red-700 dark:text-red-400">Chốt</span>.</li>
                </ul>
            </div>
        </div>
        `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33', // Màu đỏ cho hành động xóa
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Đồng ý hủy',
      cancelButtonText: 'Giữ lại'
    });
  
    // Nếu người dùng bấm Cancel thì dừng lại
    if (!result.isConfirmed) return;
  
    try {
      // 2. Show loading
      MySwal.fire({ 
          title: 'Đang hủy đơn...', 
          didOpen: () => MySwal.showLoading() 
      });
  
      await api.delete(`/orders/merge/${mergeId}`);
  
      await MySwal.fire(
        'Đã hủy!',
        'Đơn gộp đã được xóa thành công. Các PO đã quay về trạng thái Chốt.',
        'success'
      );     
      fetchOrders();
    } catch (error: any) {
      // 6. Xử lý lỗi
      MySwal.fire(
        'Lỗi',
        error.response?.data?.message || 'Không thể hủy đơn gộp này.',
        'error'
      );
    }
  };
  const handleExportOrders = async () => {
    try {
      const res = await api.post(
        '/export-order',
        { order_ids: selectedOrders },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'orders.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xuất đơn thất bại');
    }
  };

  const handleImportOrders = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!importIndustryId) {
      toast.error("Vui lòng chọn Ngành hàng trước!");
      event.target.value = ''; // Reset input file
      return;
    }
    MySwal.fire({
      title: 'Đang xử lý...',
      text: 'Đang đọc file Excel và tạo đơn hàng...',
      didOpen: () => MySwal.showLoading()
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('industry_id', importIndustryId);


      const res = await api.post('/orders/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await MySwal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: res.data.message
      });
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Lỗi khi import file";

      await MySwal.fire({
        icon: 'error',
        title: 'Lỗi Import',
        text: msg
      });
    } finally {
      event.target.value = '';
    }
  };
  const handleBatchExportZip = async () => {
    if (selectedOrders.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 đơn hàng để xuất.");
      return;
    }

    try {
      MySwal.fire({
        title: 'Đang nén file...',
        text: `Đang tạo file ZIP cho ${selectedOrders.length} đơn hàng. Vui lòng đợi...`,
        didOpen: () => MySwal.showLoading(),
        allowOutsideClick: false
      });

      const response = await api.post('/orders/export-zip', {
        order_ids: selectedOrders
      }, {
        responseType: 'blob' 
      });

      // Tạo link tải ảo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Batch_Orders_${dateStr}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      MySwal.close();
      toast.success("Tải xuống thành công!");
      setSelectedOrders([]); // Reset sau khi tải xong

    } catch (error) {
      console.error(error);
      MySwal.fire('Lỗi', 'Không thể xuất file ZIP. Vui lòng thử lại.', 'error');
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);
  useEffect(() => {
    setOrders([]);
    setSelectedOrders([]);
    loadStats();
    if (mode === 'normal' || mode === 'merged') {
      fetchOrders();
    }
  }, [mode, page, refreshKey, currentUser, search, filterType,selectedStatus]);
  const reloadList = () => {
    setRefreshKey(prev => prev + 1);
  };

  const role = currentUser?.role?.name_role;
  const dept = currentUser?.department?.name_department;
  const config = getStatConfig(role, dept);
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await api.get('order-statuses');
        setAllStatuses(res.data);
      } catch (error) {
        console.error("Lỗi lấy danh sách trạng thái", error);
      }
    };
    fetchStatuses();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [mode])



  const renderPagination = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= lastPage; i++) {
      if (i === 1 || i === lastPage || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l !== 1) rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots.map((pageNum, index) => (
      pageNum === '...' ? (
        <span key={`dots-${index}`} className="px-3 py-1 text-gray-400">...</span>
      ) : (
        <button
          key={pageNum}
          onClick={() => setPage(Number(pageNum))}
          className={`px-3 py-1 rounded text-sm ${pageNum === page ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300'
            }`}
        >
          {pageNum}
        </button>
      )
    ));
  };
    const viewVendor = ['Supply','Leader'].includes(role);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-glass-dark transition-all duration-300">        <div>
        <h1 className="text-3xl font-bold text-bitex-primary dark:text-white">
          Order Management
        </h1>
      </div>
        <div className='flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto'>
          <button
            onClick={handleAddOrder}
            className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"

          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Tạo đơn</span>
            <span className="sm:hidden">Create</span>
          </button>
          <button
            onClick={() => { reloadList(); setPage(1) }}
            className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
          >
            <RotateCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải đơn</span>
          </button>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Tổng đơn', val: stats.total, icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: config.pending.label, val: stats.pending, icon: config.pending.icon, color: config.pending.color, bg: config.pending.bg },
          { label: config.processing.label, val: stats.processing, icon: config.processing.icon, color: config.processing.color, bg: config.processing.bg },
          { label: 'Thành Tiền', val: stats.revenue.toLocaleString(), icon: HandCoins, color: 'text-green-400', bg: 'bg-green-500/10', isCurrency: true }
        ].map((stat, idx) => (
          <div key={idx} className="glass-panel glass-panel-dark p-4 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <p className="text-blue-500 dark:text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.val} {stat.isCurrency ? '₫' : ''}
                </h3>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={`rounded-2xl p-3 sm:p-6 border transition-all duration-300 ${theme === 'light' ? 'bg-white shadow-sm border-gray-200' : 'glass-panel glass-panel-dark border-white/5'
        }`}>
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:space-x-4">

          {/* Search */}
          <div className="relative flex-1 md:flex-none group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            />
          </div>

          {mode === 'normal' && selectedOrders.length > 0 && (
            <div className='flex items-center space-x-4 mb-4 lg:mb-0 animate-fade-in-up'>
              <button
                onClick={handleMergeOrders}
                className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base shadow-lg"
              >
                <GitMerge className="h-5 w-5" />
                <span className="hidden sm:inline">Gộp {selectedOrders.length} đơn đã chọn</span>
              </button>
            </div>
          )}
          {(mode === 'merged' || mode === 'completed') && selectedOrders.length > 0 && (
              <div className='flex items-center space-x-4 mb-4 lg:mb-0 animate-fade-in-up'>
                <button
                  onClick={handleBatchExportZip}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all shadow-lg animate-fade-in"
                >
                  <Download className="h-4 w-4" />
                  <span>Xuất PDF ({selectedOrders.length})</span>
                </button>
              </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* 1. Select Ngành hàng */}
            <select
              value={importIndustryId}
              onChange={(e) => setImportIndustryId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
            >
              <option value="">-- Chọn ngành nhập Excel --</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* 2. Input File ẩn */}
            <input type="file" ref={fileInputRef} onChange={handleImportOrders} accept=".csv,.txt,.xlsx" className="hidden" />

            {/* 3. Nút Import */}
            <button
              onClick={() => {
                if (!importIndustryId) { toast.error("Vui lòng chọn Ngành hàng trước!"); return; }
                fileInputRef.current?.click();
              }}
              title='[ProductCode] , [ProductName], [Quantity], [Price] , [Supplier] , [Variant] , [IntendedUse] , [Note] , [DeliveryDate]'
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-green-500/30"
            >
              <Upload className="w-4 h-4" />
              <span>Tạo nhiều đơn</span>
            </button>

            {/* 4. Select Status */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base transition-all appearance-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                {allStatuses.map(status => (
                  <option key={status.ID} value={status.Type}>{status.Name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Orders Table (Sửa lại màu sắc cho Dark/Light) */}
      <div className={`rounded-2xl overflow-hidden border transition-all duration-300 relative flex flex-col ${theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'glass-panel glass-panel-dark border-white/5'
        }`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className={`border-b ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/50 border-gray-700/50'}`}>
              <tr>
                <th className="text-left p-2 sm:p-4 text-gray-500 dark:text-gray-300 font-medium text-xs sm:text-sm w-12">
                  {eligibleOrders.length > 0 && (
                    <input
                      type="checkbox"
                      checked={isHeaderChecked}
                      onChange={handleSelectAll}
                      className="flex items-center gap-2 form-checkbox text-blue-500 h-5 w-5 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                  )}
                </th>
                <th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Mã đơn</th>
                {viewVendor && (<th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Nhà cung cấp</th>)}
                <th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Mặt hàng</th>
                <th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Đơn giá</th>
                <th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Trạng thái</th>
                <th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Ngày tạo</th>
                <th className="text-left p-2 sm:p-4 text-blue-500 dark:text-gray-300 font-medium text-xs sm:text-sm">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const canSelect = isSelectable(order);
                return (
                  <tr key={order.id} className="border-b border-blue-100 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-2 sm:p-4">
                      {canSelect && (
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="form-checkbox text-blue-500 h-5 w-5 rounded bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      )}
                    </td>
                    <td className="p-2 sm:p-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">{order.orderNumber}</p>
                        </div>
                      </div>
                    </td>
                   {viewVendor && (
                    <td className="p-2 sm:p-4">
                      <p className="text-gray-900 dark:text-white text-xs sm:text-sm">{order.supplier_name}</p>
                    </td>
                    )}
                    
                    <td className="p-2 sm:p-4">
                      <div>
                        <p className="text-gray-900 dark:text-white text-xs sm:text-sm">{order.items.length} item(s)</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                          {order.items[0]?.productName}
                          {order.items.length > 1 && ` +${order.items.length - 1} more`}
                        </p>
                      </div>
                    </td>
                    <td className="p-2 sm:p-4 text-gray-900 dark:text-white font-semibold text-xs sm:text-sm">{order.total.toLocaleString()} VNĐ</td>
                    <td className="p-2 sm:p-4">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border w-fit ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{order.status_name.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:p-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN') : ''}</td>
                    <td className="p-2 sm:p-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditOrder(order, true)}
                          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-500/10 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title="tách đơn "
                          onClick={() => handleUnmerge(order.orderNumber)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        >

                          <Split className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-blue-500 dark:text-gray-400">No orders found matching your criteria</p>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className={`flex flex-col sm:flex-row justify-center items-center gap-4 py-6 border-t ${theme === 'light' ? 'border-gray-200' : 'border-gray-700/50'}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-sm bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >Prev</button>
              {renderPagination()}
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-3 py-1 rounded text-sm bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >Next</button>
            </div>
          </div>
        )}
      </div>




      {/* Order Modal */}
      {showModal && (
        <OrderModal
          order={editingOrder}
          onSave={handleSaveOrder}
          onClose={() => setShowModal(false)}
          readOnly={readOnlyMode}
          currentUser={currentUser}
          opUpdate={fetchOrders}
        />
      )}
    </div>
  );
};

export default OrdersPage;
