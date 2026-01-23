import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  Plus, Search, Filter, Edit, Eye, Package, TrendingUp, RotateCcw,
  ChevronLeft, ChevronRight, CheckCircle, XCircle
} from 'lucide-react'; import ProductModal from './ProductModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  category_id: number;
  price: number;
  stock: number;
  min_stock: number;
  category_status: 'active' | 'inactive';
  status: 'active' | 'inactive';
  image: string;
  description: string;
  createdAt: string;
  color: string;
  unit: string;
}

const ProductsPage: React.FC = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const initialSearch = location.state?.searchTerm || '';
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 6,
    total: 0,
    last_page: 1,
  });
  /* --- Xác định role & helper --- */
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role;




  useEffect(() => {
    const loadStats = async () => {
      try {
        // Gọi API chuyên dụng, chỉ 1 request duy nhất
        const res = await api.get('/products/stats');
        const stats = res.data;

        setTotalProducts(stats.total_products);
        setActiveProducts(stats.active_products);
      } catch (error) {
        console.error("Không thể tải thống kê:", error);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    // 1. Biến cờ (flag) để kiểm soát component
    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        let endpoint = `/products?page=${page}&per_page=${pagination.per_page}`;
        if (searchTerm) {
          endpoint += `&q=${encodeURIComponent(searchTerm)}`;
        }

        if (selectedCategory !== 'all') {
          endpoint += `&category_id=${selectedCategory}`;
        }

        const res = await api.get(endpoint);

        // Mapping dữ liệu
        const mapped = res.data.products.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          code: p.code,
          category: p.category,
          category_id: Number(p.category_id),
          category_status: p.category_status || 'inactive',
          price: Number(p.price),
          stock: Number(p.quantity),
          min_stock: Number(p.min_stock),
          status: p.status,
          image: p.image,
          color: p.color,
          barcode: p.barcode,
          description: p.description ?? '',
          createdAt: p.created_at,
          unit: p.unit,
        }));

        // 2. CHỈ CẬP NHẬT NẾU COMPONENT CÒN "SỐNG" (MOUNTED)
        // Nếu bạn đã chuyển sang trang khác, isMounted sẽ là false -> Không cập nhật nữa
        if (isMounted) {
          setProducts(mapped);
          setPagination(res.data.pagination);

          // Đồng bộ lại page nếu API trả về khác (vd: search ra ít kết quả hơn)
          if (res.data.pagination.current_page !== page) {
            setPage(res.data.pagination.current_page);
          }
        }
      } catch (err) {
        if (isMounted) {
          setProducts([]);
          console.error(err);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
      console.log(role.name);
    };

    fetchProducts();

    // 3. CLEANUP FUNCTION: Chạy khi user chuyển trang hoặc gõ search mới
    return () => {
      isMounted = false; // Hủy cập nhật của request cũ
    };
  }, [page, searchTerm, refreshKey, selectedCategory]);

  const reloadList = () => {
    setRefreshKey(prev => prev + 1);
  };
  /* --------------------------------
     2) useEffect: Lấy danh mục
  ----------------------------------*/
  useEffect(() => {
    let cancel = false;
    const fetchCategories = async () => {
      try {
        const res = await api.get<{ categories: any[] }>('/categories');
        if (!cancel) {
          setCategories(res.data.categories.map(c => ({
            id: c.id,
            name: c.name,
          })));
        }
      } catch (e) {
        !cancel && setCategories([]);
      }
    };

    fetchCategories();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get<{ categories: any[] }>('/categories');
        setCategories(res.data.categories.map((c: any) => ({ id: c.id, name: c.name })));
      } catch (e) {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');



  const getStatusColor = (status: Product['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'inactive':
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      // case 'out_of_stock':
      //   return 'text-red-400 bg-red-500/10 border-red-500/30';
    }
  };

  

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
  };
  const handleFetchDetail = async (id: string) => {
    try {
      // Gọi API lấy chi tiết (Hàm show ở Backend)
      const res = await api.get(`/products/${id}`);

      // Dựa vào JSON bạn cung cấp: res.data.categories là object chi tiết
      return res.data.data; // hoặc res.data.data tùy controller

    } catch (error) {
      toast.error("Không thể tải chi tiết danh mục");
      console.error(error);
    }
  };

  const handleViewProduct = async (id: string) => {
    const details = await handleFetchDetail(id);
    if (details) {
      setEditingProduct(details);
      setIsViewOnly(true);
      setShowModal(true);
    }
  };

  // const handleEditProduct = (product: Product) => {
  //   setEditingProduct(product);
  //   setShowModal(true);
  // };

  const handleRestoreProduct = async (productId: string) => {
    try {
      await api.put(`/products/${productId}/status`, { status: 'active' });
      toast.success('Sản phẩm đã được khôi phục.');
      const res = await api.get('/products?withInactive=1');
      const mapped = res.data.products.map((p: any) => ({
        id: String(p.id),
        name: p.name,
        sku: p.code,
        category: p.category,
        category_id: Number(p.category_id),
        price: Number(p.price),
        stock: Number(p.quantity),
        min_stock: Number(p.min_stock),
        status: p.status,
        image: p.image,
        description: p.description ?? '',
        createdAt: p.created_at,
        color: p.color, // Thêm color
        sales: Number(p.sales),
      }));
      setProducts(mapped);
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Khôi phục sản phẩm thất bại!';
      toast.error(message); // 👈 Hiển thị message thực tế từ backend
      console.error(e);
    }

  };
  const handleSaveProduct = async (form: FormData) => {
    setIsLoading(true);
    try {
      if (editingProduct) {
        // Nếu là sửa, gọi API update (bạn có thể bổ sung sau)
        await api.post(`/products/${editingProduct.id}?_method=PUT`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Thêm mới
        await api.post('/products', form, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      // Sau khi thêm thành công, reload lại danh sách sản phẩm
      const res = await api.get<{ products: any[] }>('/products');
      const mappedProducts: Product[] = res.data.products.map((p: any) => ({
        id: p.id.toString(),
        name: p.name,
        code: p.code,
        category: p.category,
        category_id: Number(p.category_id), // thêm category_id,
        category_status: p.category_status || 'inactive',
        price: Number(p.price),
        stock: Number(p.quantity),
        min_stock: Number(p.min_stock),
        status: p.status,
        image: p.image,
        color: p.color,
        barcode: p.barcode,
        description: p.description ?? '',
        createdAt: p.created_at,
        unit: p.unit,
      }));
      setProducts(mappedProducts);
      setShowModal(false);
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Thêm sản phẩm thất bại!';
      toast.error(message); 
    } finally {
      setIsLoading(false);
    }
  };
  const [totalProducts, setTotalProducts] = useState(0);
  const [activeProducts, setActiveProducts] = useState(0);
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);

      // Sau khi dùng xong, xóa để tránh lặp lại khi chuyển trang
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const renderPagination = () => {
    const { current_page, last_page } = pagination;
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;
    for (let i = 1; i <= last_page; i++) {
      if (i === 1 || i === last_page || (i >= current_page - delta && i <= current_page + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots.map((pageNum, index) => {
      if (pageNum === '...') {
        return (
          <span key={`dots-${index}`} className="px-3 py-1 text-gray-400">
            ...
          </span>
        );
      }
      return (
        <button
          key={pageNum}
          onClick={() => setPage(Number(pageNum))}
          className={`px-3 py-1 rounded text-sm transition-colors ${pageNum === current_page
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
            }`}
        >
          {pageNum}
        </button>
      );
    });

  };
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl transition-all duration-300 ${theme === 'light' ? 'bg-white shadow-sm border border-gray-100' : 'glass-panel glass-panel-dark border-white/5'
        }`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bitex-primary dark:text-white">
            Quản lý Sản phẩm
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* <button
            onClick={handleAddProduct}
            className="flex items-center space-x-2 px-4 py-2.5 bg-bitex-accent hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Thêm mới</span>
          </button> */}
          <button
            onClick={() => { reloadList(); setPage(1); }}
            className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            title="Tải lại"
          >
            <RotateCcw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Tải lại</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel glass-panel-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10 relative">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Tổng sản phẩm</p>
              <p className="text-gray-900 dark:text-white text-2xl font-bold mt-1">{totalProducts}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <Package className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="glass-panel glass-panel-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between z-10 relative">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Đang hoạt động</p>
              <p className="text-gray-900 dark:text-white text-2xl font-bold mt-1">{activeProducts}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 ${theme === 'light' ? 'bg-white shadow-sm border-gray-200' : 'glass-panel glass-panel-dark border-white/5'
        }`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Tìm tên, mã SKU..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className={`rounded-2xl overflow-hidden border transition-all duration-300 relative flex flex-col ${
         theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'glass-panel glass-panel-dark border-white/5'
      }`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className={`text-xs uppercase font-bold tracking-wider sticky top-0 z-10 ${
               theme === 'light' ? 'bg-gray-50 text-gray-600 border-b border-gray-200' : 'bg-white/5 text-gray-400 border-b border-white/5'
            }`}>
              <tr>
                <th className="p-4">Sản phẩm</th>
                <th className="p-4">Mã sản phẩm</th>
                <th className="p-4">Danh mục</th>
                <th className="p-4">Giá</th>
                <th className="p-4">ĐVT</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4">Màu</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
              {products.map((product) => {
                const isProductActive = product.status === 'active';
                const isCategoryActive = product.category_status === 'active';
                const isVisuallyDisabled = !isProductActive;

                return (
                  <tr key={product.id} className={`group hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors ${isVisuallyDisabled ? 'opacity-60 bg-gray-50 dark:bg-black/20' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">                        
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium line-clamp-1">{product.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300 font-mono  font-semibold">
                        {product.code}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                       <span className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md text-xs font-medium">{product.category}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                       {new Intl.NumberFormat('vi-VN').format(product.price)} ₫
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{product.unit}</td>
                    <td className="p-4 text-center">
                       {isProductActive ? (
                         <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                           <CheckCircle size={12} className="mr-1" /> Active
                         </span>
                       ) : (
                         <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border border-gray-200 dark:border-gray-500/20">
                           <XCircle size={12} className="mr-1" /> Inactive
                         </span>
                       )}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">{product.color}</td>


                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <>
                          <button
                            onClick={() => handleViewProduct(product.id)}
                            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>                        
                          {/* <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)} // Gửi cả object (nếu hàm delete cần product.name)
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Tạm ngưng sản phẩm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button> */}
                          
                        </>



                        {/* <button
                          onClick={() => handleRestoreProduct(product.id)} // Gửi cả object
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Khôi phục sản phẩm"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          disabled // Vô hiệu hóa nút
                          className="p-2 text-gray-500 rounded-lg cursor-not-allowed"
                          title="Danh mục của sản phẩm này đang bị tạm ngưng. Hãy khôi phục danh mục trước."
                        >
                          <Edit className="h-4 w-4" />
                        </button> */}


                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No products found matching your criteria</p>
          </div>
        )}
        {/* --- PHẦN PHÂN TRANG ĐÃ ĐƯỢC SỬA ĐỔI --- */}
        {pagination.last_page > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 py-6">

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded text-sm bg-gray-800/50 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>

              {renderPagination()}

              <button
                onClick={() => setPage(p => Math.min(p + 1, pagination.last_page))}
                disabled={page === pagination.last_page}
                className="px-3 py-1 rounded text-sm bg-gray-800/50 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => setShowModal(false)}
          categories={categories}
          role={role}
          readOnly={isViewOnly}
        />
      )}
    </div>
  );
};

export default ProductsPage;
