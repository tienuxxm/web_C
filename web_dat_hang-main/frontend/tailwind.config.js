/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bitex: {
          primary: '#0054A6',   // Xanh Navy Chính
          secondary: '#003D7A', // Xanh Đậm (Hover)
          accent: '#ED1C24',    // Đỏ (Nút/Badge)
          neutral: '#d1dcf2ff',   // Xám nhạt (Nền Light)
          dark: '#131f39ff',      // Xanh Đen (Nền Dark )
        }
      },
      // 👇 2. THÊM HIỆU ỨNG BÓNG ĐỔ (GLOW)
      boxShadow: {
       'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'glass-light': '0 4px 6px -1px rgba(0, 84, 166, 0.05), 0 2px 4px -1px rgba(0, 84, 166, 0.03)',
        'glass-dark': '0 10px 40px -10px rgba(0, 0, 0, 0.7)',     
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