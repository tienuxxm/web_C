import React, { useState } from 'react';
import { Search, Edit, Trash2, Folder,Eye,RotateCcw  } from 'lucide-react';
import CategoryModal from './CategoryModal';
import api from '../../services/api'; 
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';


interface Category {
  id: string;
  name: string;
  prefix: string;
  status: 'active' | 'inactive';
  description: string; // Optional field for description
  user_emails?: string[]; // Optional field for user emails
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);    
  const filteredCategories = categories.filter(cat => {
  const matchSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());  
  const matchStatus = selectedStatus === 'all' || cat.status === selectedStatus;     
    return matchSearch && matchStatus;
  });
    
  const fetchCategories = async () => {
      const res = await api.get('/categories');
      return res.data.categories;
  };
    
  const handleFetchDetail = async (id: string) => {
    try {
      // Gọi API lấy chi tiết (Hàm show ở Backend)
      const res = await api.get(`/categories/${id}`);
      
      // Dựa vào JSON bạn cung cấp: res.data.categories là object chi tiết
      return res.data.categories; // hoặc res.data.data tùy controller
      
    } catch (error) {
      toast.error("Không thể tải chi tiết danh mục");
      console.error(error);
    }
  };  
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
  const handleSave = async (form: {
      name: string;
      prefix: string;
      status: 'active' | 'inactive';
      description?: string;
      user_emails?: string[];
    }) => {
      try {
        if (editingCategory) {
          await api.put(`/categories/${editingCategory.id}`, form);
          toast.success('Cập nhật danh mục thành công!');

        } else {
          await api.post(`/categories`, form);
          toast.success('Tạo danh mục mới thành công!');

        }
        const updated = await fetchCategories();
        setCategories(updated);
        setShowForm(false);
        setEditingCategory(null);
      } catch (error: any)  {
        toast.error(error.response.data.message||'gặp lỗi khi lưu dữ liệu');
      }
    };
    
  useEffect(() => {
    const load = async () => {
      const data = await fetchCategories();
      setCategories(data);
    };
    load();
  }, [])
    
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
      // Gọi API updateStatus để chuyển trạng thái thành active
      await api.put(`/categories/${category.id}/status`, { status: 'active' });
      
      toast.success(`Đã khôi phục danh mục "${category.name}" thành công!`);
      
      const updated = await fetchCategories(); // Refresh the list
      setCategories(updated);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Khôi phục thất bại.';
      toast.error(message);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white mb-2">Category Management</h1>
          <p className="text-gray-400 text-sm sm:text-base">Manage product categories</p>
        </div>
        <button
          onClick={() => { fetchCategories()}}
          className="flex items-center px-3 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm sm:text-base"
        >
          <RotateCcw  className="h-5 w-5 mr-2" />
          <span className="hidden sm:inline">load Category</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:gap-4 bg-gray-900/40 border border-gray-700/50 p-3 sm:p-4 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400"
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 sm:px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl text-white text-sm sm:text-base"
        >
          <option value="all">All Status</option>
          <option value="active">ACTIVE</option>
          <option value="inactive">INACTIVE</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-gray-900/40 border border-gray-700/50 rounded-xl">
        <table className="w-full text-xs sm:text-sm min-w-[600px]">
          <thead className="bg-gray-800/50 border-b border-gray-700/50">
            <tr>
              <th className="text-left text-gray-300 p-2 sm:p-4">Name</th>
              <th className="text-left text-gray-300 p-2 sm:p-4">Description</th>
              <th className="text-left text-gray-300 p-2 sm:p-4">Status</th>
              <th className="text-left text-gray-300 p-2 sm:p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map(cat => (
              <tr key={cat.id} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                <td className="p-2 sm:p-4 text-white">{cat.name}</td>
                <td className="p-2 sm:p-4 text-gray-300">{cat.description}</td>
                <td className="p-2 sm:p-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                    cat.status === 'active' ? 'text-green-400 bg-green-500/10 border-green-500/30' :
                    'text-gray-400 bg-gray-500/10 border-gray-500/30'
                  }`}>
                    {cat.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-2 sm:p-4">
                  <div className="flex space-x-2">
                    {cat.status === 'active' ? (
                      <>
                        <button
                          onClick={() => handleViewClick(cat.id)} // 👈 Xem chi tiết
                          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-lg transition-colors"
                          >
                          <Eye className="h-4 w-4" />
                        </button>
{/*                         <button 
                          onClick={() => {handleEditClick(cat.id)}}
                          className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat)} // Đã sửa: truyền cat
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                          title="Tạm ngưng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button> */}
                        
                      </>
                    ) : (
                        
                      <button 
                        onClick={() => handleRestoreCategory(cat)}
                        className="p-2 rounded-lg text-green-400 hover:bg-green-500/10"
                        title="Khôi phục"
                      >
                        {/* Dùng Edit icon với màu xanh để tượng trưng cho Restore */}
                        <Edit className="w-4 h-4" /> 
                      </button>
                        
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCategories.length === 0 && (
          <div className="text-center text-gray-400 py-6">
            <Folder className="mx-auto w-6 h-6 sm:w-8 sm:h-8 mb-2" />
            No categories found
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <CategoryModal
          category={editingCategory}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditingCategory(null);}}
          readOnly={isViewMode}  
        />
      )}

    </div>
  );
};

export default CategoriesPage;