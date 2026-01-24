import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { searchAndGraphData as dictionaryData } from "../utils/kanji-dictionary";
import { useAppContext } from '../context/AppContext'; 
import Sidebar from '../components/Sidebar';
import KanjiWritingModal from '../components/KanjiWritingModal'; 

const KanjiDetailPage = () => {
  const { kanji } = useParams(); 
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const location = useLocation(); 
  const { t, user } = useAppContext(); 

  const kanjiInfo = dictionaryData.find(item => item.kanji === kanji);
  
  const [showWriting, setShowWriting] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [kanji]);

  // --- LOGIC QUAY LẠI THÔNG MINH (CONTEXT-AWARE BACK) ---
  const handleBack = () => {
      // navigate(-1) tương đương nút Back của trình duyệt
      // Nó giúp quay lại chính xác trang trước đó (Từ điển, Dịch thuật, hay Flashcard...)
      if (window.history.length > 1) {
          navigate(-1);
      } else {
          // Nếu người dùng mở trực tiếp link này (không có lịch sử) -> Về từ điển
          navigate('/dictionary');
      }
  };

  // Helper để lấy nghĩa theo ngôn ngữ
  const getMeaning = (info) => {
      if (!info) return "";
      if (typeof info.mean === 'object') {
          return info.mean[user?.language] || info.mean.vi || info.mean.en;
      }
      return info.mean;
  };

  if (!kanjiInfo) {
    return (
      <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-9xl font-black text-gray-200 mb-4 select-none">404</h1>
            <p className="text-gray-500 mb-8 text-lg font-bold">{t?.detail_not_found || "Không tìm thấy dữ liệu."}</p>
            <button onClick={() => navigate('/dictionary')} className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-lg">
                {t?.back || "Quay lại"}
            </button>
        </main>
      </div>
    );
  }

  const directComponents = kanjiInfo.components 
    ? kanjiInfo.components.split(/,|、/).map(c => c.trim()).filter(c => c)
    : [];

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden relative">
      <Sidebar />

      <main className="flex-1 p-4 flex justify-center items-center h-full bg-[#fdfbf7]">
        
        <div className="max-w-6xl w-full bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden relative h-[90vh] flex flex-row">
            
            {/* --- NÚT BACK SỬ DỤNG LOGIC MỚI --- */}
            <div className="absolute top-4 left-4 z-20">
                <button onClick={handleBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-all font-bold group bg-black/10 hover:bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                    <span className="text-xs tracking-wide uppercase">{t?.back || "Quay lại"}</span>
                </button>
            </div>

            {/* CỘT TRÁI: HIỂN THỊ KANJI LỚN */}
            <div className="w-[35%] bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-60 h-60 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500 opacity-10 rounded-full -ml-10 -mb-10 blur-3xl"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <h1 className="text-[8rem] lg:text-[10rem] leading-none mb-1 text-shadow-xl select-none font-kai font-normal">{kanjiInfo.kanji}</h1>
                    <div className="text-center mt-2">
                        <span className="bg-red-600/90 text-white px-2 py-0.5 rounded text-[9px] font-black tracking-[0.2em] uppercase mb-1 inline-block shadow-md">
                            {t?.write_result_hanviet || "HÁN VIỆT"}
                        </span>
                        <h2 className="text-3xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-white to-red-200">{kanjiInfo.hanviet}</h2>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: CHI TIẾT */}
            <div className="w-[65%] p-6 bg-white flex flex-col h-full overflow-y-auto custom-scrollbar gap-4">
                <div className="border-l-4 border-black pl-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        {t?.write_meaning || "Ý nghĩa"}
                    </h3>
                    <p className="text-2xl font-bold text-gray-800 leading-tight">
                        {getMeaning(kanjiInfo)}
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Onyomi</span>
                        </div>
                        <span className="text-base font-bold text-blue-900 line-clamp-1">{kanjiInfo.onyomi || "---"}</span>
                    </div>
                    <div className="bg-green-50/50 p-3 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Kunyomi</span>
                        </div>
                        <span className="text-base font-bold text-green-900 line-clamp-1">{kanjiInfo.kunyomi || "---"}</span>
                    </div>
                </div>

                <div className="w-full border-t border-gray-100 my-1"></div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <span className="block text-[9px] text-gray-400 font-black uppercase mb-1">
                                {t?.detail_radical || "Bộ thủ"}
                            </span>
                            <span className="text-2xl font-normal text-slate-800 font-kai">{kanjiInfo.radical || "?"}</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-[9px] text-gray-400 font-black uppercase mb-1">
                                {t?.detail_strokes || "Số nét"}
                            </span>
                            <span className="text-xl font-black text-slate-800">{kanjiInfo.strokes || "?"}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[9px] text-gray-400 font-black uppercase mb-1">
                                {t?.detail_formation || "Hình thành"}
                            </span>
                            <span className="text-sm font-bold text-slate-800">{kanjiInfo.formation || "---"}</span>
                        </div>
                    </div>

                    <div className="mb-3">
                        <span className="block text-[9px] text-blue-500 font-black uppercase mb-2">
                            {t?.detail_components || "Cấu tạo:"}
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {directComponents.length > 0 ? (
                                directComponents.map((part, index) => (
                                    <span key={index} className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-slate-700 font-bold text-xs shadow-sm flex items-center gap-1">
                                        <span className="font-kai font-normal">{part}</span>
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400 text-xs italic">
                                    Integral
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm relative mt-auto">
                        <span className="absolute -top-2 left-3 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-yellow-200">
                            {t?.detail_tip || "Mẹo nhớ"}
                        </span>
                        <p className="text-slate-700 text-sm italic leading-relaxed pt-1">"{kanjiInfo.detail || "..."}"</p>
                    </div>
                </div>
                
                <div className="flex gap-3 mt-auto pt-2">
                      <button 
                        onClick={() => navigate(`/kanji-graph/${kanjiInfo.kanji}`)} 
                        className="flex-1 py-3 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 group"
                      >
                        🌳 {t?.detail_btn_graph || "Sơ đồ mạng lưới"}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                      </button>
                      
                      <button 
                        onClick={() => setShowWriting(true)}
                        className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 font-bold rounded-xl transition-colors border border-dashed border-gray-200 text-[10px] uppercase tracking-widest"
                      >
                        ✍️ {t?.detail_btn_practice || "Tập viết"}
                      </button>
                </div>
            </div>
        </div>

        {/* POPUP TẬP VIẾT */}
        {showWriting && (
            <KanjiWritingModal 
                char={kanjiInfo.kanji} 
                hanviet={kanjiInfo.hanviet} 
                onClose={() => setShowWriting(false)} 
            />
        )}

      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .font-kai { font-family: 'Yuji Syuku', serif; font-weight: 400 !important; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default KanjiDetailPage;