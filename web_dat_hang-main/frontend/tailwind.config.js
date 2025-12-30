/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // 👇 1. THÊM BỘ MÀU CHUẨN BITEX
      colors: {
        bitex: {
          primary: '#0054A6',   // Xanh Navy Chính
          secondary: '#003D7A', // Xanh Đậm (Hover)
          accent: '#ED1C24',    // Đỏ (Nút/Badge)
          neutral: '#dae1efff',   // Xám nhạt (Nền Light)
          dark: '#0F172A',      // Xanh Đen (Nền Dark - QUAN TRỌNG CHO GLASS)
        }
      },
      // 👇 2. THÊM HIỆU ỨNG BÓNG ĐỔ (GLOW)
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(0, 84, 166, 0.10)', // Bóng xanh nhẹ cho Light mode
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.6)',      // Bóng đen sâu cho Dark mode
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};