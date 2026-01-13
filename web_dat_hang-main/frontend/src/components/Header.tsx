import React, { useState, useEffect } from 'react';
import {Search,Plus,Bell,ChevronDown,Menu,Mail,LogOut,User,Sun,Moon,} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Swal from '../utils/swal';
import type { Pagetype } from '../layouts/DashboardLayout';
interface HeaderProps {
  user: {
    name: string;
    avatar: string;
    role: string;
    department:string;
  };
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onPageChange?: (page: Pagetype) => void;

}

const Header: React.FC<HeaderProps> = ({ user, onToggleSidebar}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }

  };
  

 

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (!e.target.closest('.search-dropdown')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  // useEffect(() => {
  //   const fetchNotifications = async () => {
  //     try {
  //       const res = await api.get('/notifications');
  //       const notiList = res.data.notifications || [];
  //       setNotifications(notiList);
  //     } catch (error) {
  //       console.error('Lỗi khi lấy thông báo:', error);
  //     }
  //   };

  //   fetchNotifications();
  // }, []);

  const handleToggleNotifications = async () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);

    if (nextState) {
      try {
        await api.post('/notifications/mark-read'); // 👈 Gọi API BE cập nhật
        setTimeout(() => {
          setNotifications([]); // 👈 Dọn thông báo sau 30s (hoặc tuỳ ý)
        }, 30000);
      } catch (err) {
        console.error('Lỗi mark-read:', err);
      }
    }
  };
  const handleSendReminders = async () => {
    // 1. Hiển thị Popup xác nhận (Dùng Swal cấu hình sẵn)
    const result = await Swal.fire({
      title: 'Gửi email nhắc nhở?',
      text: 'Hệ thống sẽ quét và gửi email cho TẤT CẢ user có đơn hàng Pending (Chờ xử lý).',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Gửi ngay',
      cancelButtonText: 'Hủy bỏ'
    });

    if (!result.isConfirmed) return;

    const loadingToastId = toast.loading('Đang gửi lệnh gửi mail...');

    try {
      const response = await api.post('/admin/send-reminders',{force:true});

      toast.dismiss(loadingToastId); 

      Swal.fire({
        title: 'Thành công!',
        text: response.data.message || 'Đã gửi mail nhắc nhở xong.',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error: any) {
      toast.dismiss(loadingToastId); 

      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi gửi mail.';

      // Hiển thị lỗi bằng Swal
      Swal.fire({
        title: 'Lỗi!',
        text: errorMsg,
        icon: 'error'
      });
    }
  };
  return (
    <header className={`h-16 mx-4 mt-2 rounded-xl flex items-center px-6 relative z-30 sticky top-2 shadow-sm transition-colors duration-300 ${
      theme === 'light' 
        ? 'bg-white text-bitex-primary border border-gray-200' // White with Navy text for Light Mode
        : 'glass-panel glass-panel-dark text-gray-100' // Glass for Dark Mode
    }`}>
      <div className="flex items-center space-x-4">
        <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/20 transition-all active:scale-95 border border-transparent dark:border-white/10">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
            <img
              src="/web_dat_hang-main/public/assets/Bitex_logo.png"
              alt="BITEX"
              className="h-6 sm:h-8 w-auto"
            />
          </div>
          {/* {!sidebarCollapsed && (
            <span className="text-lg sm:text-xl font-bold text-white hidden sm:block">Dashboard</span>
          )} */}
        </div>
        <span className="text-xl font-bold tracking-wide">
          BitexOrders
        </span>
      </div>

      <div className="flex-1"></div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-all hover:rotate-12 border border-transparent dark:border-white/10"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-300" /> : <Moon className="h-5 w-5 text-bitex-primary" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-1.5 pr-4 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-all border border-transparent dark:border-white/10"
          >
            <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white p-[2px]">
               <div className="h-full w-full rounded-full bg-bitex-secondary flex items-center justify-center">
                 <User className="h-4 w-4 text-white" />
               </div>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold tracking-wide">{user.name}</p>
            </div>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </button>

          {showUserMenu && (
            <div className={`absolute right-0 mt-3 w-48 rounded-xl p-2 z-50 animate-fade-in-up border ${
              theme === 'light' 
                ? 'bg-white border-gray-200 shadow-xl text-gray-800' 
                : 'glass-panel-dark border-white/10 text-white'
            }`}>
              <button
                  onClick={handleSendReminders}
                  className="w-full flex items-center space-x-3 px-2 sm:px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors text-sm"
                >
                  <Mail className='h-4 w-4'/>
                  <span>Mail</span>                  
                </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 text-bitex-accent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm transition-colors font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
