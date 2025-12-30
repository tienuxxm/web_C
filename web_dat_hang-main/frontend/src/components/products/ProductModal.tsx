import React, { useState, useEffect } from 'react';
import { X, Package, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext'; // Import Theme Context
import { createPortal } from 'react-dom';

type Category = {id: number; name: string};

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  category_id: number | '';
  price: number | '';
  status: 'active' | 'inactive' | 'out_of_stock';
  // image: string; // Đã xóa image
  description: string;
  createdAt: string;
  color: string;
    unit: string; 
}

// Loại bỏ 'image' khỏi type input
type ProductInput = Omit<Product, 'id' | 'createdAt' | 'category'>;

interface ProductModalProps {
  product: Product | null;
  onSave: (data: FormData) => void;
  onClose: () => void;
  categories: Category[]; 
  readOnly?: boolean;
  role: 'nhan_vien' | 'pho_phong' | 'truong_phong' | string;   
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onSave, onClose, categories, role, readOnly }) => {
  const { theme } = useTheme(); // Lấy theme
  const isManager = role === 'pho_phong' || role === 'truong_phong' || role === 'Administrator' || role === 'Leader';
  
  const [formData, setFormData] = useState<ProductInput>({
    name: '',
    code: '',
    category_id: '',
    price: '',
    color: '',
    status: 'active' ,
    description: '',
    unit: '',
  });

  // Load dữ liệu khi sửa
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        code: product.code,
        category_id: product.category_id,
        price: product.price,
        status: product.status,
        description: product.description,
        color: product.color,
        unit: product.unit,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData();

    form.append('name', formData.name);
    form.append('code', formData.code);

    if (formData.category_id !== '' && !isNaN(Number(formData.category_id))) {
      form.append('category_id', String(formData.category_id));
    }

    if (formData.price !== '') form.append('price', String(formData.price));
    if (formData.status) form.append('status', formData.status);
    if (formData.color) form.append('color', formData.color);
    if (formData.description) form.append('description', formData.description);
    if (formData.unit) form.append('unit', formData.unit);
    
    // Đã xóa phần append image

    await onSave(form);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['price', 'category_id'].includes(name) ? Number(value) : value
    }));
  };

  // --- CLASSES CSS (Theme Adaptive - Tương tự OrderModal) ---
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

  return createPortal (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col ${modalClass}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${theme === 'light' ? 'border-gray-100' : 'border-white/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}>
              <Package className="h-6 w-6" />
            </div>
            <h2 className={`text-lg sm:text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {readOnly ? 'Chi tiết sản phẩm' : (product ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          
          {/* Row 1: Product Name */}
          <div>
            <label className={labelClass}>Tên sản phẩm <span className="text-red-500">*</span></label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={readOnly}
              required
              className={inputClass}
              placeholder="Nhập tên sản phẩm..."
            />
          </div>

          {/* Row 2: SKU & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mã SKU (Code)</label>
              <input
                name="sku"
                value={formData.code} // Giá trị này sẽ lấy từ product.code
                onChange={handleChange}
                disabled={readOnly}
                className={inputClass}
                placeholder="Tự động nếu để trống"
              />
            </div>
            <div>
              <label className={labelClass}>Ngành hàng <span className="text-red-500">*</span></label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                disabled={readOnly}
                required
                className={inputClass}
              >
                <option value="">-- Chọn ngành --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Price, Color, Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Giá bán</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                disabled={readOnly}
                min="0"
                required
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Màu sắc</label>
              <input
                name="color"
                value={formData.color}
                onChange={handleChange}
                disabled={readOnly}
                className={inputClass}
                placeholder="VD: Đen, Xanh..."
              />
            </div>
            <div>
              <label className={labelClass}>Đơn vị tính</label>
              <input
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                disabled={readOnly}
                className={inputClass}
                placeholder="Cái, Hộp..."
              />
            </div>
          </div>

          {/* Row 4: Status (Chỉ quản lý mới thấy) */}
          {isManager && (
             <div>
               <label className={labelClass}>Trạng thái</label>
               <select
                 name="status"
                 value={formData.status}
                 onChange={handleChange}
                 disabled={readOnly}
                 className={inputClass}
               >
                 <option value="active">Đang hoạt động</option>
                 <option value="inactive">Ngừng hoạt động</option>
               </select>
             </div>
          )}

          {/* Row 5: Description */}
          <div>
            <label className={labelClass}>Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={readOnly}
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="Thông tin chi tiết về sản phẩm..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-700/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                theme === 'light' 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {readOnly ? 'Đóng' : 'Hủy'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {product ? 'Cập nhật' : 'Thêm mới'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

export default ProductModal;