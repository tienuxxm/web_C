import axios from 'axios';

const basePath = import.meta.env.VITE_BASE_PATH;
const api = axios.create({
baseURL: basePath === '/' ? '/api' : `${basePath}api`,  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      console.warn('Phiên đăng nhập hết hạn.');
      localStorage.removeItem('user');
      localStorage.removeItem('token');

      const basePath = import.meta.env.VITE_BASE_PATH; 
      const loginUrl = `${basePath}login`.replace('//', '/');
      if (window.location.pathname !== loginUrl) {
         window.location.href = loginUrl;
      }
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);



export default api;
