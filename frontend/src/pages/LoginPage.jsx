// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Giả lập đăng nhập (Sau này sẽ kết nối Backend Python ở đây)
    if (username && password) {
      alert("Đăng nhập thành công! Chào mừng senpai.");
      navigate('/home'); // Chuyển hướng sang Trang chủ
    } else {
      alert("Vui lòng nhập tài khoản!");
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* CỘT TRÁI: Hình ảnh & Branding */}
      <div className="hidden md:flex w-1/2 bg-indigo-900 flex-col justify-center items-center text-white p-10 relative overflow-hidden">
        {/* Trang trí background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <h1 className="text-[200px] font-bold absolute -top-20 -left-20">日</h1>
           <h1 className="text-[200px] font-bold absolute bottom-10 right-10">本</h1>
        </div>
        
        <div className="z-10 text-center">
          <h1 className="text-5xl font-bold mb-4">Kanji Master AI</h1>
          <p className="text-xl text-indigo-200">Chinh phục tiếng Nhật với sức mạnh AI</p>
        </div>
      </div>

      {/* CỘT PHẢI: Form Đăng nhập */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleLogin} className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Chào mừng trở lại!</h2>
          <p className="text-gray-500 text-center mb-8">Vui lòng đăng nhập để tiếp tục học tập</p>

          {/* Input Tài khoản */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Tên đăng nhập</label>
            <input 
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Nhập tên của bạn..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Input Mật khẩu */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Mật khẩu</label>
            <input 
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Nút Đăng nhập */}
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-lg transform hover:-translate-y-1">
            Đăng Nhập Ngay
          </button>

          <p className="mt-6 text-center text-gray-500 text-sm">
            Chưa có tài khoản? <span className="text-indigo-600 font-bold cursor-pointer hover:underline">Đăng ký ngay</span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;  