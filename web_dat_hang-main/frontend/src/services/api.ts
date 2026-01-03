import axios from 'axios';

// 1. Tạo instance (Code cũ của bạn)
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Hoặc URL API của bạn
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor: Tự động gắn Token vào mỗi request (Code cũ có thể đã có)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Hoặc lấy từ nơi bạn lưu token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. 👇 QUAN TRỌNG: Response Interceptor (Xử lý khi Token hết hạn)
api.interceptors.response.use(
  (response) => {
    // Nếu API trả về thành công (200, 201...), trả về data bình thường
    return response;
  },
  (error) => {
    // Nếu API trả về lỗi
    if (error.response && error.response.status === 401) {
      // 401: Unauthorized (Token hết hạn hoặc không hợp lệ)
      console.warn('Phiên đăng nhập hết hạn. Đang đăng xuất...');

      // B1: Xóa sạch dữ liệu trong localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      // B2: Chuyển hướng về trang Login
      // Lưu ý: Dùng window.location.href để reload lại trang cho sạch state
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    
    // Trả về lỗi để các component cụ thể có thể xử lý thêm (nếu cần)
    return Promise.reject(error);
  }
);

export default api;