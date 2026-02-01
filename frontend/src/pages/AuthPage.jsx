import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';
import { getKanjiList } from '../utils/kanjiData';
import emailjs from '@emailjs/browser';

// 🔥 CẤU HÌNH EMAILJS (Thay bằng Key thật của bạn vào đây)
const EMAIL_SERVICE_ID = import.meta.env.VITE_MAIN_SERVICE_ID;  // <-- Phải là VITE_MAIN_...
const EMAIL_TEMPLATE_ID = import.meta.env.VITE_TEMPLATE_REGISTER; 
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_MAIN_PUBLIC_KEY;  // <-- Phải là VITE_MAIN_...

const LANG_CONFIG = {
  vi: { label: 'Tiếng Việt', flag: '🇻🇳' },
  en: { label: 'English', flag: '🇺🇸' },
  jp: { label: '日本語', flag: '🇯🇵' },
  cn: { label: '中文', flag: '🇨🇳' },
  kr: { label: '한국어', flag: '🇰🇷' }
};

// --- CÁC COMPONENT PHỤ (Notification, Icons) ---
const Notification = ({ message, type, onClose, t }) => { 
    if (!message) return null; 
    const isSuccess = type === 'success'; 
    return ( 
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in-down border ${isSuccess ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}> 
            <span className="text-2xl">{isSuccess ? '🎉' : '⚠️'}</span> 
            <div className="flex flex-col"> 
                <span className="font-black uppercase text-[10px] tracking-widest opacity-80">{isSuccess ? (t?.success || 'Thành công') : (t?.error || 'Lỗi')}</span> 
                <span className="font-bold text-sm">{message}</span> 
            </div> 
            <button onClick={onClose} className="ml-4 p-1 hover:bg-white/20 rounded-full transition-colors">✕</button> 
        </div> 
    ); 
};

const EyeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const EyeOffIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>);
const GoogleIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>);
const FacebookIcon = () => (<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>);
const ShibaMascot = () => (<svg viewBox="0 0 200 160" className="w-40 h-32 drop-shadow-xl filter animate-bounce-slow"><g transform="translate(20, 20)"><path fill="#E6C298" d="M20,60 Q10,10 50,20 Z" /><path fill="#F4D8B8" d="M25,55 Q20,25 45,30 Z" /><path fill="#E6C298" d="M140,60 Q150,10 110,20 Z" /><path fill="#F4D8B8" d="M135,55 Q140,25 115,30 Z" /><path fill="#E6C298" d="M30,50 Q80,-10 130,50 Q150,100 80,110 Q10,100 30,50 Z" /><path fill="#FFFFFF" d="M50,60 Q80,30 110,60 Q120,90 80,100 Q40,90 50,60 Z" /><circle cx="65" cy="65" r="5" fill="#3E2723"><animate attributeName="ry" values="5;0.5;5" dur="4s" repeatCount="indefinite" /></circle><circle cx="95" cy="65" r="5" fill="#3E2723"><animate attributeName="ry" values="5;0.5;5" dur="4s" repeatCount="indefinite" /></circle><circle cx="50" cy="75" r="7" fill="#FFAB91" opacity="0.6" /><circle cx="110" cy="75" r="7" fill="#FFAB91" opacity="0.6" /><circle cx="80" cy="78" r="4" fill="#3E2723" /><path fill="none" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" d="M70,85 Q80,90 90,85" /><path fill="#E6C298" d="M20,100 Q10,120 40,120 L120,120 Q150,120 140,100" /><path fill="#FFFFFF" d="M40,120 L120,120 Q130,130 120,140 L40,140 Q30,130 40,120" /></g></svg>);

const AuthPage = () => {
  const navigate = useNavigate();
  const { setUser, language, setLanguage, t } = useAppContext();

  const [isLogin, setIsLogin] = useState(true);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [floatingChars, setFloatingChars] = useState([]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Trạng thái: Đã gửi email xác thực hay chưa
  const [isEmailSent, setIsEmailSent] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Kiểm tra nếu đã đăng nhập thì đá về trang chủ
  useEffect(() => {
    const checkUser = async () => {
      const session = localStorage.getItem('session');
      if (session) navigate('/', { replace: true });
    };
    checkUser();
  }, [navigate]);

  const changeLanguage = (languageKey) => { setLanguage(languageKey); localStorage.setItem('appLang', languageKey); setIsLangMenuOpen(false); };
  const showToast = (message, type) => { setNotification({ message, type }); setTimeout(() => setNotification({ message: '', type: '' }), 4000); };
  const checkStrength = (pass) => { let s = 0; if (pass.length >= 8) s++; if (/\d/.test(pass)) s++; if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) s++; return s; };
  const strengthScore = checkStrength(password);

  // Hiệu ứng chữ Kanji bay
  useEffect(() => {
    const fullKanjiList = getKanjiList ? getKanjiList() : ["愛", "夢", "旅", "道", "光", "明", "鉄", "心", "力", "風"];
    const chars = Array.from({ length: 75 }).map((_, i) => ({
      id: i, char: fullKanjiList[Math.floor(Math.random() * fullKanjiList.length)],
      left: (i % 30) * (100/30) + 1.5 + "%", duration: "40s", delay: -(Math.random() * 80) + "s", size: Math.random() * 1.5 + 1.2 + "rem"
    }));
    setFloatingChars(chars);
  }, []);

  // --- XỬ LÝ ĐĂNG KÝ VÀ GỬI EMAIL ---
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setErrorMsg(t?.err_pass_match || "Mật khẩu xác nhận không khớp!");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Kiểm tra Email tồn tại
      const { data: existingUser } = await supabase.from('users').select('email, status').eq('email', email).maybeSingle();
      
      if (existingUser) {
        if (existingUser.status === 'active') {
             setErrorMsg(t?.err_email_exists || "Email này đã được đăng ký và kích hoạt.");
             showToast(t?.err_email_exists || "Email đã tồn tại", "error");
             setIsLoading(false);
             return;
        } else {
             setErrorMsg(t?.err_email_pending || "Email đã đăng ký nhưng chưa xác thực. Hãy kiểm tra hộp thư!");
             setIsLoading(false);
             return;
        }
      }

      // 2. Tạo Token bí mật
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // 3. Lưu vào DB (status = 'pending')
      const { error } = await supabase.from('users').insert([{ 
        email: email, 
        password: password,
        username: email.split('@')[0] + "_" + Math.floor(Math.random() * 1000), 
        full_name: email.split('@')[0], 
        level: 'N5', streak: 0, goal: "Học 5 Kanji mỗi ngày",
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${Date.now()}`,
        status: 'pending', 
        verification_token: token 
      }]);

      if (error) throw error;

      // 4. Tạo Link xác thực
      const verifyLink = `${window.location.origin}/verify-email?token=${token}`;

      // 5. Gửi Email qua EmailJS
      const templateParams = {
        to_name: email.split('@')[0],
        to_email: email, // EmailJS sẽ gửi đến địa chỉ này
        verification_link: verifyLink,
      };

      await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, templateParams, EMAIL_PUBLIC_KEY);

      // 6. Thông báo thành công
      showToast(t?.delete_email_sent || "Đã gửi link xác thực!", "success");
      setIsEmailSent(true);
      
    } catch (error) {
      console.error("Lỗi:", error);
      const msg = error.text || error.message || "Lỗi không xác định";
      setErrorMsg((t?.error || "Lỗi: ") + msg);
      showToast(t?.err_register_fail || "Đăng ký thất bại", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- XỬ LÝ ĐĂNG NHẬP ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setIsLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
      
      if (error || !data || data.password !== password) {
        setErrorMsg(t?.err_pass_wrong || "Sai tài khoản hoặc mật khẩu");
        showToast(t?.err_login_fail || "Đăng nhập thất bại", "error");
      } else {
        // 🔥 KIỂM TRA TRẠNG THÁI ACTIVE
        if (data.status === 'pending') {
             setErrorMsg(t?.err_email_pending || "Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email!");
             showToast(t?.err_email_pending || "Chưa xác thực email", "error");
        } else {
             const sessionData = { ...data, language: language };
             localStorage.setItem('session', JSON.stringify(sessionData));
             setUser(sessionData);
             navigate('/');
        }
      }
    } catch (err) {
      setErrorMsg(t?.err_system || "Lỗi hệ thống hoặc tài khoản không tồn tại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gray-100 overflow-hidden font-sans text-slate-900">
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} t={t} />
      
      {/* Menu Ngôn ngữ */}
      <div className="absolute top-6 right-6 z-50">
        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="flex items-center gap-3 bg-white/90 backdrop-blur border-2 border-gray-300 rounded-full px-6 py-3 shadow-md hover:bg-white transition-all active:scale-95">
           <span className="text-lg font-black text-gray-900 uppercase">{LANG_CONFIG[language]?.flag || "VN"}</span> 
           <span className="text-xs text-gray-500">▼</span>
        </button>
        {isLangMenuOpen && (
           <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 animate-fade-in-down">
             {Object.keys(LANG_CONFIG).map((key) => (
               <button key={key} onClick={() => changeLanguage(key)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100"><span className="text-xl">{LANG_CONFIG[key].flag}</span> {LANG_CONFIG[key].label}</button>
             ))}
           </div>
        )}
      </div>

      {/* Kanji Bay */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {floatingChars.map((item) => (
          <span key={item.id} className="kanji-float" style={{ left: item.left, animationDuration: item.duration, animationDelay: item.delay, fontSize: item.size }}>{item.char}</span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center px-4">
        <div className="z-20 -mb-7 pointer-events-none"><ShibaMascot /></div>

        <div className={`w-full bg-white px-8 ${isLogin ? 'py-8' : 'py-5'} rounded-[2.5rem] shadow-2xl border border-gray-100 relative z-10 transition-all`}>
          
          {/* 🔥 MÀN HÌNH SAU KHI GỬI EMAIL THÀNH CÔNG 🔥 */}
          {isEmailSent ? (
            <div className="text-center py-6 animate-fade-in-up">
               <div className="text-6xl mb-4">📧</div>
               <h2 className="text-2xl font-black text-slate-800 mb-2">{t?.email_check_title || "Kiểm tra Email"}</h2>
               <p className="text-gray-500 text-sm mb-6 px-2">
                 {t?.email_sent_desc || "Một liên kết kích hoạt đã được gửi đến:"} <br/>
                 <b className="text-blue-600">{email}</b>
               </p>
               <p className="text-gray-400 text-xs mb-8">
                 {t?.email_sent_instruction || "Vui lòng bấm vào link trong email để kích hoạt tài khoản."}
               </p>
               
               <button onClick={() => { setIsEmailSent(false); setIsLogin(true); }} className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all uppercase text-sm">
                 {t?.back_to_login || "QUAY VỀ ĐĂNG NHẬP"}
               </button>
            </div>
          ) : (
            /* --- FORM LOGIN / REGISTER --- */
            <>
              <div className={`text-center ${isLogin ? 'mb-6' : 'mb-3'} mt-2`}>
                <h1 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight leading-tight">{t?.auth_title || "HỌC KANJI MỖI NGÀY"}</h1>
                <p className="text-gray-400 text-sm italic font-medium">{isLogin ? (t?.auth_sub_login || "Kiên trì mỗi ngày...") : (t?.auth_sub_register || "Tạo tài khoản...")}</p>
              </div>

              <div className={`flex ${isLogin ? 'mb-6' : 'mb-4'} border-b border-gray-100`}>
                <button onClick={() => { setIsLogin(true); setErrorMsg(''); }} className={`w-1/2 pb-2 text-sm font-bold transition-all uppercase ${isLogin ? 'border-b-2 border-black text-black' : 'text-gray-300'}`}>{t?.auth_tab_login || "ĐĂNG NHẬP"}</button>
                <button onClick={() => { setIsLogin(false); setErrorMsg(''); }} className={`w-1/2 pb-2 text-sm font-bold transition-all uppercase ${!isLogin ? 'border-b-2 border-black text-black' : 'text-gray-300'}`}>{t?.auth_tab_register || "ĐĂNG KÝ"}</button>
              </div>

              {errorMsg && (<div className="mb-4 p-2 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold rounded-xl text-center animate-shake">{errorMsg}</div>)}

              <form onSubmit={isLogin ? handleLogin : handleRegister} className={`space-y-${isLogin ? '4' : '3'}`}>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t?.auth_label_user || "TÊN ĐĂNG NHẬP / EMAIL"}</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t?.auth_placeholder_email || "example@gmail.com"} className="w-full px-5 py-2.5 bg-[#eff6ff] border border-transparent rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-slate-800" />
                </div>

                <div className="relative">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t?.auth_label_pass || "MẬT KHẨU"}</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t?.auth_placeholder_pass || "Nhập mật khẩu..."} className="w-full px-5 py-2.5 bg-[#eff6ff] border border-transparent rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium pr-12 text-slate-800" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button>
                  </div>
                  
                  {/* THANH ĐỘ MẠNH MẬT KHẨU */}
                  {!isLogin && password.length > 0 && (
                     <div className="mt-2 px-1 animate-fade-in-down">
                        <div className="flex gap-1 h-1 mb-1.5">
                           <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 1 ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                           <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 2 ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                           <div className={`flex-1 rounded-full transition-colors ${strengthScore >= 3 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        </div>
                     </div>
                  )}
                </div>
                
                {/* 👇 LIÊN KẾT QUÊN MẬT KHẨU (CHỈ HIỆN KHI ĐĂNG NHẬP) 👇 */}
                {isLogin && (
                  <div className="flex justify-end mt-2 mr-1">
                    <span 
                      onClick={() => navigate('/forgot-password')} 
                      className="text-[10px] font-bold text-gray-400 hover:text-black cursor-pointer transition-colors uppercase tracking-wide"
                    >
                      {t?.auth_forgot_pass || "Quên mật khẩu?"}
                    </span>
                  </div>
                )}
                {/* 👆 HẾT PHẦN QUÊN MẬT KHẨU 👆 */}

                {!isLogin && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t?.auth_label_confirm || "XÁC NHẬN MẬT KHẨU"}</label>
                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-2.5 bg-[#eff6ff] border border-transparent rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all text-slate-800" />
                  </div>
                )}

                <button type="submit" disabled={isLoading} className={`w-full bg-black text-white font-black py-5 rounded-2xl hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl uppercase tracking-widest text-base mt-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isLoading ? (t?.loading || "ĐANG XỬ LÝ...") : (isLogin ? (t?.auth_btn_login || "ĐĂNG NHẬP") : (t?.auth_btn_register || "ĐĂNG KÝ"))}
                </button>
              </form>

              <div className={`${isLogin ? 'mt-6' : 'mt-3'}`}>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 text-xs shadow-sm"><GoogleIcon /> Google</button>
                    <button className="flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all font-bold text-gray-700 text-xs shadow-sm"><FacebookIcon /> Facebook</button>
                  </div>
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-gray-50 flex justify-center gap-8 text-[11px] text-gray-300 font-bold uppercase tracking-widest">
              <a href="#" className="hover:text-black transition-colors">{t?.auth_terms || "TERMS"}</a>
              <a href="#" className="hover:text-black transition-colors">{t?.auth_privacy || "PRIVACY"}</a>
              <a href="#" className="hover:text-black transition-colors">{t?.auth_help || "HELP"}</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;