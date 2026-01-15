import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import MagicAuthHandler from './pages/MagicAuthHandler';
import DashboardLayout from './layouts/DashboardLayout';
import OrderHistoryPage from './components/orders/OrderHistoryPage';
import OrdersPage from './components/orders/OrdersPage';
import ProductsPage from './components/products/ProductsPage';
import CategoriesPage from './components/categories/CategoriesPage';
import CustomersPage from './components/customers/CustomersPage';

export default function App() {
  
  // 1. Component bảo vệ
  const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    const isAuth = !!localStorage.getItem('token');
    return isAuth ? children : <Navigate to="/login" replace />;
  };

  // 2. Component chặn đăng nhập
  const PublicRoute = ({ children }: { children: JSX.Element }) => {
    const isAuth = !!localStorage.getItem('token');
    return isAuth ? <Navigate to="/" replace /> : children;
  };

  // 3. 👇 LOGIC ĐIỀU HƯỚNG THEO ROLE (Thay thế cho logic cũ trong DashboardLayout)
  const RoleBasedRedirect = () => {
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (!user) return <Navigate to="/login" replace />;

    if (['Sales', 'Supply'].includes(user.role)) {
      return <Navigate to="/orders" replace />;
    }
    return <Navigate to="/orders-merged" replace />;
  };

  return (
    <Routes>
      {/* --- PUBLIC ROUTE: LOGIN --- */}
      {/* Đổi path thành /login cho chuẩn */}
      <Route path="/login" 
        element={
          <PublicRoute>
            <AuthPage />
          </PublicRoute>
        } 
      />
      <Route path="/magic-auth" element={<MagicAuthHandler />} />
      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />

        
        <Route path="my-orders" element={<OrderHistoryPage />} />

        <Route path="orders" element={<OrdersPage mode="normal" filterType="all_orders" />} />
        <Route path="orders-merged" element={<OrdersPage mode="merged" filterType="merged_process" />} />
        <Route path="orders-completed" element={<OrdersPage mode="merged" filterType="merged_completed" />} />
        <Route path="orders-cancelled" element={<OrdersPage mode="normal" filterType="cancelled" />} />
        
        {/* Quản lý sản phẩm */}
        <Route path="products" element={<ProductsPage />} />
        <Route path="products-categories" element={<CategoriesPage />} />

        {/* Khác */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="settings" element={<div className="p-4">Trang Cài đặt</div>} />
        
        {/* Analytics */}
        <Route path="analytics/sales" element={<div className="p-4">Báo cáo doanh số</div>} />
        <Route path="analytics/customers" element={<div className="p-4">Phân tích khách hàng</div>} />

      </Route>

      {/* --- 404 / REDIRECT --- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}