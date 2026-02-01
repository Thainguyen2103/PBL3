import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; 
import { useAppContext } from '../context/AppContext';
import { searchAndGraphData as dictionaryData, flashcardData } from "../utils/kanji-dictionary";
import { getKanjiList } from '../utils/kanjiData'; 

const HomePage = () => {
  const navigate = useNavigate();
  const { t, user } = useAppContext();
  
  const [floatingChars, setFloatingChars] = useState([]);
  const [progressStats, setProgressStats] = useState({ completed: 0, total: 0, percent: 0 });

  // --- XỬ LÝ NGÀY THÁNG ĐA NGÔN NGỮ & CÓ NĂM ---
  const getFormattedDate = () => {
      // Lấy ngôn ngữ hiện tại, mặc định là 'vi'
      const lang = user?.language || 'vi';
      
      // Bản đồ ánh xạ từ mã ngôn ngữ của App sang mã Locale chuẩn của trình duyệt
      const localeMap = {
          'vi': 'vi-VN',
          'en': 'en-US',
          'jp': 'ja-JP',
          'cn': 'zh-CN', // Tiếng Trung giản thể
          'kr': 'ko-KR'
      };

      const locale = localeMap[lang] || 'vi-VN';

      // Cấu hình định dạng ngày: Thứ, Ngày, Tháng, Năm
      const options = { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
      };

      try {
          // Ép buộc ngày giờ hiển thị theo ngôn ngữ đã chọn
          // Viết hoa chữ cái đầu cho đẹp (đặc biệt với tiếng Việt/Anh)
          const dateStr = new Date().toLocaleDateString(locale, options);
          return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      } catch (e) {
          return new Date().toLocaleDateString('vi-VN', options);
      }
  };

  useEffect(() => {
    // 1. KANJI BAY
    const fullKanjiList = getKanjiList(); 
    const sourceList = (fullKanjiList && fullKanjiList.length > 0) ? fullKanjiList : ["道", "夢", "愛", "旅", "心"];
    const totalChars = 75; 
    const lanes = 30; 
    const slotWidth = 100 / lanes; 

    const chars = Array.from({ length: totalChars }).map((_, i) => {
      const currentLane = i % lanes;
      const left = (currentLane * slotWidth) + (Math.random() * slotWidth * 0.8) + "%";
      const duration = Math.random() * 20 + 25 + "s"; 
      const delay = -(Math.random() * 50) + "s"; 
      const size = Math.random() * 2 + 1.2 + "rem"; 
      const randomChar = sourceList[Math.floor(Math.random() * sourceList.length)];
      return { id: i, char: randomChar, left, duration, delay, size };
    });
    setFloatingChars(chars);

    // 2. TIẾN ĐỘ HỌC TẬP
    const savedProgress = localStorage.getItem('kanji_progress');
    const completedCount = savedProgress ? Object.keys(JSON.parse(savedProgress)).length : 0;
    
    const ITEMS_PER_LESSON = 16;
    const sourceData = flashcardData || []; 
    const totalLessons = Math.ceil(sourceData.length / ITEMS_PER_LESSON);
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    setProgressStats({ completed: completedCount, total: totalLessons, percent: percent });

  }, []);

  const dailyKanji = useMemo(() => {
    if (!dictionaryData || dictionaryData.length === 0) return null;
    const today = new Date().getDate(); 
    const index = today % dictionaryData.length; 
    return dictionaryData[index];
  }, []);

  const randomQuote = useMemo(() => {
      const defaultQuotes = ["Tựa như lữ khách chốn nhân gian\nCứ mãi theo đuổi chân trời tri thức"];
      const quotes = (t?.home_quotes && Array.isArray(t.home_quotes)) ? t.home_quotes : defaultQuotes;
      return quotes[Math.floor(Math.random() * quotes.length)];
  }, [t]);

  const getDailyMeaning = (kanji) => {
      if (!kanji) return "";
      if (typeof kanji.mean === 'object') {
          return kanji.mean[user?.language] || kanji.mean.vi;
      }
      return kanji.mean;
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden relative">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
         {floatingChars.map(item => (
             <span key={item.id} 
                className="kanji-float"
                style={{
                    left: item.left,
                    fontSize: item.size,
                    animationDuration: item.duration,
                    animationDelay: item.delay
                }}
             >
                 {item.char}
             </span>
         ))}
      </div>

      <div className="relative z-20 h-full shadow-xl">
        <Sidebar />
      </div>

      <main className="flex-1 p-8 h-full overflow-y-auto relative z-10 flex flex-col justify-center items-center bg-transparent custom-scrollbar">
         
         <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* CỘT TRÁI */}
            <div className="lg:col-span-8 flex flex-col gap-8">
                <div className="bg-white/90 backdrop-blur-sm p-10 rounded-[3rem] shadow-xl shadow-gray-100/50 border border-gray-50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="relative z-10">
                        {/* NGÀY THÁNG ĐÃ CÓ NĂM VÀ ĐÚNG NGÔN NGỮ */}
                        <span className="inline-block px-4 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest mb-4 shadow-lg">
                            {getFormattedDate()}
                        </span>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
                            {t?.home_welcome || "Xin chào, Lữ khách!"}
                        </h1>
                        <div className="relative pl-6 border-l-4 border-gray-200">
                            <p className="text-xl text-gray-600 font-medium whitespace-pre-wrap leading-relaxed animate-fade-in">
                                "{randomQuote}"
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => navigate('/viet-tay')} className="group bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] shadow-lg border border-gray-100 hover:shadow-2xl hover:border-blue-100 transition-all text-left relative overflow-hidden h-48 flex flex-col justify-between">
                        <div className="absolute right-[-20px] top-[-20px] text-[8rem] opacity-5 font-serif group-hover:scale-110 transition-transform">書</div>
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">🖌️</div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase">{t?.home_btn_write || "Tra cứu"}</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">
                                {t?.home_sub_write || "Viết tay để tra cứu Kanji"}
                            </p>
                        </div>
                    </button>

                    <button onClick={() => navigate('/chat')} className="group bg-slate-900/95 backdrop-blur-sm p-6 rounded-[2.5rem] shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all text-left relative overflow-hidden h-48 flex flex-col justify-between">
                        <div className="absolute right-[-20px] top-[-20px] text-[8rem] text-white opacity-5 font-serif group-hover:rotate-12 transition-transform">智</div>
                        <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm group-hover:bg-white group-hover:text-slate-900 transition-colors">
                            <svg className="w-8 h-8" viewBox="0 0 100 100" fill="currentColor" stroke="none">
                                <path d="M10 45 L50 10 L90 45 Z" />
                                <path d="M35 50 Q50 90 65 50 Z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase">{t?.home_btn_chat || "Hỏi Lão Vô Danh"}</h3>
                            <p className="text-xs text-gray-400 font-bold mt-1">
                                {t?.home_sub_chat || "Trò chuyện cùng AI"}
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* CỘT PHẢI */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* DAILY KANJI */}
                {dailyKanji && (
                    <div onClick={() => navigate(`/kanji/${dailyKanji.kanji}`)} className="bg-white/90 backdrop-blur-sm p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center cursor-pointer hover:border-red-100 transition-all group h-full min-h-[300px]">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">
                            {t?.home_daily_kanji || "HÁN TỰ HÔM NAY"}
                        </span>
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                            <h2 className="text-9xl font-black text-slate-800 mb-2 group-hover:scale-110 transition-transform duration-300" style={{ fontFamily: "'DFKai-SB', serif" }}>{dailyKanji.kanji}</h2>
                        </div>
                        <div className="mt-4">
                            <span className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{dailyKanji.hanviet}</span>
                            <p className="text-gray-500 font-bold mt-3 text-sm line-clamp-2">
                                {getDailyMeaning(dailyKanji)}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* TIẾN ĐỘ HỌC TẬP */}
                <div 
                    onClick={() => navigate('/flashcards')}
                    className="bg-white/90 backdrop-blur-sm p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-xl transition-all group"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-600 flex items-center justify-center text-3xl shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                            🎴
                        </div>
                        
                        <div className="flex flex-col justify-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-emerald-600 transition-colors mb-1">
                                {t?.home_progress_title || "TIẾN ĐỘ HỌC TẬP"}
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-800 leading-none">
                                    {progressStats.completed}
                                </span>
                                <span className="text-xs font-bold text-gray-400">
                                    / {progressStats.total} {t?.flashcard_lesson?.replace('~', '') || "Bài"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Vòng tròn phần trăm */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                            <circle 
                                cx="32" cy="32" r="26" 
                                stroke="currentColor" strokeWidth="4" fill="transparent"
                                strokeDasharray={163.3} 
                                strokeDashoffset={163.3 - (163.3 * progressStats.percent) / 100}
                                className="text-emerald-500 transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute text-[11px] font-black text-slate-800">{progressStats.percent}%</span>
                    </div>
                </div>

            </div>
         </div>
      </main>

      <style>{`
        @keyframes floatUp {
            0% { transform: translateY(100vh); opacity: 0; }
            5% { opacity: 0.06; }
            95% { opacity: 0.06; }
            100% { transform: translateY(-150vh); opacity: 0; }
        }
        .kanji-float {
            position: absolute;
            bottom: -60px;
            font-family: 'Yuji Syuku', serif;
            animation-name: floatUp;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            color: #000000;
            opacity: 0.06;
        }
        .animate-fade-in {
            animation: fadeIn 1s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default HomePage;