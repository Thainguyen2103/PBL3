import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../utils/translations';
import { getKanjiList } from '../utils/kanjiData';

// --- ICONS (Giữ nguyên giao diện của bạn) ---
const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const EyeOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>);
const GoogleIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>);
const FacebookIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>);

const ShibaMascot = () => (
  <svg viewBox="0 0 200 160" className="w-40 h-32 drop-shadow-xl filter animate-bounce-slow">
    <g transform="translate(20, 20)">
      <path fill="#E6C298" d="M20,60 Q10,10 50,20 Z" /><path fill="#F4D8B8" d="M25,55 Q20,25 45,30 Z" />
      <path fill="#E6C298" d="M140,60 Q150,10 110,20 Z" /><path fill="#F4D8B8" d="M135,55 Q140,25 115,30 Z" />
      <path fill="#E6C298" d="M30,50 Q80,-10 130,50 Q150,100 80,110 Q10,100 30,50 Z" />
      <path fill="#FFFFFF" d="M50,60 Q80,30 110,60 Q120,90 80,100 Q40,90 50,60 Z" />
      <circle cx="65" cy="65" r="5" fill="#3E2723"><animate attributeName="ry" values="5;0.5;5" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="95" cy="65" r="5" fill="#3E2723"><animate attributeName="ry" values="5;0.5;5" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="50" cy="75" r="7" fill="#FFAB91" opacity="0.6" /><circle cx="110" cy="75" r="7" fill="#FFAB91" opacity="0.6" />
      <circle cx="80" cy="78" r="4" fill="#3E2723" /><path fill="none" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" d="M70,85 Q80,90 90,85" />
      <path fill="#E6C298" d="M20,100 Q10,120 40,120 L120,120 Q150,120 140,100" />
      <path fill="#FFFFFF" d="M40,120 L120,120 Q130,130 120,140 L40,140 Q30,130 40,120" />
    </g>
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('appLang') || 'vi');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const t = translations[lang];

  // --- HÀM XỬ LÝ ĐĂNG NHẬP / ĐĂNG KÝ (ĐÃ FIX ĐƯỜNG DẪN /API) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg("Mật khẩu xác nhận không khớp!");
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';
    
    try {
      // SỬA LỖI 404: Thêm tiền tố /api/ vào trước endpoint
      const response = await fetch(`https://pbl3-sofd.onrender.com/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          // Lưu dữ liệu phiên đăng nhập vào localStorage
          localStorage.setItem('session', JSON.stringify(data.session));
          navigate('/home');
        } else {
          alert(data.message);
          setIsLogin(true);
        }
      } else {
        setErrorMsg(data.error || "Có lỗi xảy ra!");
      }
    } catch (err) {
      // Thông báo khi Server Render đang ngủ (Spin up)
      setErrorMsg("Máy chủ đang khởi động, vui lòng thử lại sau 30 giây!");
    }
  };

  const changeLanguage = (languageKey) => {
    setLang(languageKey);
    localStorage.setItem('appLang', languageKey);
    setIsLangMenuOpen(false);
  };
  
  const [floatingChars, setFloatingChars] = useState([]);

  useEffect(() => {
    const fullKanjiList = getKanjiList();
    const totalChars = 75; 
    const lanes = 30; 
    const slotWidth = 100 / lanes; 

    const chars = Array.from({ length: totalChars }).map((_, i) => {
      const currentLane = i % lanes;
      const left = (currentLane * slotWidth) + (slotWidth / 2) + "%";
      const duration = "40s"; 
      const maxDelay = 80; 
      const delay = -(Math.random() * maxDelay) + "s";
      const size = Math.random() * 1.5 + 1.2 + "rem";
      const randomChar = fullKanjiList[Math.floor(Math.random() * fullKanjiList.length)];

      return { id: i, char: randomChar, left, duration, delay, size };
    });
    setFloatingChars(chars);
  }, []);

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gray-100 overflow-hidden font-sans">
      
      {/* LANGUAGE MENU */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button 
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
            className="flex items-center gap-3 bg-white/90 backdrop-blur border-2 border-gray-300 rounded-full px-6 py-3 shadow-md hover:bg-white transition-all active:scale-95"
          >
            <span className="text-lg font-black text-gray-900 uppercase">{lang === 'vi' ? 'VN' : lang.toUpperCase()}</span> 
            <span className="text-xs text-gray-500">▼</span>
          </button>
          {isLangMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-fade-in-down">
              {Object.keys(translations).map((key) => (
                <button 
                  key={key} 
                  onClick={() => changeLanguage(key)} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${lang === key ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                >
                  <span className="text-xl">{translations[key].flag}</span> {translations[key].name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BACKGROUND KANJI (Floating Chars) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {floatingChars.map((item) => (
          <span key={item.id} className="kanji-float" style={{ left: item.left, animationDuration: item.duration, animationDelay: item.delay, fontSize: item.size }}>
            {item.char}
          </span>
        ))}
      </div>

      {/* MAIN CARD */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center px-4">
        
        <div className="z-20 -mb-7 pointer-events-none">
          <ShibaMascot />
        </div>

        <div className={`w-full bg-white px-8 ${isLogin ? 'py-8' : 'py-5'} rounded-[2.5rem] shadow-2xl border border-gray-100 relative z-10 transition-all`}>
          
          <div className={`text-center ${isLogin ? 'mb-6' : 'mb-3'} mt-2`}>
            <h1 className="text-3xl font-black text-gray-900 mb-1 uppercase tracking-tight leading-tight">{t.title}</h1>
            <p className="text-gray-400 text-sm italic font-medium">{isLogin ? t.welcome : t.welcomeReg}</p>
          </div>

          <div className={`flex ${isLogin ? 'mb-6' : 'mb-4'} border-b border-gray-100`}>
            <button onClick={() => { setIsLogin(true); setErrorMsg(''); }} className={`w-1/2 pb-2 text-sm font-bold transition-all ${isLogin ? 'border-b-2 border-black text-black' : 'text-gray-300'}`}>{t.login}</button>
            <button onClick={() => { setIsLogin(false); setErrorMsg(''); }} className={`w-1/2 pb-2 text-sm font-bold transition-all ${!isLogin ? 'border-b-2 border-black text-black' : 'text-gray-300'}`}>{t.register}</button>
          </div>

          {/* HIỂN THỊ LỖI NẾU CÓ */}
          {errorMsg && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold rounded-xl text-center animate-shake">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className={`space-y-${isLogin ? '4' : '3'}`}>
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t.user}</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-700" 
              />
            </div>

            <div className="relative">
              <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t.pass}</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-700 pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="animate-fade-in-down">
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t.confirm}</label>
                <input 
                  type="password" 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all text-gray-700" 
                />
              </div>
            )}

            <button type="submit" className="w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl uppercase tracking-widest text-base mt-2">
              {isLogin ? t.btnLogin : t.btnReg}
            </button>

            <div className={`${isLogin ? 'mt-6' : 'mt-3'}`}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-[10px]"><span className="px-3 bg-white text-gray-400 font-bold uppercase tracking-widest">{t.orContinue}</span></div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <button type="button" className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 text-xs shadow-sm"><GoogleIcon /> Google</button>
                <button type="button" className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 text-xs shadow-sm"><FacebookIcon /> Facebook</button>
              </div>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-50 flex justify-center gap-8 text-[11px] text-gray-300 font-bold uppercase tracking-widest">
             <a href="#" className="hover:text-black transition-colors">TERMS</a>
             <a href="#" className="hover:text-black transition-colors">PRIVACY</a>
             <a href="#" className="hover:text-black transition-colors">HELP</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;