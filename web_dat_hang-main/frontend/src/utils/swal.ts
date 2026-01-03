import Swal from 'sweetalert2';

// Tạo instance với cấu hình mặc định (Dark mode + Tailwind)
const MySwal = Swal.mixin({
  // background: '#1f2937', // bg-gray-800
  // color: '#f3f4f6',      // text-gray-100
  customClass: {
    popup: 'rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 !bg-white dark:!bg-gray-900',
    title: 'text-xl font-bold !text-gray-900 dark:!text-white',
    htmlContainer: '!text-gray-600 dark:!text-gray-300',
    confirmButton: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium px-5 py-2.5 rounded-xl mr-3 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95',
    cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-medium px-5 py-2.5 rounded-xl transition-colors'
  },
  buttonsStyling: false // Tắt style mặc định để dùng class Tailwind ở trên
});

export default MySwal;