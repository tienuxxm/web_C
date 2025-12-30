import React, { useState, useEffect } from 'react';
import { X, Folder, Plus, Trash2, Mail, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { createPortal } from 'react-dom';
interface Category {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  prefix: string;
  user_emails?: string[];
}

interface CategoryModalProps {
  category: Category | null;
  onSave: (category: Omit<Category, 'id'> & { user_emails?: string[] }) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, onSave, onClose, readOnly = false }) => {
  const { theme } = useTheme();
 const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
    prefix: '',
  });
  const [userEmails, setUserEmails] = useState<string[]>([]);
  useEffect(() => {
    if (category) {
      setFormData({
        id: category.id,
        name: category.name,
        description: category.description,
        status: category.status,
        prefix: category.prefix,
      });
      if (category.user_emails && Array.isArray(category.user_emails)) {
        setUserEmails(category.user_emails);
      }
      else if ('users' in category && Array.isArray((category as any).users)) {
        const rawUsers = (category as any).users;
        if (rawUsers.length > 0 && typeof rawUsers[0] === 'string') {
          setUserEmails(rawUsers);
        } else {
          const emails = rawUsers.map((u: any) => u.email || '');
          setUserEmails(emails);
        }
      }
      else {
        setUserEmails([]);
      }
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        status: 'active',
        prefix: '',
      });
      setUserEmails([]);
    }
  }, [category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      user_emails: userEmails.filter(email => email.trim() !== '')
    };
    onSave(payload);
  };

  const addUserEmail = () => { setUserEmails([...userEmails, '']); };
  const updateUserEmail = (index: number, value: string) => {
    const updated = [...userEmails];
    updated[index] = value;
    setUserEmails(updated);
  };

  const removeUserEmail = (index: number) => {
    const updated = [...userEmails];
    updated.splice(index, 1);
    setUserEmails(updated);
  };
  //   useEffect(() => {
  //   if (category) {
  //     setFormData({
  //       name: category.name,
  //       description: category.description,
  //       status: category.status,
  //       prefix: category.prefix,
  //     });

  //     // Gán danh sách email từ category.users
  //     if ('users' in category && Array.isArray((category as any).users)) {
  //       const users = (category as any).users as { email: string }[];
  //       const emails = users.map(u => u.email);
  //       setUserEmails(emails);
  //     } else {
  //       setUserEmails([]);
  //     }
  //   }
  // }, [category]);


  const modalClass = theme === 'light'
    ? 'bg-white border-gray-200 shadow-2xl'
    : 'glass-panel glass-panel-dark border-white/10';

  const inputClass = `w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all text-sm sm:text-base ${theme === 'light'
      ? 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-blue-500/30'
      : 'bg-gray-800/50 border-gray-700 text-white focus:ring-blue-500/50 placeholder-gray-500'
    } disabled:opacity-60 disabled:cursor-not-allowed`;

  const labelClass = `block text-xs sm:text-sm font-medium mb-1.5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'
    }`;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col ${modalClass}`}>

        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${theme === 'light' ? 'border-gray-100' : 'border-white/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}>
              <Folder className="h-6 w-6" />
            </div>
            <h2 className={`text-lg sm:text-xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
              {readOnly ? 'Chi tiết danh mục' : (category ? 'Cập nhật danh mục' : 'Thêm danh mục mới')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Row 1: Name & Prefix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tên danh mục <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={readOnly}
                required
                placeholder="Nhập tên..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Mã ngành<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleChange}
                disabled={readOnly}
                required
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: Assigned Users */}
          <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                <Mail className="h-4 w-4" /> Người phụ trách
              </h3>
              {!readOnly && (
                <button
                  type="button"
                  onClick={addUserEmail}
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Thêm
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {userEmails.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center py-2">Chưa có người phụ trách</p>
              )}
              {userEmails.map((email, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateUserEmail(index, e.target.value)}
                    placeholder="example@bitex.com.vn"
                    disabled={readOnly}
                    className={inputClass}
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => removeUserEmail(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Description */}
          <div>
            <label className={labelClass}>Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={readOnly}
              placeholder="Mô tả chi tiết..."
              className={`${inputClass} resize-none`}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${theme === 'light'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
            >
              {readOnly ? 'Đóng' : 'Hủy'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
              >
                <Save className="h-4 w-4" />
                {category ? 'Cập nhật' : 'Tạo mới'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CategoryModal;