import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dictionaryData from '../utils/kanji-dictionary.json'; 
// 1. IMPORT CONTEXT
import { useAppContext } from '../context/AppContext';

const KanjiDetailPage = () => {
  const { character } = useParams(); 
  const navigate = useNavigate();
  // 2. LẤY TỪ ĐIỂN TỪ CONTEXT
  const { t } = useAppContext();

  const kanjiInfo = dictionaryData.find(item => item.kanji === character);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!kanjiInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 font-sans">
        <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
        <p className="text-gray-500 mb-8 text-lg">Không tìm thấy dữ liệu cho chữ này.</p>
        <button 
            onClick={() => navigate('/home')} 
            className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
        >
            {t.back}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#Fdfdfd] font-sans text-slate-900 p-4 md:p-8 flex justify-center items-center">
      <div className="max-w-5xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden relative min-h-[80vh] flex flex-col md:flex-row">
        
        <div className="absolute top-6 left-6 z-20">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-3 text-white/80 hover:text-white md:text-gray-400 md:hover:text-black transition-all font-bold group bg-black/20 md:bg-transparent px-4 py-2 rounded-full md:p-0 backdrop-blur-sm md:backdrop-blur-none"
            >
                <span className="bg-white/20 md:bg-gray-100 group-hover:bg-white md:group-hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm">←</span>
                <span className="text-sm tracking-wide">{t.detail_back || "Quay lại"}</span>
            </button>
        </div>

        {/* --- CỘT TRÁI: KANJI ART --- */}
        <div className="w-full md:w-5/12 bg-slate-900 text-white p-10 flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-500 opacity-10 rounded-full -ml-10 -mb-10 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                {/* --- FONT THƯ PHÁP CHO CHỮ TO --- */}
                <h1 
                    className="text-[10rem] md:text-[14rem] leading-none mb-2 text-shadow-xl select-none"
                    style={{ fontFamily: "'Yuji Syuku', serif" }} 
                >
                    {kanjiInfo.kanji}
                </h1>
                
                <div className="text-center mt-4">
                    <span className="bg-red-600/90 text-white px-3 py-1 rounded text-[10px] font-black tracking-[0.2em] uppercase mb-3 inline-block shadow-lg">
                        {t.home_result_hanviet}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-white to-red-200">
                        {kanjiInfo.hanviet}
                    </h2>
                </div>
            </div>
        </div>

        {/* --- CỘT PHẢI: THÔNG TIN CHI TIẾT --- */}
        <div className="w-full md:w-7/12 p-8 md:p-12 bg-white flex flex-col gap-8 overflow-y-auto max-h-screen">
            
            <div className="border-l-4 border-black pl-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t.home_meaning}</h3>
                <p className="text-2xl md:text-3xl font-bold text-gray-800 leading-snug">
                    {kanjiInfo.mean}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Onyomi</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">{kanjiInfo.onyomi || "---"}</span>
                </div>
                <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kunyomi</span>
                    </div>
                    <span className="text-lg font-bold text-green-900">{kanjiInfo.kunyomi || "---"}</span>
                </div>
            </div>

            <div className="w-full border-t border-gray-100"></div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex flex-wrap gap-8 mb-6 border-b border-gray-200 pb-6">
                    <div>
                        <span className="block text-[10px] text-gray-400 font-black uppercase mb-1">{t.detail_radical || "Bộ thủ"}</span>
                        {/* --- FONT THƯ PHÁP CHO BỘ THỦ --- */}
                        <span 
                            className="text-3xl font-black text-slate-800"
                            style={{ fontFamily: "'Yuji Syuku', serif" }}
                        >
                            {kanjiInfo.radical || "?"}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-gray-400 font-black uppercase mb-1">{t.detail_strokes || "Số nét"}</span>
                        <span className="text-2xl font-black text-slate-800">{kanjiInfo.strokes || "?"}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-gray-400 font-black uppercase mb-1">{t.detail_formation || "Hình thành"}</span>
                        <span className="text-lg font-bold text-slate-800">{kanjiInfo.formation || "---"}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <span className="block text-[10px] text-blue-500 font-black uppercase mb-3">{t.detail_components || "Thành phần cấu tạo:"}</span>
                    <div className="flex flex-wrap gap-2">
                        {kanjiInfo.components ? (
                            kanjiInfo.components.split(/,|、/).map((part, index) => (
                                <span key={index} className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-slate-700 font-bold text-sm shadow-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                    {/* --- FONT THƯ PHÁP CHO THÀNH PHẦN CẤU TẠO --- */}
                                    <span style={{ fontFamily: "'Yuji Syuku', serif", fontSize: '1.1em' }}>
                                        {part.trim()}
                                    </span>
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-400 text-sm italic">Chữ đơn (Nguyên thể)</span>
                        )}
                    </div>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-yellow-200 shadow-sm relative mt-2">
                    <span className="absolute -top-3 left-4 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border border-yellow-200">
                        {t.detail_tip || "Mẹo nhớ"}
                    </span>
                    <p className="text-slate-700 italic leading-relaxed pt-2">
                        "{kanjiInfo.detail || "Đang cập nhật..."}"
                    </p>
                </div>
            </div>
            
            <div className="mt-auto pt-4 flex gap-3">
                 <button className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 font-bold rounded-2xl transition-colors border border-dashed border-gray-200 text-xs uppercase tracking-widest">
                    🔊 Nghe phát âm
                 </button>
                 <button className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 font-bold rounded-2xl transition-colors border border-dashed border-gray-200 text-xs uppercase tracking-widest">
                    ✍️ Luyện viết
                 </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default KanjiDetailPage;