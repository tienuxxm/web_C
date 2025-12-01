import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getCurrentUser } from '../../utils/auth';


interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  color:string;
}
interface Product {
  id : string;
  code: string;
  name: string;
  price: number;
  barcode: string; 
  color: string; 
  status:string;
  categoryId:string|number;
}
// Trong OrderModal.tsx hoặc file types.ts nếu tách riêng
export type OrderStatus = 'draft' | 'pending' | 'approved'| 'rejected'| 'fulfilled' | 'inactive';
export type PaymentStatus = 'pending'| 'paid'| 'failed'| 'refunded';
 export interface OrderPayload {
  orderDate: string;
  intended_use: string;
  industry_id: number|string;
  supplier_name: string;
  items: { productCode: string; quantity: number ,variant:string}[];
  status: number;
  status_name:string;
  payment_status: PaymentStatus;
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
  status_name:string;
  paymentStatus: PaymentStatus;
  intendedUse: string;
  orderDate: string;
  estimatedDelivery: string;
  notes: string;
  items: {
    product: {
      id:string;
      code: string;
      name: string;
      price: number;
      categoryId?:string|number;
      color:string;
    };
    quantity: number;
  }[];
}
interface OrderModalProps {
  order: OrderFromAPI | null; 
  onSave: (order: OrderPayload) => void|Promise<void>;
  onClose: () => void;
  currentUser: any; // Hoặc User type nếu bạn đã có
  readOnly?:boolean;
}
const OrderModal: React.FC<OrderModalProps> = ({ order, onSave, onClose ,readOnly= false}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [formData, setFormData] = useState({
        orderNumber: '',
        supplier_name: '',
        items: [] as OrderItem[],
        subtotal: 0,
        tax:   0,
        shipping: 0,
        total: 0,
        status: 1,
        statusName:'',            
        paymentStatus: 'pending' as PaymentStatus, 
        intendedUse:'',
        orderDate: new Date().toISOString().split('T')[0],
        estimatedDelivery: '',
        notes: ''
  });
  const paymentStatuses :PaymentStatus[]= ['pending', 'paid', 'failed', 'refunded'];
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
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
    }, [order,readOnly,selectedCategoryId]);

 useEffect(() => {
    console.log("🔥 Order received in modal:", order);

    if (order) {
          const detectedCategory = order.items.length > 0 
          ? String(order.items[0].product.categoryId)
          : '';
          
    setSelectedCategoryId(detectedCategory || '');
        setFormData({
        orderNumber: order.orderNumber,
        supplier_name: order.supplierName ?? '',
        items: order.items.map(it => ({
          productId: it.product.id,
          productCode: it.product.code,
          productName: it.product.name,
          quantity: it.quantity,
          price: it.product.price,
          color: it.product.color
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        status: Number(order.status),
        statusName:order.status_name,
        paymentStatus: order.paymentStatus,
        intendedUse: order.intendedUse,
        orderDate: order.orderDate ? order.orderDate.split('T')[0] : '',
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.split('T')[0] : '',
        notes: order.notes ?? ''
      });

  } else {
    // === CHẾ ĐỘ TẠO MỚI ===
    setSelectedCategoryId(''); // Reset danh mục
    setProducts([]); // Reset danh sách sản phẩm
    setFormData(prev => ({
      ...prev,
    }));
  }
}, [order]);


useEffect(() => {
  console.log('🔄 formData.items:', formData.items);

  const subtotal = formData.items.reduce(
    (sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0
  );
  const tax = 0;
  const shipping=0;
  const total = subtotal ;

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
    const payload :OrderPayload= {
      industry_id: selectedCategoryId,
      orderDate: formData.orderDate,
      intended_use: formData.intendedUse,
      supplier_name: formData.supplier_name, // Đổi từ supplierName sang supplier_name
      items: formData.items.map(it => ({
        variant:it.color||'',
        productCode: it.productCode||it.productId,
        quantity: it.quantity
      })),
      status_name:formData.statusName,
      status: formData.status, // Mặc định là 'draft' nếu không có
      payment_status: formData.paymentStatus||'pending', // Mặc định là 'pending' nếu không có
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
    const newItem: OrderItem = {
      productId:'',
      productCode: '',
      productName: '',
      quantity: 1,
      price: 0,
      color:''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (index: number) => {
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
              productCode: product?.code||'',
              productName: product?.name || '',
              price: product?.price || 0,
              color:product?.color||''
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
    console.log("🧪 productCode value:", value, typeof value);

  };
  useEffect(() => {
  if (products.length === 0 || formData.items.length === 0) return;

  console.log("👉 formData.items:", formData.items);
  console.log("👉 products:", products.map(p => p.code));
}, [products, formData.items]);
  // Thêm hàm này vào trong OrderModal component
  const getAvailableStatuses = (order: OrderFromAPI | null): string[] => {
    if (!order) return ['draft']; // Mới -> Chỉ có Draft

    // Logic phân quyền chuyển trạng thái (copy từ OrdersPage)
    const statusId = Number(order.status); // Đảm bảo status là số để so sánh
    
    // Ví dụ logic đơn giản (bạn có thể copy logic full từ OrdersPage qua)
    if (statusId === 1) return ['draft', 'pending']; // Mới -> Chờ duyệt
    if (statusId === 2) return ['pending', 'approved', 'rejected']; // Chờ duyệt -> Duyệt/Từ chối
    
    // Nếu chưa có logic cụ thể, trả về status hiện tại và các status tiếp theo hợp lý
    return ['draft', 'pending', 'approved', 'rejected', 'fulfilled'];
  };
  // const isKinhDoanh = currentUser.department?.name_department === 'KINH_DOANH';
  const ALLOWED_DEPARTMENTS = ['CUNG_UNG', 'HANH_CHANH'];  const isGiamDoc = currentUser.role.name_role === 'giam_doc';
  const canAddItem = ALLOWED_DEPARTMENTS.includes(currentUser?.department?.name_department);

  const canEditQuantityOnly =  !readOnly&&(canAddItem || isGiamDoc);





  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50">
          <h2 className="text-lg sm:text-2xl font-bold text-white">
            { readOnly ?'View Order' : (order ? 'Edit Order' : 'Create New Order')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Order Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Order Number</label>
              <input
                type="text"
                name="orderNumber"
                value={formData.orderNumber}
                onChange={handleChange}
                required
                disabled // Không cho sửa nếu là đơn đã có
                className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm sm:text-base"
                placeholder="Enter order number"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Order Date</label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                required
                disabled={!!order} // Không cho sửa nếu là đơn đã có
                className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Supplier Information</h3>
            <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Supplier Name</label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="Enter supplier name"
                  disabled={ !!order}

                />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Intended Use</label>
              <input
                type="text"
                name="intendedUse"
                value={formData.intendedUse}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm sm:text-base"
                placeholder="Enter Intened Use"
                disabled={ !!order}

              />
            </div>
          </div>

          {/* Dropdown Category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Ngành hàng</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => {
              // Logic đổi ngành (chỉ chạy khi tạo mới)
              const newVal = e.target.value;
              setSelectedCategoryId(newVal);
              setFormData(prev => ({...prev, items: []})); // Reset items nếu đổi ngành
            }}
            // 👇 QUAN TRỌNG: Khóa cứng nếu đang Sửa đơn hàng (có order)
            disabled={!!order} 
            className={`w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white 
                ${!!order ? 'opacity-60 cursor-not-allowed' : ''}`} // Thêm style cho rõ là đang khóa
          >
            <option value="">-- Chọn ngành hàng --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          {/* Hiển thị thông báo nhỏ nếu đang bị khóa */}
          {!!order && (
              <p className="text-xs text-yellow-500 mt-1">
                  * Không thể đổi ngành hàng khi đang sửa đơn.
              </p>
          )}
        </div>
          

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-white">Order Items</h3>
             {/* {canAddItem && isDraft  && !readOnly &&(
              
             )} */}

             <button
                type="button"
                onClick={addItem}
                disabled={!selectedCategoryId}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      !selectedCategoryId 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
              </button>

            </div>

            {formData.items.map((item, index) => {
  // --- 🛠️ PHẦN DEBUG LOGIC (Chèn vào đây) ---
  // 1. Tìm sản phẩm dự phòng bằng Code (nếu đơn cũ chưa có ID)
  const fallbackProduct = products.find(p => p.code === item.productCode);
  
  // 2. Tính toán giá trị thực tế sẽ gán vào Value của Select
  // Ưu tiên item.productId -> nếu rỗng thì dùng ID của sản phẩm tìm thấy bằng Code -> nếu không thì rỗng
  const currentValue = item.productId || fallbackProduct?.id || '';

  // 3. Kiểm tra xem giá trị này có tồn tại trong danh sách Products dropdown không
  const isMatchFound = products.some(p => String(p.id) === String(currentValue));

  console.log(`🔍 Debug Dòng ${index + 1}:`, {
    "1. Item Data": {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName
    },
    "2. Logic Value": {
        currentValue: currentValue,
        "Fallback tìm thấy?": fallbackProduct ? "✅ Có" : "❌ Không",
        "ID Fallback": fallbackProduct?.id
    },
    "3. Kiểm tra hiển thị": {
        "Value có trong Products list?": isMatchFound ? "✅ CÓ (Sẽ hiện tên)" : "❌ KHÔNG (Sẽ bị trắng)",
        "Tổng SP tải về": products.length
    }
  });
  // ------------------------------------------

  return (
    <div key={index} className="bg-gray-800/30 rounded-xl p-3 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-12 gap-4 items-end">
        <div className="sm:col-span-5 ">
          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Product</label>
          {readOnly ?(
            <div className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base">
              {item.productName}
            </div>
          ):(
            <select
              // Sử dụng giá trị currentValue đã tính toán ở trên
              value={currentValue}
              onChange={(e) => updateItem(index, 'productId', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
            >
              <option value="">Select a product</option>
              {products.map(product => (
                // Sử dụng ID làm Key và Value để đảm bảo duy nhất
                <option key={product.id} value={product.id}>
                  [{product.code}] - {product.name} {product.color ? `(${product.color})` : ''}
                </option>
              ))}
            </select>
          )}
          
        </div>
        
        {/* Các phần Quantity, Price, Delete giữ nguyên */}
        
        <div className="sm:col-span-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Quantity</label>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
            disabled={canEditQuantityOnly}
            className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Price</label>
          <input
            type="number"
            step="0.01"
            value={item.price}
            disabled
            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
            className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Color</label>
          <input
            value={item.color}
            disabled
            onChange={(e) => updateItem(index, 'color', parseFloat(e.target.value) )}
            className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
          />
        </div>
        <div className="flex justify-center sm:col-span-1">
          
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
         
        </div>
      </div>
    </div>
      );
    })}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-800/30 rounded-xl p-4">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300 text-sm sm:text-base">
                <span>Subtotal:</span>
                <span>${formData.subtotal.toFixed(2)}</span>
              </div>
              {/* <div className="flex justify-between text-gray-300 text-sm sm:text-base">
                <span>Tax (8%):</span>
                <span>${formData.tax.toFixed(2)}</span>
              </div> */}
              {/* <div className="flex justify-between items-center text-gray-300 text-sm sm:text-base">
                <span>Shipping:</span>
                <input
                  type="number"
                  name="shipping"
                  step="100"
                  value={formData.shipping ?? 0}
                  onChange={handleChange}
                  className="w-20 sm:w-24 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded text-white text-right focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm"
                />
              </div> */}
              <hr className="border-gray-700" />
              <div className="flex justify-between text-white font-semibold text-base sm:text-lg">
                <span>Total:</span>
                <span>${Number(formData.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status and Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Order Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
           
              >/
                
                {getAvailableStatuses(order).map(status => (
                  <option key={status} value={status}>{status.toUpperCase()}</option>
                ))}
              </select>
            </div>
            {/* <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Payment Status</label>
              <select
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleChange}
                disabled={ !!order}
                className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
              >
                {paymentStatuses.map(status => (
                  <option key={status} value={status}>{status.toUpperCase()}</option>
                ))}
              </select>
            </div> */}
       
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Estimated Delivery</label>
              <input
                type="date"
                name="estimatedDelivery"
                value={formData.estimatedDelivery}
                min={formData.orderDate}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm sm:text-base"
              />
            </div>
         
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">Order Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none text-sm sm:text-base"
              disabled={ canEditQuantityOnly} 

              placeholder="Enter any special instructions or notes"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
            >
              Cancel
            </button>
            {!readOnly &&(
            <button
              type="submit"
              className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 text-sm sm:text-base"
            >
              {order ? 'Update Order' : 'Create Order'}
            </button>
              )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;
