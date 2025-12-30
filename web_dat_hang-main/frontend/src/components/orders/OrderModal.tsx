import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingBag,Save} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../utils/auth';
import MySwal from '../../utils/swal';
import { useTheme } from '../../context/ThemeContext';
import { createPortal } from 'react-dom';

interface OrderItem {
  id?: string | number;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  quantityOld:number;
  price: number;
  color: string;
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
// Trong OrderModal.tsx hoặc file types.ts nếu tách riêng
export interface OrderPayload {
  orderDate: string;
  intended_use: string;
  industry_id: number | string;
  supplier_name: string;
  items: { productCode: string; quantity: number,quantityOld:number, variant: string ,productName :string,price:number}[];
  status: number;
  status_name: string;
  estimated_delivery: string;
  shipping: number;
  notes: string;
}

export interface OrderFromAPI {
  id: string;
  orderNumber: string;
  supplierName?: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: number;
  status_name: string;
  intendedUse: string;
  orderDate: string;
  estimatedDelivery: string;
  notes: string;
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
    quantityOld:number;
    price: number;
    variant: string;
  }[];
}
interface OrderModalProps {
  order: OrderFromAPI | null;
  onSave: (order: OrderPayload) => void | Promise<void>;
  onClose: () => void;
  currentUser: any; // Hoặc User type nếu bạn đã có
  readOnly?: boolean;
}
const OrderModal: React.FC<OrderModalProps> = ({ order, onSave, onClose, readOnly = false }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allStatuses, setAllStatuses] = useState<StatusOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    orderNumber: '',
    supplier_name: '',
    items: [] as OrderItem[],
    subtotal: 0,
    tax: 0,
    shipping: 0,
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
    if (readOnly) return;
    const fetchProducts = async () => {
      // Nếu chưa chọn danh mục thì không tải gì cả (để nhẹ máy)
      if (!selectedCategoryId) {
        setProducts([]);
        return;
      }

      setLoadingProducts(true);
      try {
        // ✅ GỌI API LỌC THEO CATEGORY (Thêm tham số category_id)
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

  // Thay thế đoạn useEffect map data trong OrderModal.tsx

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
            quantityOld:it.quantityOld,
            price: it.product.price,
            color: it.product.color
          };
        }),
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        status: Number(order.status),
        statusName: order.status_name,
        intendedUse: order.intendedUse,
        orderDate: order.orderDate ? order.orderDate.split('T')[0] : '',
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.split('T')[0] : '',
        notes: order.notes ?? ''
      });

    } else {
      setSelectedCategoryId('');
      setProducts([]);
      setFormData({
        orderNumber: '',
        supplier_name: '',
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderDate = new Date(formData.orderDate);
    const deliveryDate = new Date(formData.estimatedDelivery);
    // Kiểm tra ngày hợp lệ
    if (deliveryDate <= orderDate) {
      toast.error("Ngày giao hàng phải sau ngày đặt hàng.");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("Vui lòng chọn Ngành hàng (Category)!");
      return;
    }
    // Chỉ lấy các trường cần gửi cho BE
    const payload: OrderPayload = {
      industry_id: selectedCategoryId,
      orderDate: formData.orderDate,
      intended_use: formData.intendedUse,
      supplier_name: formData.supplier_name, // Đổi từ supplierName sang supplier_name
      items: formData.items.map(it => ({
        variant: it.color || '',
        productCode: it.productCode || it.productId,
        productName:it.productName,
        quantity: it.quantity,
        quantityOld:it.quantityOld,
        price:it.price
        
      })),
      status_name: formData.statusName,
      status: formData.status, // Mặc định là 'draft' nếu không có
      estimated_delivery: formData.estimatedDelivery,
      shipping: formData.shipping,
      notes: formData.notes
    };
    onSave(payload);
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'shipping' ? parseFloat(value) || 0 : value
    }));
  };

  const addItem = () => {
    // Logic sinh mã cho ngành 18
    let nextCode = '';
    const isManual = String(selectedCategoryId) === '18';

    if (isManual) {
      // Lấy index tiếp theo dựa trên số lượng item hiện có
      const nextIndex = formData.items.length + 1;
      // Format: 18 + 0000 + 0001 (4 số đuôi)
      nextCode = `180000${String(nextIndex).padStart(4, '0')}`;
    }

    const newItem: OrderItem = {
      productId: isManual ? `MANUAL_${Date.now()}` : '', // ID giả để React làm key
      productCode: nextCode,
      productName: '',
      quantity: 1,
      quantityOld:1,
      price: 0,
      color: isManual ? '000' : '', // Mặc định màu 000
      // Thêm unit nếu cần
      // unit: 'Cái' 
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
                    <p>Hệ thống sẽ <b>TỰ ĐỘNG TÁCH</b> dòng này sang một đơn gộp mới (Nháp) để xử lý sau thay vì xóa vĩnh viễn.</p>
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
          if (field === 'productId') {
            const product = products.find(p => p.id === value);
            return {
              ...item,
              productId: value as string,
              productCode: product?.code || '',
              productName: product?.name || '',
              price: product?.price || 0,
              color: product?.color || ''
            };
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
  const getAvailableStatuses = () => {
    if (!allStatuses || allStatuses.length === 0) return [];
    if (!order) return allStatuses.filter(s => s.Type === 1);
    const currentStatus = Number(order.status);
    const role = currentUser?.role?.name_role;
    const dept = currentUser?.department?.name_department;
    if (role === 'Administrator') {
      return allStatuses;
    }
    let allowedTypes: number[] = [currentStatus]; 
    if (role === 'Sales') {
      if (currentStatus === 1 || currentStatus === 10 || currentStatus === 9) {
        console.log('debug', allowedTypes)
        allowedTypes.push(1); 
      }
    }

    else if (dept === 'Cung ứng' || dept === 'Hành chính - Miền Nam'|| role === 'Supply') {
      // B1.  đơn Mới (1)
      if (currentStatus === 1) {
        allowedTypes.push(7); // Chốt
        allowedTypes.push(10); // Trả về
      }
      // B2. Đã Chốt (13)
      else if (currentStatus === 8) {
        allowedTypes.push(2);  // Gửi duyệt
      }
      // B3. Sếp đã duyệt (3)
      else if (currentStatus === 3) {
        allowedTypes.push(4);  // Đang đặt hàng
      }
      // B4. Đang đặt (4)
      else if (currentStatus === 4) {
        allowedTypes.push(11); // Hoàn thành
      }
    }

    // --- C. GIÁM ĐỐC (CEO) ---
    else if (role === 'Leader') {
      if (currentStatus === 2) {
        allowedTypes.push(3); // Duyệt
        allowedTypes.push(5); // Từ chối
      }
    }

    // Lọc danh sách trạng thái
    const uniqueTypes = Array.from(new Set(allowedTypes));
    const result = allStatuses.filter(s => uniqueTypes.includes(s.Type));
    return result;
  };
  // const isKinhDoanh = currentUser.department?.name_department === 'KINH_DOANH';
  const canEditDetails = !readOnly && (!order || [1, 10].includes(Number(order.status)));



// --- CLASSES CSS (Theme Adaptive) ---
  const modalClass = theme === 'light' 
    ? 'bg-white border-gray-200 shadow-2xl' 
    : 'glass-panel glass-panel-dark border-white/10';
    
  const inputClass = `w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all text-sm sm:text-base ${
    theme === 'light'
      ? 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500/30'
      : 'bg-gray-800/50 border-gray-700 text-white focus:ring-blue-500/50 placeholder-gray-500'
  } disabled:opacity-60 disabled:cursor-not-allowed`;

  const labelClass = `block text-xs sm:text-sm font-medium mb-1.5 ${
    theme === 'light' ? 'text-gray-700' : 'text-gray-300'
  }`;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
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
               {/* Supplier */}
               <div>
                 <label className={labelClass}>Nhà cung cấp <span className="text-red-500">*</span></label>
                 <input
                   name="supplier_name"
                   value={formData.supplier_name}
                   onChange={handleChange}
                   disabled={readOnly}
                   required
                   placeholder="Nhập tên NCC..."
                   className={inputClass}
                 />
               </div>
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
                   disabled={readOnly}
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
               {!readOnly && canEditDetails && (
                 <button
                   type="button"
                   onClick={addItem}
                   disabled={!selectedCategoryId}
                   className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                     !selectedCategoryId 
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
                const fallbackProduct = products.find(p => p.code === item.productCode);
                const currentValue = item.productId || fallbackProduct?.id || '';
                
                return (
                  <div key={index} className={`p-4 rounded-xl border transition-all ${
                     theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                  }`}>
                    {/* Grid 12 cột */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      
                      {/* 1. Sản phẩm (3 cột) */}
                      <div className="sm:col-span-3">
                        <label className={labelClass}>Sản phẩm</label>
                        {String(selectedCategoryId) === '18' ? (
                          <input 
                            value={item.productName} 
                            onChange={e => updateItem(index, 'productName', e.target.value)}
                            disabled={readOnly || !canEditDetails}
                            placeholder="Tên sản phẩm..."
                            className={inputClass}
                          />
                        ) : (
                          readOnly ? (
                            <div className={`truncate ${inputClass} bg-transparent border-none px-0`}>{item.productName}</div>
                          ) : (
                            <select
                              value={currentValue}
                              onChange={e => updateItem(index, 'productId', e.target.value)}
                              disabled={!canEditDetails}
                              className={inputClass}
                            >
                              <option value="">Chọn sản phẩm...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}> {p.name}</option>
                              ))}
                            </select>
                          )
                        )}
                      </div>

                      {/* 2. Màu sắc (2 cột) - MỚI THÊM */}
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Màu sắc</label>
                        <input
                          value={item.color}
                          disabled 
                          className={inputClass}
                        />
                      </div>

                      {/* 3. SL Yêu cầu (2 cột) */}
                      <div className="sm:col-span-2">
                        <label className={labelClass}>SL Yêu cầu</label>
                        <input
                          type="number"
                          value={item.quantityOld}
                          onChange={e => updateItem(index, 'quantityOld', Number(e.target.value))}
                          disabled={readOnly || !canEditDetails}
                          className={inputClass}
                        />
                      </div>

                      {/* 4. SL Duyệt (2 cột) */}
                      <div className="sm:col-span-2">
                        <label className={labelClass}>SL Duyệt</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          disabled={readOnly || !canEditDetails}
                          className={`${inputClass} ${theme === 'dark' ? 'focus:border-yellow-500' : ''}`}
                        />
                      </div>

                      {/* 5. Đơn giá (2 cột) */}
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Đơn giá</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => updateItem(index, 'price', Number(e.target.value))}
                          disabled={String(selectedCategoryId) !== '18' || readOnly}
                          className={inputClass}
                        />
                      </div>

                      {/* 6. Xóa (1 cột) */}
                      {!readOnly && (
                        <div className="sm:col-span-1 flex justify-center pb-1">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
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
                   <div>
                      <label className={labelClass}>Trạng thái đơn</label>
                      <select
                        name="status"
                        value={formData.status}
                        disabled={readOnly}
                        onChange={(e) => {
                           const val = Number(e.target.value);
                           setFormData(prev => ({ ...prev, status: val }));
                           if (val === 5) toast('Nhớ nhập lý do hủy vào ghi chú!', { icon: '📝' });
                        }}
                        className={inputClass}
                      >
                        {getAvailableStatuses().map(s => (
                          <option key={s.ID} value={s.Type}>{s.Name}</option>
                        ))}
                      </select>
                   </div>
                   <div>
                      <label className={labelClass}>Ngày giao dự kiến</label>
                      <input
                        type="date"
                        name="estimatedDelivery"
                        value={formData.estimatedDelivery}
                        min={formData.orderDate}
                        disabled={!canEditDetails && !readOnly}
                        onChange={handleChange}
                        className={inputClass}
                      />
                   </div>
                </div>
                

             </div>
             <div className="text-right min-w-[200px]">
                   <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Tổng tiền</p>
                   <p className={`text-2xl font-bold ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                      {formData.total.toLocaleString()} ₫
                   </p>
                </div>
             {/* Notes */}
             <div className="mt-4">
                <label className={labelClass}>Ghi chú</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  disabled={readOnly}
                  className={inputClass}
                  placeholder="Ghi chú thêm..."
                />
             </div>
          </div>

          {/* 4. Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'light' 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              Đóng
            </button>
            {!readOnly && (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {order ? 'Cập nhật' : 'Tạo đơn hàng'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default OrderModal;