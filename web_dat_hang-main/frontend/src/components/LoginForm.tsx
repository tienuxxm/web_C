import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight , BookOpen} from 'lucide-react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  onSwitchToRegister: () => void;        
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSubmit,
  onSwitchToRegister , // Optional prop to switch to register form
    }) => {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [isLoading, setIsLoading] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
          onSubmit(email, password);
          setIsLoading(false);
        }, 1500);
      };

 return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8 relative">
        <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 backdrop-blur-sm">
          <img 
            src="/web_dat_hang-main/public/assets/Bitex_logo.png" 
            alt="BITEX" 
            className="h-12 w-auto"
          />
        </div>
        <h1 className="text-4xl font-bold text-bitex-primary dark:text-white mb-2 drop-shadow-sm">Chào mừng đến BitexOrders</h1>
        <p className="text-gray-600 dark:text-blue-100 font-medium tracking-wide">Đăng nhập tài khoản của bạn để tiếp tục</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative group">
          <label className="block text-sm font-bold text-gray-700 dark:text-blue-100 mb-2 ml-1">Địa chỉ email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400 dark:text-blue-200 group-focus-within:text-bitex-primary dark:group-focus-within:text-white transition-colors" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/30 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-bitex-primary/50 dark:focus:ring-white/50 focus:border-bitex-primary dark:focus:border-white/50 transition-all duration-300 shadow-sm"
              placeholder="Nhập địa chỉ email của bạn"
              required
            />
          </div>
        </div>

        <div className="relative group">
          <label className="block text-sm font-bold text-gray-700 dark:text-blue-100 mb-2 ml-1">Mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400 dark:text-blue-200 group-focus-within:text-bitex-primary dark:group-focus-within:text-white transition-colors" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/30 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-bitex-primary/50 dark:focus:ring-white/50 focus:border-bitex-primary dark:focus:border-white/50 transition-all duration-300 shadow-sm"
              placeholder="Nhập mật khẩu của bạn"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-blue-200 hover:text-bitex-primary dark:hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full relative overflow-hidden bg-bitex-primary hover:bg-bitex-secondary text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg shadow-bitex-primary/30 disabled:opacity-50"
        >
          <div className="flex items-center justify-center space-x-2 relative z-10">
            {isLoading ? <span className="animate-pulse">Signing in...</span> : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </div>
        </button>
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
        <a 
          // Đường dẫn này trỏ tới file trong thư mục public của Frontend
          href={`${import.meta.env.BASE_URL}docs/Huong_Dan_Su_Dung.pdf`}          
          // Thuộc tính download sẽ ép trình duyệt tải về thay vì mở tab mới
          download="Tai_Lieu_Huong_Dan_Dat_Hang.pdf" 
          
          className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors group"
        >
          <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
            {/* Bạn có thể chọn icon BookOpen hoặc Download */}
            <BookOpen size={16} /> 
          </div>
          <span>Tải tài liệu hướng dẫn sử dụng</span>
        </a>
      </div>
      </form>
    </div>
  );
};

export default LoginForm;
