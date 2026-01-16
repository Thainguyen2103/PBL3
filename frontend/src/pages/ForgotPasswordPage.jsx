import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. Dùng Context thay vì import translations trực tiếp
import { useAppContext } from '../context/AppContext';
import { getKanjiList } from '../utils/kanjiData';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  
  // 2. Lấy bộ từ điển (t) từ Context
  const { t } = useAppContext();

  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [floatingChars, setFloatingChars] = useState([]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!email) return;
    // Giả lập gửi mail (delay 1.5s)
    setTimeout(() => { setIsSent(true); }, 1500);
  };

  // --- LOGIC HIỆU ỨNG KANJI BAY (Giữ nguyên) ---
  useEffect(() => {
    const fullKanjiList = getKanjiList();
    const totalChars = 50; 
    const lanes = 25; 
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
      
      {/* BACKGROUND KANJI */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {floatingChars.map((item) => (
          <span key={item.id} className="kanji-float" style={{
            left: item.left, 
            animationDuration: item.duration, 
            animationDelay: item.delay, 
            fontSize: item.size
          }}>
            {item.char}
          </span>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 animate-fade-in-up">
        
        {/* Nút Back */}
        <button 
            onClick={() => navigate('/auth')} 
            className="absolute top-6 left-6 text-gray-400 hover:text-black transition-colors text-xl font-bold" 
            title={t.back || "Back"} // Dùng t.back cho đồng bộ
        >
            ←
        </button>

        {!isSent ? (
          <>
            <div className="text-center mb-8 mt-2">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner border border-gray-100">🔒</div>
              
              {/* Tiêu đề & Mô tả (Dùng t.key) */}
              {/* Lưu ý: Bạn cần thêm các key này vào file translations.js nếu chưa có */}
              <h1 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">{t.forgot || "Quên mật khẩu?"}</h1>
              <p className="text-gray-500 text-sm px-2 leading-relaxed">
                Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
              </p>
            </div>

            <form onSubmit={handleSend} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input 
                    type="email" 
                    required 
                    placeholder="name@example.com" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none transition font-medium" 
                    onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <button className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition transform active:scale-[0.98] shadow-lg uppercase tracking-wider">
                Gửi Yêu Cầu
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4 animate-fade-in">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm border border-green-100">✓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Đã gửi email!</h2>
            <p className="text-gray-500 text-sm mb-8 px-2 leading-relaxed">
              Vui lòng kiểm tra hộp thư đến của bạn.<br/>
              <span className="font-bold text-black mt-2 block">{email}</span>
            </p>
            <button 
                onClick={() => navigate('/auth')} 
                className="w-full border-2 border-black text-black font-bold py-3 rounded-xl hover:bg-black hover:text-white transition uppercase tracking-wider"
            >
                Quay về Đăng nhập
            </button>
            <div className="mt-6 text-xs text-gray-400">
                Chưa nhận được? 
                <button className="text-black font-bold underline hover:text-gray-600 ml-1" onClick={() => setIsSent(false)}>Gửi lại</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;