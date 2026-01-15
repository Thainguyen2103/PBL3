import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../utils/translations';
import { getKanjiList } from '../utils/kanjiData';

// --- ICONS & MASCOT ---
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const EyeOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>);
const ShibaMascot = () => (
  <svg viewBox="0 0 200 160" className="w-40 h-32 drop-shadow-xl animate-bounce-slow">
    <g transform="translate(20, 20)">
      <path fill="#E6C298" d="M20,60 Q10,10 50,20 Z" /><path fill="#E6C298" d="M140,60 Q150,10 110,20 Z" />
      <path fill="#E6C298" d="M30,50 Q80,-10 130,50 Q150,100 80,110 Q10,100 30,50 Z" />
      <path fill="#FFFFFF" d="M50,60 Q80,30 110,60 Q120,90 80,100 Q40,90 50,60 Z" />
      <circle cx="65" cy="65" r="5" fill="#3E2723" /><circle cx="95" cy="65" r="5" fill="#3E2723" />
      <path fill="none" stroke="#3E2723" strokeWidth="2" d="M70,85 Q80,90 90,85" />
    </g>
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('appLang') || 'vi');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = translations[lang];

  // --- HÀM XỬ LÝ ĐĂNG NHẬP (Dùng link Render cố định) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const endpoint = isLogin ? 'login' : 'register';
    
    try {
      // Đảm bảo có /api/ để không bị lỗi 404
      const response = await fetch(`https://pbl3-sofd.onrender.com/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('session', JSON.stringify(data.session));
          navigate('/home');
        } else {
          alert("Đăng ký thành công!");
          setIsLogin(true);
        }
      } else {
        setErrorMsg(data.error || "Sai thông tin đăng nhập");
      }
    } catch (err) {
      setErrorMsg("Không thể kết nối Server. Vui lòng thử lại sau 30 giây!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gray-100 overflow-hidden">
      <div className="relative z-10 w-full max-w-[420px] px-4">
        <div className="flex justify-center -mb-6"><ShibaMascot /></div>
        <div className="bg-white px-8 py-10 rounded-[2.5rem] shadow-2xl border border-gray-100">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-gray-900 uppercase">{t.title}</h1>
            <p className="text-gray-400 text-sm italic">{isLogin ? t.welcome : t.welcomeReg}</p>
          </div>

          <div className="flex mb-6 border-b">
            <button onClick={() => setIsLogin(true)} className={`flex-1 pb-2 font-bold ${isLogin ? 'border-b-2 border-black text-black' : 'text-gray-300'}`}>{t.login}</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 pb-2 font-bold ${!isLogin ? 'border-b-2 border-black text-black' : 'text-gray-300'}`}>{t.register}</button>
          </div>

          {errorMsg && <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-black" />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" className="w-full px-6 py-4 bg-gray-50 rounded-2xl outline-none border border-gray-100 focus:ring-2 focus:ring-black" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-black py-5 rounded-2xl shadow-xl hover:bg-gray-800 transition-all">
              {isLoading ? "ĐANG XỬ LÝ..." : (isLogin ? t.btnLogin : t.btnReg)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;