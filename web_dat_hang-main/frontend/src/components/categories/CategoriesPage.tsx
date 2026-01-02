import React, { useState } from 'react';
import {
  Search, Edit, Trash2, Folder, Eye, RotateCcw,
  Plus, CheckCircle, XCircle, Layers, Users, Hash
} from 'lucide-react'; 
import CategoryModal from './CategoryModal';
import api from '../../services/api';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

interface Category {
  id: string;
  name: string;
  prefix: string;
  status: 'active' | 'inactive';
  description: string; // Optional field for description
  users: string[]; // Optional field for user emails
}

const CategoriesPage: React.FC = () => {
  const { theme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const filteredCategories = categories.filter(cat => {
    const matchSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedStatus === 'all' || cat.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories);
    } catch (error) {
      toast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };
  const handleFetchDetail = async (id: string) => {
    try {
      const res = await api.get(`/categories/${id}`);
      return res.data.categories;
    } catch (error) {
      toast.error("Không thể tải chi tiết danh mục");
      console.error(error);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);
  // 1. Khi bấm nút "Thêm mới"
  //   const handleAddClick = () => {
  //     setEditingCategory(null);
  //     setIsViewMode(false); // Mode nhập liệu (cho phép sửa)
  //     setShowForm(true);
  //   };

  // 2. Khi bấm nút "Sửa" (Cây bút)
  // const handleEditClick = async (id: string) => {
  //   const detail = await handleFetchDetail(id);
  //   if (detail) {
  //     setEditingCategory(detail);
  //     setIsViewMode(false); // Mode chỉnh sửa (cho phép sửa)
  //     setShowForm(true);
  //   }
  // };

  // 3. Khi bấm nút "Xem" (Con mắt)
  const handleViewClick = async (id: string) => {
    const detail = await handleFetchDetail(id);
    if (detail) {
      setEditingCategory(detail);
      setIsViewMode(true); // Mode xem (chỉ đọc, bị disabled)
      setShowForm(true);
    }
  };
  const handleSave = async (form: any) => {
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, form);
        toast.success('Cập nhật danh mục thành công!');
      } else {
        await api.post(`/categories`, form);
        toast.success('Tạo danh mục mới thành công!');
      }
      fetchCategories();
      setShowForm(false);
      setEditingCategory(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gặp lỗi khi lưu dữ liệu');
    }
  };

 


  // HÀM XỬ LÝ TẠM NGƯNG (SỬ DỤNG DELETE API)
  //   const handleDelete = async (category : Category) => {
  //     const result = await Swal.fire({
  //       title: 'Xác nhận Tạm ngưng?',
  //       text: `Danh mục "${category.name}" sẽ bị ẩn đi (chuyển sang inactive). Bạn có chắc chắn?`,
  //       icon: 'warning',
  //       showCancelButton: true,
  //       confirmButtonColor: '#d33', // Vẫn giữ màu đỏ cho dễ nhận diện
  //       cancelButtonColor: '#3085d6',
  //       confirmButtonText: 'Đồng ý, ',
  //       cancelButtonText: 'Hủy bỏ'
  //     });

  //     if (!result.isConfirmed) {
  //       return;
  //     }

  //     try {
  //       // Gọi API DELETE để chuyển trạng thái thành inactive
  //       await api.delete(`/categories/${category.id}`); 
  //       
  //       toast.success(`Đã tạm ngưng danh mục "${category.name}"`);
  //     
  //       const updated = await fetchCategories();
  //       setCategories(updated); 

  //     } catch (err: any) {
  //       const message = err.response?.data?.message || 'Thao tác thất bại. Vui lòng thử lại.';
  //       toast.error(message);
  //     }
  //   };

  // HÀM XỬ LÝ KHÔI PHỤC (KHÔNG SWAL)
  const handleRestoreCategory = async (category: Category) => {
    try {
      await api.put(`/categories/${category.id}/status`, { status: 'active' });
      toast.success(`Đã khôi phục danh mục "${category.name}"`);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Khôi phục thất bại.');
    }
  };


  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
     <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl transition-all duration-300 ${
         theme === 'light' ? 'bg-white shadow-sm border border-gray-100' : 'glass-panel glass-panel-dark'
      }`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-bitex-primary dark:text-white">
            Quản lý Danh mục
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* <button
            onClick={handleAddClick}
            className="flex items-center space-x-2 px-4 py-2.5 bg-bitex-accent hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Thêm mới</span>
          </button> */}
          <button
            onClick={fetchCategories}
            className="flex items-center space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
            title="Tải lại"
          >
            <RotateCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Tải lại</span>

          </button>
        </div>
      </div>
      {/* Search + Filter */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 ${
         theme === 'light' ? 'bg-white shadow-sm border-gray-200' : 'glass-panel glass-panel-dark border-white/5'
      }`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên "
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* Table */}
     <div className={`rounded-2xl overflow-hidden border transition-all duration-300 relative flex flex-col ${
         theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'glass-panel glass-panel-dark border-white/5'
      }`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className={`text-xs uppercase font-bold tracking-wider sticky top-0 z-10 ${
               theme === 'light' ? 'bg-gray-50 text-gray-600 border-b border-gray-200' : 'bg-white/5 text-gray-400 border-b border-white/5'
            }`}>
              <tr>
                <th className="p-4 w-20">Mã ngành</th>
                <th className="p-4">Tên ngành</th>
                <th className="p-4 hidden sm:table-cell">Mô tả</th>
                <th className="p-4 text-center">Nhân sự</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
              {filteredCategories.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    Không tìm thấy danh mục nào
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const isActive = cat.status === 'active';
                  // Đếm số lượng user (nếu API trả về mảng users)
                  const userCount = Array.isArray(cat.users) ? cat.users.length : 0;

                  return (
                    <tr key={cat.id} className={`group hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors ${!isActive ? 'opacity-60 bg-gray-50 dark:bg-black/20' : ''}`}>
                      <td className="p-4">
                         <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                           {cat.id}
                         </span>
                      </td>
                      <td className="p-4 font-medium text-gray-900 dark:text-white">
                         <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}>
                               <Folder className="h-4 w-4" />
                            </div>
                            {cat.name}
                         </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-gray-500 dark:text-gray-400 truncate max-w-xs">
                         {cat.description || '-'}
                      </td>
                      <td className="p-4 text-center">
                         {userCount > 0 ? (
                           <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300" title={`${userCount} người phụ trách`}>
                              <Users className="h-4 w-4" /> <span>{userCount}</span>
                           </div>
                         ) : (
                           <span className="text-gray-400 text-xs">-</span>
                         )}
                      </td>
                      <td className="p-4 text-center">
                         {isActive ? (
                           <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                             <CheckCircle size={12} className="mr-1" /> Active
                           </span>
                         ) : (
                           <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border border-gray-200 dark:border-gray-500/20">
                             <XCircle size={12} className="mr-1" /> Inactive
                           </span>
                         )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isActive ? (
                             <>
                                <button
                                  onClick={() => handleViewClick(cat.id)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
                                  title="Xem chi tiết"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {/* <button
                                  onClick={() => handleEditClick(cat.id)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-4 w-4" />
                                </button> */}
                             </>
                          ) : (
                             <button
                               onClick={() => handleRestoreCategory(cat)}
                               className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 text-green-600 dark:text-green-400 transition-colors"
                               title="Khôi phục"
                             >
                               <RotateCcw className="h-4 w-4" />
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Form */}
      {showForm && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditingCategory(null);
          }}
          readOnly={isViewMode}
        />
      )}

    </div>
  );
};

export default CategoriesPage;