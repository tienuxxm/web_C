// src/services/api.ts
import axios, { InternalAxiosRequestConfig } from 'axios';

// Lấy base path, nếu không có thì mặc định là '/'

const api = axios.create({
baseURL: '/web_dat_hang-main/api',  
  
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');

  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  return config;
});



export default api;
