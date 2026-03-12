import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Lắng nghe khi Google redirect về app
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          localStorage.setItem('session', JSON.stringify(session.user));
          setUser(session.user);
          navigate('/home');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });
    if (error) setError('Lỗi đăng nhập Google: ' + error.message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Gọi API đăng nhập thật
      const response = await fetch('https://pbl3-sofd.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Lấy thông tin user từ response của server
        // (Server trả về gì thì dùng cái đó, chứa info mới nhất)
        const userFromDB = data.user || data.session || data;

        // Lưu vào LocalStorage để reload không mất
        localStorage.setItem('session', JSON.stringify(userFromDB));

        // Cập nhật Context để toàn bộ App biết đã login
        setUser(userFromDB);

        // Chuyển hướng vào trang chủ
        navigate('/home');
      } else {
        setError(data.message || "Sai tên đăng nhập hoặc mật khẩu");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối Server. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans">
      {/* CỘT TRÁI: Branding */}
      <div className="hidden md:flex w-1/2 bg-indigo-900 flex-col justify-center items-center text-white p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <h1 className="text-[200px] font-bold absolute -top-20 -left-20">日</h1>
          <h1 className="text-[200px] font-bold absolute bottom-10 right-10">本</h1>
        </div>

        <div className="z-10 text-center">
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: "'Yuji Syuku', serif" }}>Kanji Master AI</h1>
          <p className="text-xl text-indigo-200">Chinh phục tiếng Nhật với sức mạnh AI</p>
        </div>
      </div>

      {/* CỘT PHẢI: Form Đăng nhập */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleLogin} className="w-full max-w-md">
          <h2 className="text-3xl font-black text-gray-800 mb-2 text-center uppercase">Chào mừng trở lại!</h2>
          <p className="text-gray-500 text-center mb-8 font-medium">Vui lòng đăng nhập để đồng bộ dữ liệu.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg text-center animate-pulse">
              ⚠️ {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Tên đăng nhập / Email</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-bold text-gray-700"
              placeholder="Sensei..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-xs font-bold mb-2 uppercase tracking-wide">Mật khẩu</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-bold text-gray-700"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-indigo-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-indigo-700 transition duration-300 shadow-lg transform active:scale-95 uppercase tracking-widest ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}>
            {isLoading ? "Đang kiểm tra..." : "ĐĂNG NHẬP NGAY"}
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="px-3 text-gray-400 text-sm">hoặc</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition duration-300 font-bold text-gray-700 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng nhập bằng Google
          </button>

          <p className="mt-6 text-center text-gray-500 text-sm font-medium">
            Chưa có tài khoản? <span className="text-indigo-600 font-bold cursor-pointer hover:underline" onClick={() => navigate('/auth')}>Đăng ký ngay</span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;