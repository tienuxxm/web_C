import { Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface StatConfig {
  label: string;
  color: string; 
  icon: any;
  description: string;
  bg: string;
}

export const getStatConfig = (
  role: string | undefined, 
  dept: string | undefined
): { pending: StatConfig; processing: StatConfig } => {
    
  // --- 1. KINH DOANH (SALES) ---
  if ( role === 'Sales') {
    return {
      pending: {
        label: 'Chờ duyệt',
        description: 'Đơn cần hoàn thiện gửi đi',
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10',
        icon: AlertCircle
      },
      processing: {
        label: 'Đang xử lý',
        description: 'Đã gửi Cung ứng/Sếp',
        color: ' text-blue-500',
        bg: 'bg-blue-500/10',
        icon: Clock
      }
    };
  }

  // --- 2. CUNG ỨNG (SUPPLY) ---
  if (role === 'Supply' ) {
    return {
      pending: {
        label: 'Chờ duyệt',
        description: 'Đơn mới từ Sales hoặc Đã duyệt',
        color: ' text-red-500', // Màu đỏ để báo động việc cần làm ngay
        bg: 'bg-red-500/10',
        icon: AlertCircle
      },
      processing: {
        label: 'Đang xử lý',
        description: 'Chờ sếp duyệt hoặc chờ hàng về',
        color: ' text-indigo-500',
        bg: 'bg-indigo-500/10',
        icon: TrendingUp
      }
    };
  }

  // --- 3. GIÁM ĐỐC (LEADER) ---
  if ( role === 'Leader') {
    return {
      pending: {
        label: 'Chờ duyệt',
        description: 'Đơn cần phê duyệt ngay',
        color: ' text-orange-500',
        bg: 'bg-orange-500/10',
        icon: AlertCircle
      },
      processing: {
        label: 'Đang xử lý',
        description: 'Đơn đã duyệt, đang chạy',
        color: ' text-emerald-500',
        bg : 'bg-emerald-500/10',
        icon: CheckCircle2
      }
    };
  }

  // --- MẶC ĐỊNH ---
  return {
    pending: { label: 'Chờ duyệt', description: 'Pending', color: 'bg-gray-500/10', bg: 'bg-gray-500/10',icon: Clock },
    processing: { label: 'Đang xử lý', description: 'Processing', color: 'bg-blue-500/10',bg: 'bg-blue-500/10', icon: TrendingUp }
  };
};

