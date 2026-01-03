import axios from 'axios';

const basePath = import.meta.env.VITE_BASE_PATH;
const api = axios.create({
baseURL: basePath === '/' ? '/api' : `${basePath}api`,  headers: {
    'Content-Type': 'application/json',
  },
});

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Nếu API trả về lỗi
    if (error.response && error.response.status === 401) {
      console.warn('Phiên đăng nhập hết hạn. Đang đăng xuất...');

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);



export default api;
