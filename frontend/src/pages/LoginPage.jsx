import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. GỌI API ĐĂNG NHẬP THẬT
      const response = await fetch('https://pbl3-sofd.onrender.com/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Backend của bạn cần 'username' hoặc 'email' tùy quy định
        // Ở đây mình gửi cả username (nhập từ input)
        body: JSON.stringify({ 
            username: username, 
            password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 2. NẾU THÀNH CÔNG: DỮ LIỆU TỪ SERVER SẼ CHỨA THÔNG TIN ĐÃ SỬA (Tên mới, Avatar mới...)
        // Backend thường trả về dạng: { message: "...", user: { ... } }
        // Hoặc trả về token. Ở đây giả sử data.user hoặc data.session chứa thông tin user.
        
        // Kiểm tra cấu trúc trả về của API bạn (bạn có thể console.log(data) để xem)
        // Giả sử API trả về object user nằm trong data.user hoặc chính là data
        const userData = data.user || data.session || data; 

        // Đảm bảo có trường language (nếu backend chưa có thì mặc định 'vi')
        const finalUser = { ...userData, language: userData.language || 'vi' };

        // 3. LƯU VÀO CONTEXT & LOCALSTORAGE
        localStorage.setItem('session', JSON.stringify(finalUser));
        setUser(finalUser);

        alert(`Đăng nhập thành công! Chào mừng ${finalUser.fullName || finalUser.username}.`);
        navigate('/home'); 
      } else {
        // Xử lý lỗi từ backend (sai pass, không tìm thấy user...)
        setError(data.message || "Tên đăng nhập hoặc mật khẩu không đúng.");
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

          {/* Hiển thị lỗi nếu có */}
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

          <p className="mt-6 text-center text-gray-500 text-sm font-medium">
            Chưa có tài khoản? <span className="text-indigo-600 font-bold cursor-pointer hover:underline" onClick={() => navigate('/auth')}>Đăng ký ngay</span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;