import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingBag, Save, List, Send, ShoppingCart, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../utils/auth';
import MySwal from '../../utils/swal';
import { useTheme } from '../../context/ThemeContext';
import { createPortal } from 'react-dom';
import DistributionModal from './DistributionModal';
import { is } from 'date-fns/locale';

interface OrderItem {
  id?: string | number;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  quantityOld: number;
  price: number;
  erpPrice: number;
  color: string;
  unit?: string;
  variant?: string;
}
interface StatusOption {
  ID: number;
  Name: string;
  Type: number;
}
interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  barcode: string;
  color: string;
  status: string;
  categoryId: string | number;
}
interface Supplier {
  code: string;
  name: string;
}
export interface OrderPayload {
  orderDate: string;
  intended_use: string;
  industry_id: number | string;
  supplier_name: string;
  items: { productCode: string; quantity: number, quantity_old: number, variant: string, productName: string, price: number }[];
  status: number;
  status_name: string;
  estimated_delivery: string;
  notes: string;
  note_supply?: string;
  note_manager?: string;
}

export interface OrderFromAPI {
  id: string;
  orderNumber: string;
  supplierName?: string;
  subtotal: number;
  total: number;
  status: number;
  status_name: string;
  intendedUse: string;
  orderDate: string;
  estimatedDelivery: string;
  delivery_info?: {
    completed_at: string | null;
    is_late: boolean;
    days_diff: number;
    status_label: string;
  };
  note: string;
  note_history?: {
    name: string;
    content: string;
    time: string;
  }[];
  source_orders?: {
    po_number: string;
    note: string;
    user: string;
    created_at: string;
  }[];

