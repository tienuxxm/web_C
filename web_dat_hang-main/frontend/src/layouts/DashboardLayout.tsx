import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom'; // 👈 1. Import quan trọng
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import BackgroundEffects from '../components/BackgroundEffects';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout() {
  const navigate = useNavigate();
  
  // Lấy user từ localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 2. Kiểm tra Auth ngay khi mount (Bảo mật)
  useEffect(() => {
    if (!user) {
      // Nếu không tìm thấy user, đá về trang login
      // Lưu ý: api.ts đã lo vụ hết hạn token, đây là check phụ
      navigate('/login');
    }
  }, [user, navigate]);

  // Check mobile responsive
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true); 
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!user) return null; 

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937', 
            color: '#fff',
            borderRadius: '12px', // Bo góc đẹp hơn chút
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#d1fae5' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fee2e2' },
          },
        }}
      />

      {/* Container chính: Màu nền lấy từ index.css hoặc fallback */}
      <div className="min-h-screen relative overflow-hidden transition-colors duration-300">        
        <BackgroundEffects />
        
        <div className="relative z-10 flex flex-col min-h-screen">          
          <Header
            user={user}
            onToggleSidebar={() => setCollapsed(!collapsed)}
            sidebarCollapsed={collapsed}
            // onPageChange={setCurrentPage} -> ❌ Đã xóa prop này
          />

          <div className="flex flex-1 pt-4 relative">
            <Sidebar
              collapsed={collapsed}
              userRole={user.role}
              userDepartment={user.department}
              isMobile={isMobile}
              
            />
            
            <main 
              className={`flex-1 transition-all duration-300 overflow-y-auto ${
                isMobile 
                  ? 'ml-0 w-full' 
                  : collapsed 
                    ? 'ml-20'  
                    : 'ml-64'
              }`}
            >
              <div className="p-4 sm:p-6 pb-20 animate-fade-in">
                {/* 👇 3. OUTLET: Nơi React Router sẽ tự động điền các trang con vào */}
                {/* (OrdersPage, MyOrdersPage, ProductsPage...) */}
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}