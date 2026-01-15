import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Hàm giải mã JWT đơn giản (không cần cài thêm thư viện jwt-decode)
function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

const MagicAuthHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const redirectPath = searchParams.get('redirect') || '/';
    const openOrderCode = searchParams.get('open_order');

    if (token) {
      // 1. Lưu Token
      localStorage.setItem('token', token);

      // 2. GIẢI MÃ TOKEN ĐỂ LẤY USER INFO (Bước quan trọng để fix lỗi)
      const decodedData = parseJwt(token);
      
      if (decodedData) {
          // Tạo object user giống cấu trúc lúc login thường
          const userObj = {
              name: decodedData.name,
              email: decodedData.sub, // 'sub' thường là ID hoặc email trong JWT chuẩn
              role: decodedData.role, // Lấy Role để RoleBasedRedirect hoạt động
              code: decodedData.code,
              department: decodedData.department
          };

          // Lưu User vào localStorage
          localStorage.setItem('user', JSON.stringify(userObj));
          console.log("✅ Đã khôi phục user từ Token:", userObj);
      }

      // 3. Lưu lệnh mở đơn hàng
      if (openOrderCode) {
        sessionStorage.setItem('AUTO_OPEN_ORDER_CODE', openOrderCode);
      }

      // 4. Chuyển hướng
      // Dùng window.location để đảm bảo App reload và nhận diện localStorage mới
      window.location.href = redirectPath; 
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-700">Đang đăng nhập...</h2>
        <p className="text-gray-500">Vui lòng đợi trong giây lát.</p>
      </div>
    </div>
  );
};

export default MagicAuthHandler;