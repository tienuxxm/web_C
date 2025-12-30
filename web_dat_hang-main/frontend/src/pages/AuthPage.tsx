import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import BackgroundEffects from '../components/BackgroundEffects';
import api from '../services/api';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      api.post('/admin/send-reminders')
        .then(() => console.log('Đã kích hoạt quét đơn hàng ngầm.'))
        .catch(err => console.error('Lỗi kích hoạt nhắc nhở:', err));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại');
    }
  };

  /* ---- REGISTER ---- */
  const handleRegister = async (formData: any) => {
    try {
      const { data } = await api.post('/register', formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng ký thất bại');
    }
  };

  /* ---- UI ---- */
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <BackgroundEffects />
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-2xl bg-white/10 dark:bg-black/30 border border-white/20 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] animate-fade-in-up">
            {isRegister ? (
              <>
                <RegisterForm onSubmit={handleRegister} />
                <p className="text-sm text-gray-300 text-center mt-4">
                  Đã có tài khoản?{' '}
                  <button
                    onClick={() => {
                      setIsRegister(false);
                      setError('');
                    }}
                    className="text-indigo-400 hover:underline"
                  >
                    Đăng nhập
                  </button>
                </p>
              </>
            ) : (
              <>
                <LoginForm onSubmit={handleLogin}
                  onSwitchToRegister={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                />

              </>
            )}

            {error && (
              <div className="mt-4 text-red-200 bg-red-500/20 p-2 rounded-lg text-sm text-center border border-red-500/30">{error}</div>)}
          </div>
        </div>
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
    </div>
  );
}
