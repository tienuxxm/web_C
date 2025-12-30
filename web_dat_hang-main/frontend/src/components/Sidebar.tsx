import React, { useState } from 'react';
import type { Pagetype } from '../layouts/DashboardLayout';
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  Package, 
  Settings, 
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Home
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
interface SidebarProps {
  collapsed: boolean;
  userRole: string;
  userDepartment: string;
  currentPage: Pagetype;
  onPageChange: (page: Pagetype) => void;
  isMobile?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children?: MenuItem[];
  roles?: string[];
  department?: string[];
  page?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  userRole, 
  userDepartment, 
  currentPage, 
  onPageChange,
  isMobile = false 
}) => {
   console.log('userRole', userRole);
   console.log('userDepartment', userDepartment);
  const { theme } = useTheme();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home className="h-5 w-5" />,
      page: 'dashboard',
      roles:[]
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="h-5 w-5" />,
      page: 'dashboard',
     roles:[]
    },
    {
      id: 'orders',
      label: 'Đơn hàng',
      icon: <ShoppingCart className="h-5 w-5" />,
      //badge: 3,
      // department: ['CUNG_UNG','KINH_DOANH','HANH_CHANH','Công nghệ thông tin (IT)','Cung ứng','Hành chính - Miền Nam'],
      roles: ['Administrator','Supply','Sales','Leader'],
      children: [
        { id: 'orders-all', label: 'Tất cả đơn hàng', icon: <FileText className="h-4 w-4" />, page: 'orders',roles:['Sales','Supply','Administrator'] },
        { id: 'orders-monthly', label: 'Monthly Orders', icon: <FileText className="h-4 w-4" />, page: 'ordersMonthly',roles:[] },
        { id: 'orders-yearly', label: 'Yearly Orders', icon: <FileText className="h-4 w-4" />, page: 'ordersYearly',roles:[] },
        { id: 'orders-merged', label: 'Đơn hàng đã gộp', icon: <FileText className="h-4 w-4" />, page: 'ordersMerged' ,roles:['Supply','Leader','Administrator']},
        { id: 'orders-completed', label: 'Đơn hàng đã hoàn thành', icon: <FileText className="h-4 w-4" />, page: 'ordersCompleted' },
        { id: 'orders-cancelled', label: 'Cancelled', icon: <FileText className="h-4 w-4" />, page: 'orders',roles: [] },
      ]
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: <Users className="h-5 w-5" />,
      roles: [],

      children: [
        { id: 'customers-all', label: 'All Customers', icon: <Users className="h-4 w-4" />, page: 'customers' },
        { id: 'customers-active', label: 'Active', icon: <Users className="h-4 w-4" />, page: 'customers' },
        { id: 'customers-inactive', label: 'Inactive', icon: <Users className="h-4 w-4" />, page: 'customers' },
      ]
    },
    {
      id: 'products',
      label: 'Sản phẩm',
      icon: <Package className="h-5 w-5" />,
      children: [
        { id: 'products-all', label: 'Tất cả sản phẩm', icon: <Package className="h-4 w-4" />, page: 'products' },
        { id: 'products-categories', label: 'Ngành hàng', icon: <Package className="h-4 w-4" />, page: 'productsCategories' },
        { id: 'products-inventory', label: 'Inventory', icon: <Package className="h-4 w-4" />, page: 'products',roles: [] },
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <TrendingUp className="h-5 w-5" />,
      roles: [],

      children: [
        { id: 'analytics-sales', label: 'Sales Report', icon: <BarChart3 className="h-4 w-4" /> },
        { id: 'analytics-customers', label: 'Customer Analytics', icon: <Users className="h-4 w-4" /> },
        { id: 'analytics-products', label: 'Product Performance', icon: <Package className="h-4 w-4" /> },
      ]
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: <Settings className="h-5 w-5" />,
      roles: [],
    
      children: [
        { id: 'settings-general', label: 'General', icon: <Settings className="h-4 w-4" /> },
        { id: 'settings-users', label: 'User Management', icon: <Users className="h-4 w-4" /> },
        { id: 'settings-permissions', label: 'Permissions', icon: <Settings className="h-4 w-4" /> },
      ]
    },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemVisible = (item: MenuItem) => {
  // roles whitelist
  if (item.roles && !item.roles.includes(userRole)) return false;
    if (userRole === 'giam_doc') return true;


  // departments whitelist
  if (item.department && !item.department.includes(userDepartment)) return false;

  return true;  // không rơi vào điều kiện cấm ⇒ hiển thị
};


  const handleItemClick = (item: MenuItem) => {
    if (item.page) {
      onPageChange(item.page as Pagetype);
    } else if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    }
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (!isItemVisible(item)) return null;

    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.page === currentPage;
    const isLight = theme === 'light'; // Biến kiểm tra theme

   // 1. Base Styles (Bo tròn, transition mượt)
    const baseClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
      level > 0 ? 'ml-4 text-sm mt-1' : 'mb-1'
    }`;

    // 2. State Classes (Màu sắc theo Theme & Active)
    let stateClasses = '';
    if (isActive) {
      if (isLight) {
        stateClasses = 'bg-bitex-secondary text-white font-semibold shadow-inner border border-white/10'; // Light: Xanh đậm + Chữ trắng
      } else {
        stateClasses = 'bg-white/10 text-blue-300 font-semibold shadow-sm border border-white/5'; // Dark: Kính sáng + Chữ xanh neon
      }
    } else {
      if (isLight) {
        stateClasses = 'text-blue-100 hover:bg-white/10 hover:text-white'; // Light: Chữ xanh nhạt -> Trắng khi hover
      } else {
        stateClasses = 'text-gray-400 hover:bg-white/5 hover:text-gray-200'; // Dark: Chữ xám -> Sáng khi hover
      }
    }

    // 3. Content của nút bấm
    const content = (
      <div className={`${baseClasses} ${stateClasses}`}>
        {/* Background active overlay hiệu ứng */}
        {isActive && <div className="absolute inset-0 bg-white/5 animate-pulse rounded-xl" />}
        
        <div className="flex items-center space-x-3 relative z-10">
          {/* Icon Scale Effect */}
          <div className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
            {item.icon}
          </div>
          {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        </div>

        {/* Chevron & Badge */}
        {!collapsed && (
          <div className="flex items-center space-x-2 relative z-10">
            {item.badge && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <div className={`opacity-70 group-hover:opacity-100 transition-opacity`}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            )}
          </div>
        )}
      </div>
    );

    return (
      <div key={item.id}>
        <button onClick={() => handleItemClick(item)} className="w-full text-left">
          {content}
        </button>
        
        {/* Submenu với Animation fade-in-up */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1 animate-fade-in-up">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // --- RETURN CHÍNH (SIDEBAR CONTAINER) ---
  return (
    <aside className={`fixed left-4 top-20 h-[calc(100vh-6rem)] rounded-2xl transition-all duration-300 z-20 shadow-xl border ${
      theme === 'light' 
        ? 'bg-bitex-primary border-white/10' // Light: Màu Xanh Navy đặc trưng
        : 'glass-panel glass-panel-dark border-white/10' // Dark: Hiệu ứng kính
    } ${
      isMobile 
        ? collapsed 
          ? '-translate-x-[150%] w-64' 
          : 'translate-x-0 w-64'
        : collapsed 
          ? 'w-20' 
          : 'w-64'
    }`}>
      <div className="p-4 h-full overflow-y-auto custom-scrollbar">
        <nav className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </div>
      
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1] rounded-2xl"
          onClick={() => onPageChange(currentPage)} 
        />
      )}
    </aside>
  );
};

export default Sidebar;