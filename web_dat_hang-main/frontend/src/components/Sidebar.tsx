import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; 
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
  Home,
  History // Thêm icon History nếu cần
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  collapsed: boolean;
  userRole: string;
  userDepartment: string;
  // 👈 2. Đã bỏ currentPage và onPageChange
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
  path?: string; 
  hiden?:boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  userRole, 
  userDepartment, 
  isMobile = false 
}) => {
  const { theme } = useTheme();
  const location = useLocation(); // 👈 4. Lấy URL hiện tại
  const [expandedItems, setExpandedItems] = useState<string[]>(['orders', 'products']); // Mặc định mở đơn hàng & SP

  // --- CẤU HÌNH MENU (Đã map sang đường dẫn Router) ---
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/', 
      hiden:true
    },
    {
      id: 'my-orders',
      label: 'Lịch sử đơn hàng', // Thêm mục này như đã bàn
      icon: <History className="h-5 w-5" />,
      path: '/my-orders',
      roles:[]
    },
    {
      id: 'orders',
      label: 'Đơn hàng',
      icon: <ShoppingCart className="h-5 w-5" />,
      roles: ['Administrator','Supply','Sales','Leader'],
      children: [
        { id: 'orders-all', label: 'Tất cả đơn hàng', icon: <FileText className="h-4 w-4" />, path: '/orders', roles:['Sales','Supply','Administrator'] },
        { id: 'orders-merged', label: 'Đơn hàng đã gộp', icon: <FileText className="h-4 w-4" />, path: '/orders-merged', roles:['Supply','Leader','Administrator'] },
        { id: 'orders-completed', label: 'Đơn đã hoàn thành', icon: <FileText className="h-4 w-4" />, path: '/orders-completed' },
      ]
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: <Users className="h-5 w-5" />,
      roles: [],
      hiden:true,
      children: [
        { id: 'customers-all', label: 'All Customers', icon: <Users className="h-4 w-4" />, path: '/dashboard/customers' },
        { id: 'customers-active', label: 'Active', icon: <Users className="h-4 w-4" />, path: '/dashboard/customers' }, 
        // Lưu ý: Nếu chung 1 trang khách hàng thì để path giống nhau, 
        // hoặc dùng Query Param: /dashboard/customers?status=active
      ]
    },
    {
      id: 'products',
      label: 'Sản phẩm',
      icon: <Package className="h-5 w-5" />,
      children: [
        { id: 'products-all', label: 'Tất cả sản phẩm', icon: <Package className="h-4 w-4" />, path: '/products' },
        { id: 'products-categories', label: 'Ngành hàng', icon: <Package className="h-4 w-4" />, path: '/products-categories' },
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <TrendingUp className="h-5 w-5" />,
      roles: [],
      hiden:true,
      children: [
        { id: 'analytics-sales', label: 'Sales Report', icon: <BarChart3 className="h-4 w-4" />, path: '/dashboard/analytics/sales' },
        { id: 'analytics-customers', label: 'Customer Analytics', icon: <Users className="h-4 w-4" />, path: '/dashboard/analytics/customers' },
      ]
    },
    {
      id: 'settings',
      label: 'System Settings',
      hiden:true,
      icon: <Settings className="h-5 w-5" />,
      roles: [],
      children: [
        { id: 'settings-general', label: 'General', icon: <Settings className="h-4 w-4" />, path: '/dashboard/settings' },
      ]
    },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  // Logic kiểm tra phân quyền (Giữ nguyên của bạn)
  const isItemVisible = (item: MenuItem) => {
    if (item.hiden) return false;
    if (userRole === 'Administrator' || userRole === 'giam_doc') return true;
    
    // Roles whitelist
    if (item.roles && item.roles.length > 0 && !item.roles.includes(userRole)) return false;

    // Departments whitelist
    if (item.department && item.department.length > 0 && !item.department.includes(userDepartment)) return false;

    return true; 
  };

  // 👈 5. Logic kiểm tra Active dựa trên URL
  const isActive = (path?: string) => {
    if (!path) return false;
    
    if (location.pathname === path) return true;

    
    if (location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  // --- RENDER MENU ITEM ---
  const renderMenuItem = (item: MenuItem, level = 0) => {
    if (!isItemVisible(item)) return null;

    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    
    // Logic Active mới: Item này active HOẶC con của nó active
    const active = isActive(item.path) || (hasChildren && item.children?.some(child => isActive(child.path)));
    const isLight = theme === 'light';

    // Base Styles
    const baseClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
      level > 0 ? 'ml-4 text-sm mt-1' : 'mb-1'
    }`;

    // State Classes (Màu sắc)
    let stateClasses = '';
    if (active) {
      if (isLight) {
        stateClasses = 'bg-bitex-secondary text-white font-semibold shadow-inner border border-white/10'; 
      } else {
        stateClasses = 'bg-white/10 text-blue-300 font-semibold shadow-sm border border-white/5'; 
      }
    } else {
      if (isLight) {
        stateClasses = 'text-blue-100 hover:bg-white/10 hover:text-white'; 
      } else {
        stateClasses = 'text-gray-400 hover:bg-white/5 hover:text-gray-200'; 
      }
    }

    // Nội dung bên trong nút
    const content = (
      <div className={`${baseClasses} ${stateClasses}`}>
        {/* Effect Active nền */}
        {active && <div className="absolute inset-0 bg-white/5 animate-pulse rounded-xl" />}
        
        <div className="flex items-center space-x-3 relative z-10">
          {/* Icon Scale Effect */}
          <div className={`flex-shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
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
        {item.path && !hasChildren ? (
          // 👈 6. Dùng Link cho item có đường dẫn
          <Link to={item.path}>{content}</Link>
        ) : (
          // Dùng Button cho item cha (để xổ xuống)
          <button onClick={() => toggleExpanded(item.id)} className="w-full text-left">
            {content}
          </button>
        )}
        
        {/* Submenu Animation */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1 animate-fade-in-up">
            {item.children?.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`fixed left-4 top-20 h-[calc(100vh-6rem)] rounded-2xl transition-all duration-300 z-20 shadow-xl border ${
      theme === 'light' 
        ? 'bg-bitex-primary border-white/10' 
        : 'glass-panel glass-panel-dark border-white/10' 
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
      
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1] rounded-2xl"
          onClick={() => {}} 
        />
      )}
    </aside>
  );
};

export default Sidebar;