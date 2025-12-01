import React, { useState ,useEffect,useMemo,useRef} from 'react';
import { Plus, Search, Filter, Edit, Trash2, Eye, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

import { OrderPayload, OrderStatus, PaymentStatus,OrderFromAPI } from './OrderModal';
import OrderModal from './OrderModal'; // 👈 Nếu OrderModal.tsx nằm cùng thư mục

import { getCurrentUser } from '../../utils/auth';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

import toast from 'react-hot-toast';

interface OrderItem {
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  color:string;
}

interface Order {
  id: string;
  orderNumber: string;
  supplier_name: string; // Tùy chọn nếu có
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status_name:string;
  status: number; // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: PaymentStatus; // 'pending' | 'paid' | 'failed' | 'refunded'
  shippingAddress: string;
  orderDate: string;
  estimatedDelivery: string;
  notes: string;
  merged?: boolean; // Thêm trường này để đánh dấu đơn hàng đã được gộp
}

interface OrdersPageProps {
  mode: 'normal' | 'monthly' | 'yearly';
}





const OrdersPage: React.FC<OrdersPageProps> = ({ mode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage]     = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const { searchTerm: initialSearch } = location.state || {};
  const [search, setSearch]     = useState(initialSearch || '');
  const [totalOrders, setTotalOrders] = useState(0);
  const [monthlyOrders, setMonthlyOrders] = useState<any[]>([]);
  const [yearlyOrders, setYearlyOrders] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
 
  const mapStatus = (statusId: number): OrderStatus => {
    switch (statusId) {
      case 0: return 'draft';     // 0: Nháp
      case 1: return 'pending';   // 1: Chờ duyệt (Released)
      case 2: return 'approved';  // 2: Đã duyệt
      case 3: return 'rejected';  // 3: Từ chối
      default: return 'pending';  // Mặc định
    }
  };
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    revenue: 0
});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        q: search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      
      const res = await api.get('/orders', { params });
      console.log("🔍 API Response Raw:", res.data.data[0]);
      // LOGIC MAPPING QUAN TRỌNG: Backend (snake_case) -> Frontend (camelCase)
      const mappedOrders: Order[] = res.data.data.map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,      // Map: order_number -> orderNumber
        supplier_name: o.supplier_name,    // Map: supplier_name -> supplierName
        customerName: o.customer_name,    // Map: customer_name -> customerName
        intendedUse: o.intended_use,      // Map: intended_use -> intendedUse
        total: o.total_amount,      // Map: total_amount -> totalAmount
        status: Number(o.status),      // Map: 1 -> 'pending'
        status_name: o.status_name,
        orderDate: o.created_at,          // Map: created_at -> orderDate
        itemsCount: o.items_count,
        
        // Map Items bên trong
        items: o.items ? o.items.map((i: any) => ({
          productCode: i.product_code,
          productName: i.product_name,
          quantity: i.quantity,
          price: i.price||0,
          total: i.total
        })) : []
      }));

      setOrders(mappedOrders);
      setLastPage(res.data.last_page); // Cập nhật số trang cuối
    } catch (error) {
      console.error("Failed to fetch orders", error);
      toast.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  // 2. Viết hàm load riêng
const loadStats = async () => {
    try {
        const res = await api.get('/orders/stats');
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

// 3. Gọi hàm này trong useEffect (chạy 1 lần khi mount)

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderFromAPI | null>(null);
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const statuses = ['all', 'draft', 'pending', 'approved', 'rejected', 'fulfilled', 'inactive'];
  const paymentStatuses = ['all', 'pending', 'paid', 'failed', 'refunded'];

 const filteredOrders = useMemo(() => {
  let temp = orders;
      // search
      if (search.trim()) {
        const q = search.toLowerCase();
        temp = temp.filter(o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.supplier_name.toLowerCase().includes(q)
        );
      }

      // status filter
      // if (selectedStatus !== 'all') {
      //   temp = temp.filter(o => o.status === selectedStatus);
      // }

      // payment filter
      if (selectedPaymentStatus !== 'all') {
        temp = temp.filter(o => o.paymentStatus === selectedPaymentStatus);
      }

      return temp;
    }, [orders, search, selectedStatus, selectedPaymentStatus]);



  const getStatusIcon = (statusId: number) => {
  switch (statusId) {
    case 1:
      return <Clock className="h-4 w-4" />;
    case 2:
    case 6:
    case 10 :
      return <AlertCircle className="h-4 w-4" />;
    case 3: // Đã duyệt (Approved)
    case 7: // Chốt
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
      case 10 :
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 3: // Đã duyệt (Approved)
      case 7: // Chốt
      case 13: // Chốt (Duplicate?)
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 4: // Đang đặt hàng
      case 8: // Merge
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';  
      case 9:
      case 15:
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 5:
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
      return 'text-gray-500 bg-gray-400/10 border-gray-400/30';
    }
  };

  // const getPaymentStatusColor = (status: Order['paymentStatus']) => {
  //   switch (status) {
  //     case 'pending':
  //       return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  //     case 'paid':
  //       return 'text-green-400 bg-green-500/10 border-green-500/30';
  //     case 'failed':
  //       return 'text-red-400 bg-red-500/10 border-red-500/30';
  //     case 'refunded':
  //       return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  //   }
  // };

  const handleAddOrder = () => {
    setEditingOrder(null);
    setReadOnlyMode(false);
    setShowModal(true);
  };
  // const canEditOrder = (order: Order): boolean => {
  //   // const status = order.status;

  //   // const role = currentUser.role?.name_role;
  //   // const dept = currentUser.department?.name_department;

  //   // const isGD = role === 'giam_doc';
  //   // const isKD = dept === 'KINH_DOANH';
  //   // const isCU = dept === 'CUNG_UNG';
  //   // const isManager = ['truong_phong', 'pho_phong'].includes(role);
  //   // const isEmployee = role === 'nhan_vien_chinh_thuc';

  //   // if (isGD) return status === 'approved';
  //   // if (isKD) {
  //   //   if (isManager) return true;
  //   //   if (isEmployee) return status === 'draft';
  //   // }
  //   // if (isCU) return ['draft', 'pending','rejected'].includes(status);
  //   // return false;
  // };


const handleEditOrder = async (order: Order,readOnly =false) => {
    try {
      const res = await api.get(`/orders/${order.id}`);
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
        tax: Number(apiOrder.tax),
        shipping: Number(apiOrder.shipping),
        total: Number(apiOrder.total_amount),
        items: apiOrder.items.map((it: any) => ({
          product: {
            code: it.product?.code || '',
            name: it.product?.name || '',
            price: Number(it.product?.price || 0),
            color:it.product?.color,
          },
          quantity: Number(it.quantity)
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
 

  const handleDeleteOrder = async (order: Order) => {
  const result = await Swal.fire({
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
    // Gọi lại hàm loadOrders để cập nhật danh sách
    fetchOrders();
  } catch (error: any) {
    const message = error.response?.data?.message || 'Xóa thất bại';
    toast.error(message);
  }
  };

function mapOrderFromApi(o: any): Order {
  return {
    id: String(o.id),
    orderNumber: o.order_number,
    supplier_name: o.supplier_name || '',
    items: (o.items || []).map((it: any) => ({
      productCode: it.product_code,
      productName: it.product_name || it.product?.name || '',
      quantity: Number(it.quantity),
      price: Number(it.unit_price),
    })),
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    shipping: Number(o.shipping),
    total: Number(o.total_amount),
    status: o.status,
    status_name:o.status_name,
    paymentStatus: o.payment_status,
    shippingAddress: o.shipping_address,
    orderDate: o.order_date,
    estimatedDelivery: o.estimated_delivery,
    notes: o.notes || '',
  };
}


  const handleSaveOrder = async (orderData: OrderPayload) => {
  if (editingOrder) {
    // === CẬP NHẬT ĐƠN HÀNG ===
    try {
      const res = await api.put(`/orders/${editingOrder.id}`, orderData);
      const updated = mapOrderFromApi(res.data.order);
      setOrders(orders.map(o => (o.id === updated.id ? updated : o)));
      setShowModal(false);
      toast.success('Cập nhật đơn hàng thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cập nhật đơn hàng thất bại');
    }
  } else {
    // === TẠO MỚI ĐƠN HÀNG ===
    try {
      const payload = {
        orderDate: orderData.orderDate,
        supplier_name: orderData.supplier_name,
        industry_id: orderData.industry_id,
        intended_use: orderData.intended_use,
        items: orderData.items.map(it => ({
          productCode: it.productCode,
          quantity: it.quantity,
          color:it.variant
        })),
        status: orderData.status,
        payment_status: orderData.payment_status,
        estimated_delivery: orderData.estimated_delivery,
        shipping: orderData.shipping,
        notes: orderData.notes,
      };

      const res = await api.post('/orders', payload);
      const newOrder = mapOrderFromApi(res.data.order);

      // Cập nhật danh sách (có thể prepend vào đầu hoặc gọi lại GET)
      setOrders([newOrder, ...orders]);
      setShowModal(false);
      toast.success('Tạo đơn hàng thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Tạo đơn hàng thất bại');
    }
  }
  };
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const toggleOrderSelection = (id: string) => {
        setSelectedOrders(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
      };
    const handleMergeOrders = async () => {
      try {
        const res = await api.patch('/orders/merge', {
          order_ids: selectedOrders,
        });

        toast.success('Gộp đơn thành công!');
        setSelectedOrders([]);
        fetchOrders(); // hoặc fetchMergedOrders nếu đang xem danh sách gộp
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gộp đơn thất bại');
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

const handleImportOrders = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/orders/import-multiple', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        toast.success(`Đã tạo ${res.data.orders.length} đơn hàng`);
        fetchOrders(); // gọi lại danh sách nếu cần
      } catch (err: any) {
        console.error('❌ Import lỗi:', err);
        toast.error(err.response?.data?.message || 'Import thất bại');
      } finally {
        // reset file input để chọn lại được cùng file nếu cần
        e.target.value = '';
      }
    };

const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
const [selectedYears, setSelectedYears] = useState<string[]>([]);


useEffect(() => {
  const user = getCurrentUser();
    setCurrentUser(user);
  }, []); // 👈 hoặc bạn trigger lại sau login/logout
  console.log('👤 Current user:', currentUser); // 👈 THÊM DÒNG NÀY

const fetchMonthlyOrders = async () => {
      try {
        const res = await api.get('/orders/merged-by-month');
        setMonthlyOrders(res.data); // [{ month: 7, items: [...] }]
      } catch (error) {
        console.error('❌ Lỗi khi fetch đơn gộp theo tháng:', error);
      }
    };

const fetchYearlyOrders = async () => {
      try {
        const res = await api.get('/orders/merged-by-year');
        setYearlyOrders(res.data); // [{ year: '2024', total_items: [...], monthly_breakdown: [...] }]
      } catch (error) {
        console.error('❌ Lỗi khi fetch đơn gộp theo năm:', error);
      }
    };
useEffect(() => {
      setOrders([]);
      setMonthlyOrders([]);
      setYearlyOrders([]);
      setSelectedOrders([]);
      setSelectedMonths([]);
      setSelectedYears([]);
      loadStats();

      if (mode === 'normal') {
        fetchOrders();
      } else if (mode === 'monthly') {
        fetchMonthlyOrders();
      } else if (mode === 'yearly') {
        fetchYearlyOrders();
      }
    }, [mode, page,refreshKey ,currentUser,search]);

const toggleMonthSelection = (month: string) => {
  setSelectedMonths(prev =>
    prev.includes(month)
      ? prev.filter(m => m !== month)
      : [...prev, month]
  );
};

const toggleYearSelection = (year: string) => {
  setSelectedYears(prev =>
    prev.includes(year)
      ? prev.filter(y => y !== year)
      : [...prev, year]
  );
};
const handleExportSelectedMonths = async () => {
  try {
    const response = await api.post(
      '/export-merged-orders-multi-months',
      { months: selectedMonths }, // đúng key
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'don-gop-theo-thang.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err: any) {
    console.error(err);
    toast.error(err.response?.data?.message || 'Xuất thất bại');
  }
};

const handleExportSelectedYears = async () => {
  try {
    const response = await api.post(
      '/export-merged-orders-multi-years',
      { years: selectedYears },
      { responseType: 'blob' }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'don-gop-theo-nam.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err: any) {
    console.error(err);
    toast.error(err.response?.data?.message || 'Xuất thất bại');
  }
};
const [pendingOrders, setPendingOrders] = useState(0);
const [processingOrders, setProcessingOrders] = useState(0);

// useEffect(() => {
//   if (!currentUser || !orders) return;

//   const statusCount = {
//     pending: 0,
//     processing: 0,
//   };

//   const department = currentUser?.department?.name_department;
//   const role = currentUser?.role?.name_role;
  

//   orders.forEach(order => {
//     const status = order.status;

//     if (department === 'KINH_DOANH') {
//       if (status === 'draft') statusCount.pending++;
//       if (status === 'pending') statusCount.processing++;
//     } else if (department === 'CUNG_UNG') {
//       if (status === 'pending') statusCount.pending++;
//       if (status === 'approved') statusCount.processing++;
//     } else if (role === 'giam_doc') {
//       if (status === 'approved') statusCount.pending++;
//       if (status === 'fulfilled') statusCount.processing++;
//     }
//   });


//   setPendingOrders(statusCount.pending);
//   setProcessingOrders(statusCount.processing);
// }, [currentUser, orders]);
const role = currentUser?.role?.name_role;
const dept = currentUser?.department?.name_department;

const pendingLabel =
  dept === 'KINH_DOANH'
    ? 'Đơn nháp (Draft)'
    : dept === 'CUNG_UNG'
    ? 'Đơn chờ xử lý (Pending)'
    : role === 'giam_doc'
    ? 'Đơn cần duyệt (Approved)'
    : 'Chưa rõ';

const processingLabel =
  dept === 'KINH_DOANH'
    ? 'Đơn đã gửi chờ duyệt (Pending)'
    : dept === 'CUNG_UNG'
    ? 'Đơn đã duyệt (Approved)'
    : role === 'giam_doc'
    ? 'Đơn đang giao (Fulfilled)'
    : 'Chưa rõ';
useEffect(() => {
  if (initialSearch) {
    setSearch(initialSearch);
  }
}, [initialSearch]);

useEffect(() => {
  fetchOrders();
}, [search, page]);


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
        className={`px-3 py-1 rounded text-sm ${
          pageNum === page ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300'
        }`}
      >
        {pageNum}
      </button>
    )
  ));
};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Order Management</h1>
          <p className="text-gray-400 text-sm sm:text-base">Track and manage customer orders</p>
        </div>
        <button
          onClick={handleAddOrder}
          className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Create Order</span>
          <span className="sm:hidden">Create</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Total Orders</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              
              <p className="text-gray-400 text-xs sm:text-sm">{pendingLabel}</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">{processingLabel}</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{stats.processing}</p>
            </div>
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">Total Revenue</p>
              <p className="text-white text-lg sm:text-2xl font-bold">{stats.revenue.toLocaleString()} VNĐ</p>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-3 sm:p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
          </div>
          {selectedOrders.length > 0 && (
          <div className='flex items-center space-x-4'>
            <button
              onClick={handleMergeOrders}
            className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Gộp {selectedOrders.length} đơn đã chọn</span>
              <span className="sm:hidden">Merge ({selectedOrders.length})</span>
            </button>
            <button
              onClick={handleExportOrders}
              className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            >
              Export
            </button>
          </div>
        )}
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportOrders}
              accept=".csv,.txt,.xlsx"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            >
              Import
            </button>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
            >
              {paymentStatuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Payments' : status.toUpperCase()}
                </option>
              ))}
            </select>
          
          </div>
        </div>
      </div>
      {/* Orders Table */}
      {mode === 'normal' && ( 
      <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-800/50 border-b border-gray-700/50">
              <tr>
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Order</th>
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Supplier</th>
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Items</th>
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Total</th>
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Status</th>
                {/* <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Payment</th> */}
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Date</th>
                <th className="text-left p-2 sm:p-4 text-gray-300 font-medium text-xs sm:text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                  <td className="p-2 sm:p-4">
                    <div className="flex items-center gap-2">
           
                    {/* {order.status === 'fulfilled' && 
                    order.paymentStatus === 'paid'   &&
                    currentUser.department?.name_department === 'CUNG_UNG' &&
                    (
                      
                    )} */}

                    <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="form-checkbox text-blue-500 h-6 w-6"
                      />

                    <div>
                      <p className="text-white font-medium text-xs sm:text-sm">{order.orderNumber}</p>
                      <p className="text-gray-400 text-xs">ID: {order.id}</p>
                    </div>
                    </div>
                  </td>

                  <td className="p-2 sm:p-4">
                    <div>
                      <p className="text-white text-xs sm:text-sm">{order.supplier_name}</p>
                    </div>
                  </td>
                  <td className="p-2 sm:p-4">
                    <div>
                      <p className="text-white text-xs sm:text-sm">{order.items.length} item(s)</p>
                      <p className="text-gray-400 text-xs">
                        {order.items[0]?.productName}
                        {order.items.length > 1 && ` +${order.items.length - 1} more`}
                      </p>
                    </div>
                  </td>
                  <td className="p-2 sm:p-4 text-white font-semibold text-xs sm:text-sm">{order.total} VNĐ</td>
                  <td className="p-2 sm:p-4">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border w-fit ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{order.status_name.toUpperCase()}</span>
                    </div>
                  </td>
                  {/* <td className="p-2 sm:p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus.toUpperCase()}
                    </span>
                  </td> */}
                  <td className="p-2 sm:p-4 text-gray-300 text-xs sm:text-sm">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN'):''}</td>
                  <td className="p-2 sm:p-4">
                    <div className="flex items-center space-x-2">
                     {/* {canEditOrder(order) && ( 
                      
                      )} */}

                      <button
                        onClick={() => handleEditOrder(order)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {/* {currentUser.department?.name_department === 'KINH_DOANH' && order.status === 'draft' && (
                       
                      )} */}

                         <button
                        onClick={() => handleDeleteOrder(order)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                        <button
                            onClick={() => handleEditOrder(order, true)} // 👈 Xem chi tiết
                            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                    </div>
                  </td>    
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        


        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No orders found matching your criteria</p>
          </div>
        )}

      
      {lastPage > 1 && (
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 py-6">
        <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 rounded text-sm bg-gray-800/50 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >Prev</button>

        {renderPagination()} {/* <--- Thay thế đoạn Array.from ở đây */}

        <button 
            onClick={() => setPage(p => Math.min(lastPage, p + 1))} 
            disabled={page === lastPage}
            className="px-3 py-1 rounded text-sm bg-gray-800/50 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >Next</button>
        </div>
      </div>
      )}

      </div>
      )}
      {selectedMonths.length > 0 && (
          <button
            onClick={handleExportSelectedMonths}
            className="mb-4 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Xuất {selectedMonths.length} tháng đã chọn</span>
            <span className="sm:hidden">Export ({selectedMonths.length})</span>
          </button>
        )}

      {selectedYears.length > 0 && (
          <button
            onClick={handleExportSelectedYears}
            className="mb-4 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Xuất {selectedYears.length} năm đã chọn</span>
            <span className="sm:hidden">Export ({selectedYears.length})</span>
          </button>
        )}

      {mode === 'monthly'  &&(
          <div className="mt-6 space-y-6">
            {monthlyOrders.map((group: any) => (
              <div key={group.month} className="bg-gray-800/40 rounded-xl p-3 sm:p-4 border border-gray-600/30">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-white text-base sm:text-lg font-semibold">Tháng {group.month}</h2>
                  <input
                    type="checkbox"
                    checked={selectedMonths.includes(group.month)}
                    onChange={() => toggleMonthSelection(group.month)}
                    className="form-checkbox text-green-500 h-5 w-5"
                  />
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="p-2 text-gray-300 text-xs sm:text-sm">Sản phẩm</th>
                      <th className="p-2 text-gray-300 text-xs sm:text-sm">Tổng số lượng</th>
                      <th className="p-2 text-gray-300 text-xs sm:text-sm">Giá</th>
                      <th className="p-2 text-gray-300 text-xs sm:text-sm">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item: any) => (
                      <tr key={item.product_id} className="border-t border-gray-700/40">
                        <td className="p-2 text-white text-xs sm:text-sm">{item.product_name}</td>
                        <td className="p-2 text-white text-xs sm:text-sm">{item.total_quantity}</td>
                        <td className="p-2 text-white text-xs sm:text-sm">${item.price}</td>
                        <td className="p-2 text-white text-xs sm:text-sm">${(item.price * item.total_quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ))}

          </div>
        )}

      {mode === 'yearly' && (
          <div className="mt-6 space-y-6">
            {yearlyOrders.map((group: any) => (
              <div key={group.year} className="bg-gray-800/40 rounded-xl p-3 sm:p-6 border border-gray-600/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                    <h2 className="text-white text-lg sm:text-xl font-bold">Năm {group.year}</h2>
                    <span className="text-green-400 font-semibold text-sm sm:text-base">
                      Tổng doanh thu: ${group.total_revenue?.toLocaleString() || 0}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(group.year)}
                    onChange={() => toggleYearSelection(group.year)}
                    className="form-checkbox text-green-500 h-5 w-5"
                  />
                </div>
                {/* Yearly Summary */}
                <div className="mb-6">
                  <h3 className="text-white text-base sm:text-lg font-semibold mb-3">Tổng kết năm</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-gray-900/50 rounded-lg min-w-[600px]">
                      <thead>
                        <tr className="border-b border-gray-700/50">
                          <th className="p-2 sm:p-3 text-gray-300 text-xs sm:text-sm">Mã SP</th>
                          <th className="p-2 sm:p-3 text-gray-300 text-xs sm:text-sm">Tên sản phẩm</th>
                          <th className="p-2 sm:p-3 text-gray-300 text-xs sm:text-sm">Tổng số lượng</th>
                          <th className="p-2 sm:p-3 text-gray-300 text-xs sm:text-sm">Giá</th>
                          <th className="p-2 sm:p-3 text-gray-300 text-xs sm:text-sm">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.total_items?.map((item: any) => (
                          <tr key={item.product_id} className="border-t border-gray-700/40">
                            <td className="p-2 sm:p-3 text-white font-mono text-xs sm:text-sm">{item.product_code}</td>
                            <td className="p-2 sm:p-3 text-white text-xs sm:text-sm">{item.product_name}</td>
                            <td className="p-2 sm:p-3 text-white font-semibold text-xs sm:text-sm">{item.total_quantity}</td>
                            <td className="p-2 sm:p-3 text-white text-xs sm:text-sm">${item.price}</td>
                            <td className="p-2 sm:p-3 text-green-400 font-semibold text-xs sm:text-sm">
                              ${(item.price * item.total_quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                <div>
                  <h3 className="text-white text-base sm:text-lg font-semibold mb-3">Chi tiết theo tháng</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {group.monthly_breakdown?.map((monthData: any) => (
                      <div key={monthData.month} className="bg-gray-900/30 rounded-lg p-3 sm:p-4">
                        <h4 className="text-blue-400 font-semibold mb-2 text-sm sm:text-base">
                          {monthData.month_name} {group.year}
                        </h4>
                        <div className="space-y-2">
                          {monthData.items?.slice(0, 3).map((item: any) => (
                            <div key={item.product_id} className="flex justify-between text-xs sm:text-sm">
                              <span className="text-gray-300 truncate flex-1 mr-2">{item.product_name}</span>
                              <span className="text-white font-medium whitespace-nowrap">{item.total_quantity} units</span>
                            </div>
                          ))}
                          {monthData.items?.length > 3 && (
                            <div className="text-gray-400 text-xs">
                              +{monthData.items.length - 3} sản phẩm khác
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Order Modal */}
      {showModal && (
        <OrderModal
          order={editingOrder}
          onSave={handleSaveOrder}
          onClose={() => setShowModal(false)}
          readOnly={readOnlyMode}
          currentUser={currentUser} // Truyền currentUser vào modal
        />
      )}
    </div>
  );
};

export default OrdersPage;
