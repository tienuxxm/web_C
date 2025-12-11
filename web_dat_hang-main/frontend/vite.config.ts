import { defineConfig, loadEnv } from 'vite'; // Nhớ import loadEnv
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load các biến môi trường

  return {
    plugins: [react()],
    // 👇 Tự động đổi base tùy theo môi trường
    base: '/web_dat_hang-main/',
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      outDir: '../public',
      emptyOutDir: false,
    }
  };
});