  industry_id: number;
  items: {
    id: number;
    product: {
      id: string;
      code: string;
      name: string;
      price: number;
      categoryId?: string | number;
      color: string;
    };
    quantity: number;
    quantityOld: number;
    price: number;
    variant: string;
  }[];
}
interface OrderModalProps {
  order: OrderFromAPI | null;
  onSave: (order: OrderPayload) => void | Promise<void>;
  onClose: () => void;
  currentUser: any; 
  opUpdate?(): void;
  readOnly?: boolean;
}
const OrderModal: React.FC<OrderModalProps> = ({ order, onSave, onClose, readOnly = false ,opUpdate}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [allStatuses, setAllStatuses] = useState<StatusOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [inspectItemId, setInspectItemId] = useState<number | null>(null);
  const [ProductDropdownIndex, setProductDropdownIndex] = useState<number | null>(null);
  const role = currentUser?.role?.name_role;
  const dept = currentUser?.department?.name_department;
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    orderNumber: '',
    supplier_name: '',
    items: [] as OrderItem[],
    subtotal: 0,
    total: 0,
    status: 1,
    statusName: '',
    intendedUse: '',
    orderDate: new Date().toISOString().split('T')[0],
    estimatedDelivery: '',
    notes: ''
  });
  const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number>('');

  // 1. Fetch danh sách Category khi Modal mở
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Giả sử API lấy danh mục là /categories
        const res = await api.get('/categories');
        // Map dữ liệu tùy API của bạn (ví dụ: res.data.categories)
        setCategories(res.data.categories || []);
      } catch (e) {
        console.error("Lỗi tải danh mục", e);
      }
    };
    fetchCategories();
  }, []);
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

    const fetchSuppliersData = async () => {
      try {
        setLoadingSuppliers(true);
        const res = await api.get('/suppliers', {
          params: {
            industry: selectedCategoryId
          }
        });
        const supplierList = res.data.data || res.data || [];
        setSuppliers(supplierList);

      } catch (error) {
        console.error("Lỗi tải nhà cung cấp:", error);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliersData();
  }, [selectedCategoryId]);
  useEffect(() => {
    if (readOnly) return;
    const fetchProducts = async () => {
      if (!selectedCategoryId) {
        setProducts([]);
        return;
      }
      setLoadingProducts(true);
      try {
        const res = await api.get(`/products?per_page=2000&status=active&category_id=${selectedCategoryId}`);
        let availableProducts = res.data.products || [];

        if (order && order.items) {
          const loadedIds = new Set(availableProducts.map((p: any) => String(p.id)));
          const missingProducts = order.items
            .filter((item) => item.product && !loadedIds.has(String(item.product.id)))
            .map((item) => ({
              id: item.product.id,
              code: item.product.code,
              name: item.product.name,
              price: item.product.price,
              categoryId: item.product.categoryId, // Lưu ý map thêm cái này
              status: 'inactive',
              barcode: '',
              color: item.product.color
            }));

          if (missingProducts.length > 0) {
            availableProducts = [...missingProducts, ...availableProducts];
          }
        }
        setProducts(availableProducts);
      } catch (e) {
        console.error('❌ Failed to load products', e);
        toast.error("Lỗi tải sản phẩm");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [order, readOnly, selectedCategoryId]);
  const normalizeText = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD") // Tách tổ hợp ký tự (ví dụ: ê + dấu sắc)
      .replace(/[\u0300-\u036f]/g, "") // Xóa các dấu thanh
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-z0-9]/g, ""); // Xóa khoảng trắng thừa
  };
  const handleSelectProduct = (index: number, product: Product) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            productId: product.id,       // Lưu ID thật
            productCode: product.code,
            productName: product.name,
            price: product.price,
            erpPrice: product.price,
            color: product.color,
            unit: (product as any).unit || 'CAI',
            quantity: 1,
            quantityOld: 1
          };
        }
        return item;
      })
    }));
    setProductDropdownIndex(null);
  };

  const handleBlurProduct = (index: number) => {
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, i) => {
          if (i === index) {
            if (!String(selectedCategoryId).startsWith('18') && !item.productId) {
              return { ...item, productName: '' };
            }
          }
          return item;
        })
      }));
      setProductDropdownIndex(null); // Đóng danh sách
    }, 200);
  };
  // Thêm vào trong OrderModal component
  const handleRevert = async () => {
    try {
      const result = await MySwal.fire({
        title: 'Xác nhận hoàn trả?',
        text: "Các đơn PO gốc sẽ được tách ra và chuyển trạng thái về 'Yêu cầu điều chỉnh' để sửa lại.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Đồng ý hoàn trả',
        cancelButtonText: 'Hủy'
      });

      if (result.isConfirmed) {
        await api.post(`merge-orders/${order?.id}/revert`); // Gọi API vừa tạo
        toast.success('Đã hoàn trả đơn hàng về cho Sales!');
        if(opUpdate){
          opUpdate();
        } 
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi hoàn trả đơn.');
    }
  };
  useEffect(() => {
    if (order) {
      const detectedCategory = order.industry_id
        ? String(order.industry_id)
        : (order.items.length > 0 ? String(order.items[0].product.categoryId) : '');
      setSelectedCategoryId(detectedCategory || '');
      setFormData({
        orderNumber: order.orderNumber,
        supplier_name: order.supplierName ?? '',
        items: order.items.map((it: any) => {
          return {
            id: it.id,
            productId: it.product.id,
            productCode: it.product.code,
            productName: it.product.name,
            quantity: it.quantity,
            quantityOld: it.quantityOld,
            price: it.price,
            erpPrice: it.erpPrice,
            color: it.product.color,
            unit: it.unit,
          };
        }),
        subtotal: order.subtotal,
        total: order.total,
        status: Number(order.status),
        statusName: order.status_name,
        intendedUse: order.intendedUse,
        orderDate: order.orderDate ? order.orderDate.split('T')[0] : '',
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.split('T')[0] : '',
        notes: order.note ?? ''
      });

    } else {
      setSelectedCategoryId('');
      setProducts([]);
      setFormData({
        orderNumber: '',
        supplier_name: '',
        items: [],
        subtotal: 0,
        total: 0,
        status: 1,
        statusName: '',
        intendedUse: '',
        orderDate: new Date().toISOString().split('T')[0],
        estimatedDelivery: '',
        notes: ''
      });
    }
  }, [order]);
  useEffect(() => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0
    );
    const tax = 0;
    const shipping = 0;
    const total = subtotal;
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax,
      total,
      shipping
    }));
  }, [formData.items]);

  const processOrderAction = async (targetStatus?: number) => {
    // 1. Validation (Giữ nguyên logic cũ)
    const orderDate = new Date(formData.orderDate);
    const deliveryDate = new Date(formData.estimatedDelivery);
    const role = currentUser?.role?.name_role;

    const isSupply = role === 'Supply';
    const isLeader = role === 'Leader';
    if (deliveryDate <= orderDate) {
      toast.error("Ngày giao hàng phải sau ngày đặt hàng.");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("Vui lòng chọn Ngành hàng (Category)!");
      return;
    }
    if (isSupply) {
      // Kiểm tra nếu ô Supplier đang trống
      if (!formData.supplier_name || formData.supplier_name.trim() === '') {
        toast.error("Bắt buộc phải nhập Nhà cung cấp!", {
          icon: '🏢',
          duration: 4000
        });
        return;
      }
    }
    const seenItems = new Map<string, number>(); // Key: Code-Color, Value: Count
    const duplicateNames = new Set<string>();

    formData.items.forEach(item => {
      // Tạo khóa định danh: Mã + Màu (nếu không có màu thì lấy mã thôi)
      // Chuẩn hóa về chữ thường để so sánh chính xác
      const key = `${item.productCode?.toLowerCase()}-${item.color?.toLowerCase() || 'default'}`;

      if (seenItems.has(key)) {
        duplicateNames.add(item.productName);
      } else {
        seenItems.set(key, 1);
      }
    });

    if (duplicateNames.size > 0) {
      // Hiển thị danh sách tên sản phẩm bị trùng
      const listName = Array.from(duplicateNames).map(name => `• ${name}`).join('<br/>');

      const result = await MySwal.fire({
        title: '⚠️ Phát hiện trùng sản phẩm',
        html: `
                <div class="text-left text-sm">
                    <p class="mb-2">Các sản phẩm sau đang xuất hiện <b>nhiều lần</b> trong đơn (cùng mã & màu):</p>
                    <div class="text-yellow-600 font-medium mb-3 bg-yellow-50 p-2 rounded border border-yellow-200">
                        ${listName}
                    </div>
                    <p>Bạn có chắc chắn muốn giữ nguyên không?</p>
                </div>
            `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Vẫn thêm (Tôi cố ý)',
        cancelButtonText: 'Để tôi kiểm tra lại',
        confirmButtonColor: '#f59e0b', // Màu vàng cam cảnh báo
      });

      // Nếu user bấm "Hủy" hoặc click ra ngoài -> Dừng lại
      if (!result.isConfirmed) return;
    }
    const finalStatus = targetStatus !== undefined ? targetStatus : formData.status;
    const payload: any = {
      industry_id: selectedCategoryId,
      orderDate: formData.orderDate,
      intended_use: formData.intendedUse,
      supplier_name: formData.supplier_name,
      items: formData.items.map(it => ({
        variant: it.color,
        productCode: it.productCode || it.productId,
        productName: it.productName,
        quantity: it.quantity,
        quantity_old: it.quantityOld,
        price: it.price,
        unit: it.unit,
      })),
      status_name: formData.statusName,
      status: finalStatus,
      estimated_delivery: formData.estimatedDelivery,
    };

    // Mapping Note
    if (isSupply) {
      payload.note_supply = formData.notes;
    } else if (isLeader) {
      payload.note_manager = formData.notes;
    } else {
      payload.notes = formData.notes;
    }
    console.log("Payload gửi đi:", payload);
    // 5. Gọi API
    onSave(payload);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processOrderAction();
  };




  const handleChange = () => {
    setFormData(prev => ({
      ...prev,
    }));
  };

  const addItem = () => {
    let nextCode = '';
    const isManual = String(selectedCategoryId) === '18';

    if (isManual) {
      const nextIndex = formData.items.length + 1;
      nextCode = `180000${String(nextIndex).padStart(4, '0')}`;
    }

    const newItem: OrderItem = {
      productId: isManual ? `MANUAL_${Date.now()}` : '',
      productCode: nextCode,
      productName: '',
      quantity: 0,
      quantityOld: 1,
      price: 0,
      erpPrice: 0,
      color: isManual ? '000' : '', // Mặc định màu 000

    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };


  const removeItem = async (index: number) => {
    const itemToRemove = formData.items[index];

    const isMergeOrder = formData.orderNumber?.startsWith('MP');
    const isDraft = Number(formData.status) === 8;
    const realId = itemToRemove.id;
    const hasRealId = realId && !String(realId).startsWith('temp');
    if (isMergeOrder && isDraft && hasRealId) {
      const result = await MySwal.fire({
        title: '📦 Tách Đơn Hàng?',
        html: `
                <div class="text-left text-sm">
                    <p class="mb-2">Bạn đang xóa sản phẩm: <span class="font-bold text-yellow-400">${itemToRemove.productName}</span></p>
                    <p>Hệ thống sẽ <b>TỰ ĐỘNG TÁCH</b> dòng này sang một đơn gộp mới  để xử lý sau .</p>
                </div>
            `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý, Tách ngay',
        cancelButtonText: 'Hủy bỏ',
        reverseButtons: true
      });
      if (result.isConfirmed) {
        try {
          MySwal.fire({
            title: 'Đang xử lý...',
            text: 'Vui lòng chờ trong giây lát',
            allowOutsideClick: false,
            didOpen: () => {
              MySwal.showLoading();
            }
          });

          // Gọi API Split
          await api.post('/orders/split', {
            merge_id: formData.orderNumber,
            line_ids: [realId]
          });

          // Tắt loading và thông báo thành công
          await MySwal.fire({
            icon: 'success',
            title: 'Thành công!',
            text: 'Sản phẩm đã được tách sang đơn mới.',
            timer: 2000,
            showConfirmButton: false
          });

          // Cập nhật giao diện: Xóa dòng đó đi
          setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
          }));

        } catch (error: any) {
          console.error("Lỗi tách đơn:", error);
          MySwal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: error.response?.data?.message || "Không thể tách đơn. Vui lòng thử lại."
          });
        }
      }
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          // --- KHI GÕ TÊN SẢN PHẨM ---
          if (field === 'productName') {
            setProductDropdownIndex(index);
            const newState = {
              ...item,
              productName: value as string,
            };

            if (!String(selectedCategoryId).startsWith('18')) {
              newState.productId = '';     // Xóa ID để bắt chọn lại
              newState.productCode = '';   // Xóa Code
              newState.price = 0;          // Reset giá
            }

            return newState;
          }

          // ... (Giữ nguyên các logic khác như quantityOld)
          if (field === 'quantityOld') {
            return { ...item, quantityOld: value as number, quantity: value as number };
          }

          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };
  useEffect(() => {
    if (products.length === 0 || formData.items.length === 0) return;

  }, [products, formData.items]);
  
  const getExecutionInfo = (currentOrder: any, statusId: number) => {
    if (!currentOrder) return { name: '---', time: null };

    // Logic lấy tên người chịu trách nhiệm chính cho trạng thái hiện tại
    switch (statusId) {
      case 1: // Mới -> Người tạo (Sale)
        return {
          name: currentOrder.created_name || currentOrder.created_by,
          time: currentOrder.created_date
        };

      case 7: // Chốt (PO) -> Supply
      case 8: // Gộp (MP) -> Supply
      case 10: // Điều chỉnh -> Supply yêu cầu
        return {
          name: currentOrder.modified_supply_name || currentOrder.modified_by_name || currentOrder.created_name || 'Supply',
          time: currentOrder.modified_supply_date || currentOrder.modified_date || currentOrder.created_date
        };

      case 2: // Chờ duyệt -> Supply đã gửi đi
        return {
          name: currentOrder.modified_by_name, // Người cuối cùng cập nhật (thường là Supply gửi)
          time: currentOrder.modified_date
        };

      case 3: // Đã duyệt -> Leader
      case 5: // Hủy -> Leader
        return {
          name: currentOrder.modified_manager_name || 'Leader',
          time: currentOrder.modified_manager_date
        };

      default:
        return {
          name: currentOrder.modified_by_name || 'Hệ thống',
          time: currentOrder.modified_date
        };
    }
  };

  const canEditDetails = !readOnly && (!order || [1, 10].includes(Number(order.status)));
  const splitOrder = !readOnly && [8].includes(Number(order?.status));
  const Editquantity = ['Supply'].includes(currentUser?.role?.name_role);
  const viewVendor = ['Supply','Leader'].includes(role);

  const modalClass = theme === 'light'
    ? 'bg-white border-gray-200 shadow-2xl'
    : 'glass-panel glass-panel-dark border-white/10';

  const inputClass = `w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-sm sm:text-base ${theme === 'light'
    ? 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500/30'
    : 'bg-gray-800/50 border-gray-700 text-white focus:ring-blue-500/50 placeholder-gray-500'
    } disabled:opacity-60 disabled:cursor-not-allowed`;

  const labelClass = `block text-xs sm:text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col ${modalClass}`}>

        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${theme === 'light' ? 'border-gray-100' : 'border-white/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}>
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h2 className={`text-lg sm:text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {readOnly ? 'Chi tiết đơn hàng' : (order ? 'Cập nhật đơn hàng' : 'Tạo đơn mới')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6">

          {/* 1. General Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cột trái */}
            <div className="space-y-4">
              {/* Order No (Chỉ hiện khi edit) */}
              {!!order && (
                <div>
                  <label className={labelClass}>Mã đơn hàng</label>
                  <input value={formData.orderNumber} disabled className={inputClass} />
                </div>
              )}
              {/* Category */}
              <div>
                <label className={labelClass}>Ngành hàng <span className="text-red-500">*</span></label>
                <select
                  name="industry_id"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setFormData(prev => ({ ...prev, items: [] }));
                  }}
                  disabled={!!order || readOnly}
                  className={inputClass}
                >
                  <option value="">-- Chọn ngành hàng --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {/* Nhà cung cấp */}
              {viewVendor  &&(
                <div>
                  <label className={labelClass}>Nhà cung cấp <span className="text-red-500">*</span></label>

                  {readOnly ? (
                    <input
                      value={formData.supplier_name}
                      disabled
                      className={inputClass}
                    />
                  ) : (
                    <div className="relative group">
                      {/* 1. Ô Input chính */}
                      <input
                        type="text"
                        name="supplier_name"
                        value={formData.supplier_name}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, supplier_name: e.target.value }));
                          setShowSupplierSuggestions(true); // Gõ phím là hiện gợi ý
                        }}
                        onFocus={() => setShowSupplierSuggestions(true)} // Click vào là hiện gợi ý
                        // Delay việc ẩn list để kịp bắt sự kiện click vào item
                        onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}

                        placeholder={loadingSuppliers ? "Đang tải danh sách..." : "Chọn hoặc nhập tên NCC..."}
                        disabled={!selectedCategoryId||!canEditDetails}
                        autoComplete="off"
                        className={inputClass}
                      />

                      {/* Icon loading hoặc mũi tên */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        {loadingSuppliers ? (
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        )}
                      </div>

                      {/* 2. Danh sách gợi ý (Custom Dropdown) */}
                      {/* Chỉ hiện khi state = true và có dữ liệu */}
                      {showSupplierSuggestions && suppliers.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                          {suppliers
                            // Lọc danh sách theo từ khóa nhập (nếu muốn gợi ý thông minh)
                            .filter(s => {
                              const keyword = normalizeText(formData.supplier_name || '');

                              // B. Chuẩn hóa tên NCC trong data (DB -> ko dấu)
                              const name = normalizeText(s.name);
                              const code = normalizeText(s.code || '');

                              // C. So sánh trên nền tảng "không dấu"
                              return name.includes(keyword) || code.includes(keyword);
                            })
                            .map((sup, index) => (
                              <div
                                key={`${sup.code}_${index}`}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, supplier_name: sup.name }));
                                  setShowSupplierSuggestions(false); // Chọn xong thì ẩn đi
                                }}
                                className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-none"
                              >
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {sup.name}
                                </p>
                                {sup.code && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Mã: {sup.code}
                                  </p>
                                )}
                              </div>
                            ))}
                          {suppliers.filter(s => s.name.toLowerCase().includes((formData.supplier_name || '').toLowerCase())).length === 0}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Cột phải */}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Ngày đặt hàng</label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleChange}
                  disabled={!!order || readOnly}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mục đích sử dụng</label>
                <input
                  name="intendedUse"
                  value={formData.intendedUse}
                  onChange={handleChange}
                  disabled={readOnly||!canEditDetails}
                  placeholder="VD: Mua bán, Nội bộ..."
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          {/* 2. Order Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>Danh sách sản phẩm</h3>
              {canEditDetails && (
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!selectedCategoryId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!selectedCategoryId
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-blue-500/30'
                    }`}
                >
                  <Plus className="h-4 w-4" /> Thêm sản phẩm
                </button>
              )}
            </div>
            {/* List Items */}
            <div className="space-y-3">
              {formData.items.map((item, index) => {

                return (
                  <div key={index} className={`p-4 rounded-xl border transition-all ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                    }`}>
                    {/* Grid 12 cột */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-3 relative group">
                        <label className={labelClass}>Sản phẩm</label>
                        <input
                          type="text"
                          value={item.productName}
                          title={item.productName}
                          onChange={(e) => updateItem(index, 'productName', e.target.value)}
                          onFocus={() => setProductDropdownIndex(index)}
                          onBlur={() => handleBlurProduct(index)}

                          disabled={readOnly || !canEditDetails}

                          placeholder={
                            loadingProducts ? "Đang tải..." :
                              String(selectedCategoryId).startsWith('18') ? "Nhập tên sản phẩm hành chính..." : "Gõ tên/mã để tìm..."
                          }

                          // 👇 Chỉ hiện viền đỏ cảnh báo với ngành thường (khi chưa chọn ID)
                          className={`${inputClass} ${!String(selectedCategoryId).startsWith('18') && !item.productId && item.productName
                            ? 'border-red-400 focus:ring-red-200'
                            : ''
                            }`}
                          autoComplete="off"
                        />
                        {/* DANH SÁCH GỢI Ý (Dropdown) */}
                        {ProductDropdownIndex === index && products.length > 0 && !readOnly && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                            {products
                              .filter(p => {

                                const keyword = normalizeText(item.productName || '');
                                const pName = normalizeText(p.name);
                                const pCode = normalizeText(p.code);

                                return pName.includes(keyword) || pCode.includes(keyword);
                              })
                              .map((p) => (
                                <div
                                  key={p.id}
                                  onMouseDown={() => handleSelectProduct(index, p)}
                                  className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-none flex flex-col"
                                >
                                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                                    {p.name}
                                  </span>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded">
                                      {p.code}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {p.price.toLocaleString()} ₫
                                    </span>
                                  </div>
                                </div>
                              ))}

                            {/* Thông báo nếu không tìm thấy */}
                            {products.filter(p => normalizeText(p.name).includes(normalizeText(item.productName || '')) || normalizeText(p.code).includes(normalizeText(item.productName || ''))).length === 0 && (
                              <div className="px-4 py-3 text-sm text-red-500 text-center italic bg-gray-50 dark:bg-gray-700/30">
                                Không tìm thấy sản phẩm này trong kho
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* 2. Màu sắc (2 cột) - MỚI THÊM */}
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Màu sắc</label>
                        <input
                          value={item.color}
                          disabled
                          className={inputClass}
                        />
                      </div>
                      {/* 3. SL Yêu cầu (2 cột) */}
                      <div className="sm:col-span-1">
                        <label className={labelClass}>SL Yêu cầu</label>
                        <input
                          value={item.quantityOld}
                          onChange={e => updateItem(index, 'quantityOld', Number(e.target.value))}
                          disabled={readOnly || !canEditDetails || Editquantity}
                          className={inputClass}
                        />
                      </div>
                      {/* 4. SL Duyệt (2 cột) */}

                      <div className="sm:col-span-1">
                        <label className={labelClass}>SL Duyệt</label>
                        <input
                          value={item.quantity}
                          title={String(item.quantity)}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          disabled={readOnly || !canEditDetails || !Editquantity}
                          className={`${inputClass} ${theme === 'dark' ? 'focus:border-yellow-500' : ''}`}
                        />
                      </div>



                      {/* 5. Đơn giá (2 cột) */}
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Đơn giá</label>
                        <input
                          value={item.price}
                          onChange={e => updateItem(index, 'price', Number(e.target.value))}
                          disabled={!canEditDetails || readOnly || !Editquantity}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Giá ERP </label>
                        <input
                          value={item.erpPrice}
                          title={String(item.erpPrice)}
                          onChange={e => updateItem(index, 'erpPrice', Number(e.target.value))}
                          disabled
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>ĐVT</label>
                        <input
                          value={item.unit} // Hiển thị Unit
                          disabled
                          className={`${inputClass} px-2 text-center bg-gray-100 dark:bg-white/5`}
                        />
                      </div>
                      {/* 6. Xóa (1 cột) */}


                      <div className="sm:col-span-1 flex justify-center pb-1">
                        {formData.orderNumber?.startsWith('MP') && item.id && (
                          <button
                            type="button"
                            onClick={() => setInspectItemId(Number(item.id))}
                            className={`
                                p-2 rounded-lg transition-colors duration-200
                                /* Light Mode */
                                text-blue-600 hover:bg-blue-100 hover:text-blue-800
                                /* Dark Mode */
                                dark:text-blue-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-200
                              `}
                            title="Xem phân bổ hàng cho Sales"
                          >
                            <List size={18} />
                          </button>
                        )}
                        {(canEditDetails || splitOrder) && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}

                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. Footer Summary & Status */}
          <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* CỘT 1: TRẠNG THÁI (Giữ nguyên code hiển thị mới) */}
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Trạng thái đơn hàng</label>
                  {(() => {
                    const info = getExecutionInfo(order, Number(formData.status));
                    return (
                      <div className={`h-full px-4 py-3 rounded-xl border flex items-center justify-between gap-3 transition-all bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700`}>
                        {/* Tên trạng thái */}
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${formData.status === 3 ? 'bg-green-500' :
                            formData.status === 5 ? 'bg-red-500' :
                              formData.status === 1 ? 'bg-blue-500' :
                                formData.status === 4 ? 'bg-cyan-500' : 'bg-yellow-500'
                            }`}></span>
                          <span className="font-bold text-lg text-gray-800 dark:text-white uppercase">
                            {formData.statusName || 'Mới'}
                          </span>
                        </div>

                        {/* Thông tin người thực hiện */}
                        <div className="text-right flex flex-col justify-center">
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Thực hiện bởi
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                            {info.name} <span className="text-gray-400 font-normal mx-1">-</span> {info.time ? new Date(info.time).toLocaleDateString('vi-VN') : '--'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col gap-2 h-full">
                  {formData.orderNumber?.startsWith('MP')&&(<label className={labelClass}>Ngày giao dự kiến</label>)}
                  {formData.orderNumber?.startsWith('PO')&&(<label className={labelClass}>Ngày giao mong muốn</label>)}

                  {/* Logic hiển thị: Nếu đã hoàn thành (11) thì hiện kết quả so sánh */}
                  {formData.status === 11 && order?.delivery_info?.completed_at ? (
                    <div className={`h-full px-3 py-2 rounded-xl border flex flex-col justify-center ${order.delivery_info.is_late
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Dự kiến: {new Date(formData.estimatedDelivery).toLocaleDateString('vi-VN')}</span>

                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.delivery_info.is_late
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-600'
                          }`}>
                          {order.delivery_info.status_label}
                          {order.delivery_info.days_diff > 0 && ` (${order.delivery_info.days_diff} ngày)`}
                        </span>
                      </div>

                      <div className="mt-1 font-semibold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        <span>Hoàn thành:</span>
                        <span>{new Date(order.delivery_info.completed_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                  ) : (
                    <input
                      type="date"
                      name="estimatedDelivery"
                      value={formData.estimatedDelivery}
                      min={formData.orderDate}
                      disabled={!canEditDetails && !readOnly&& !splitOrder}
                      onChange={handleChange}
                      className={`${inputClass} h-full cursor-pointer min-h-[56px]`}
                    />
                  )}
                </div>

              </div>


            </div>
            <div className="text-right min-w-[200px]">
              <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Tổng tiền</p>
              <p className={`text-2xl font-bold ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                {formData.total.toLocaleString()} ₫
              </p>
            </div>


            {/* Khu vực Ghi chú (Note) */}
            <div className="mt-4 sm:col-span-2">
              <label className={labelClass}>Ghi chú trao đổi</label>

              <div className={`rounded-xl border overflow-hidden ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-800/30 border-gray-700'}`}>

                {/* 1. Phần hiển thị Lịch sử (Nếu có) */}
                {order?.note_history && order.note_history.length > 0 && (
                  <div className={`p-4 text-sm space-y-3 border-b ${theme === 'light' ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-gray-700'}`}>
                    {order.note_history.map((note, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                        {/* Tên  */}
                        <span className="font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {note.name || 'Unknown'}
                        </span>

                        {/* Nội dung ghi chú */}
                        <span className="text-gray-700 dark:text-gray-200">
                          {note.content}
                        </span>
                      </div>
                    ))}
                  </div>
                )}



                {/* 2. Phần nhập liệu mới */}
                {!readOnly && (
                  <div className="p-2">
                    <textarea
                      name="notes"
                      // Lưu ý: formData.notes ở đây là biến tạm để gửi lên server
                      // Server sẽ tự map vào cột Note/NoteSupply/NoteManager tùy role
                      onChange={handleChange}
                      rows={2}
                      className={`w-full px-3 py-2 bg-transparent border-none focus:ring-0 text-sm sm:text-base resize-none placeholder-gray-400 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
                      placeholder="Nhập ghi chú của bạn vào đây..."
                    />
                  </div>
                )}


              </div>
              {/* {order?.source_orders && order.source_orders.length > 0 && (
                  <div className={`mt-4 p-4 rounded-xl border ${theme === 'light' ? 'bg-blue-50 border-blue-100' : 'bg-blue-900/20 border-blue-800'}`}>
                    <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${theme === 'light' ? 'text-blue-800' : 'text-blue-300'}`}>
                      📦 Danh sách đơn PO gốc:
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                      {order.source_orders.map((po: any) => (
                        <div key={po.po_number} className={`text-sm flex flex-col sm:flex-row sm:items-start sm:gap-2 border-b pb-2 last:border-0 ${theme === 'light' ? 'border-blue-200' : 'border-blue-800/50'}`}>
                          
                          
                          <span className={`font-mono font-bold whitespace-nowrap ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                            {po.po_number}
                          </span>
                          <span className={`text-xs italic whitespace-nowrap ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                            ({po.user}):
                          </span>
                          <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                            {po.note || <span className="opacity-50 italic">Không có ghi chú</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}  */}
            </div>

          </div>

          {/* 4. Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {role === 'Sales' && !readOnly && (
              <>
                {/* Trạng thái 10 (Điều chỉnh) -> Gửi lại thành 1 (Mới) */}
                {formData.status === 10 && (
                  <button
                    type="button"
                    onClick={() => processOrderAction(1)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Gửi lại đơn
                  </button>
                )}
                {/* Trạng thái 1 (Mới) -> Lưu nháp */}
                {formData.status === 1 && (
                  <button
                    type="button"
                    onClick={() => processOrderAction()}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl"
                  >
                    Lưu thay đổi
                  </button>
                )}
              </>
            )}
            {(role === 'Supply' || currentUser?.department?.name_department === 'Cung ứng') &&!readOnly && (() => {
              const isMergeOrder = formData.orderNumber?.startsWith('MP');

              return isMergeOrder ? (
                // --- A. ĐƠN GỘP (MERGE ORDER - MP) ---
                <>
                  {/* 8 (Nháp) -> 2 (Gửi duyệt) */}
                  {formData.status === 8 && (
                    <button
                      type="button"
                      onClick={() => processOrderAction(2)}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30"
                    >
                      Gửi duyệt
                    </button>
                  )}

                  {/* 3 (Đã duyệt) -> 4 (Đặt hàng) */}
                  {formData.status === 3 && (
                    <button
                      type="button"
                      onClick={() => processOrderAction(4)}
                      className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Tiến hành đặt hàng
                    </button>
                  )}

                  {/* 4 (Đang đặt) -> 11 (Hoàn thành) */}
                  {formData.status === 4 && (
                    <button
                      type="button"
                      onClick={() => processOrderAction(11)}
                      className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Hoàn thành đơn
                    </button>
                  )}
                  {formData.status === 5 && (
                    <button
                      type="button"
                      onClick={handleRevert}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                      Hoàn trả 
                    </button>
                  )}
                </>
              ) : (
                // --- B. ĐƠN LẺ (PURCHASE ORDER - PO) ---
                <>
                  {/* 1 (Mới) -> 7 (Chốt) hoặc 10 (Trả về) */}
                  {formData.status === 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => processOrderAction(10)}
                        className="px-5 py-2.5 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium"
                      >
                        Yêu cầu chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => processOrderAction(7)}
                        className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg"
                      >
                        Chốt đơn
                      </button>
                    </>
                  )}

                  {/* 3 (Đã duyệt) -> 4 (Đặt hàng) - Dành cho PO lẻ không cần gộp */}
                  {formData.status === 3 && (
                    <button
                      type="button"
                      onClick={() => processOrderAction(4)}
                      className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold shadow-lg flex items-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" /> Đặt hàng ngay
                    </button>
                  )}

                  {/* 4 (Đang đặt) -> 11 (Hoàn thành) */}
                  {formData.status === 4 && (
                    <button
                      type="button"
                      onClick={() => processOrderAction(11)}
                      className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Hoàn thành
                    </button>
                  )}

                  

                </>
              );
            })()}


            {(role === 'Leader' || role === 'Manage') && formData.status === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => processOrderAction(5)} // 2 -> 5 (Hủy/Từ chối)
                  className="px-5 py-2.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-medium"
                >
                  Từ chối đơn
                </button>
                <button
                  type="button"
                  onClick={() => processOrderAction(3)} // 2 -> 3 (Duyệt)
                  className="px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg"
                >
                  Phê duyệt
                </button>
              </>
            )}

          </div>

        </form>
      </div>
      {inspectItemId && (
        <DistributionModal
          itemId={inspectItemId}
          onClose={() => setInspectItemId(null)}
        />
      )}
    </div>
    ,
    document.body
  );
};

export default OrderModal;