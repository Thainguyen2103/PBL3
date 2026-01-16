import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KanjiCanvas from '../components/KanjiCanvas';
import dictionaryData from '../utils/kanji-dictionary.json';
import UserProfile from '../components/UserProfile';
// 1. IMPORT CONTEXT
import { useAppContext } from '../context/AppContext';

const HomePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  // 2. LẤY TỪ ĐIỂN VÀ USER TỪ CONTEXT
  const { t, user } = useAppContext();

  const [candidates, setCandidates] = useState([]);
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dictionary] = useState(dictionaryData);

  // Kiểm tra đăng nhập bằng Context (thay vì localStorage thủ công)
  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // --- LOGIC NHẬN DIỆN (Google API) ---
  const recognizeKanji = async (trace, width, height) => {
    const formattedInk = trace.map(stroke => {
        const x = []; const y = [];
        stroke.forEach(point => { x.push(point[0]); y.push(point[1]); });
        return [x, y, []];
    });

    const body = {
        options: "enable_pre_space",
        requests: [{
            writing_guide: { writing_area_width: width, writing_area_height: height },
            ink: formattedInk,
            language: "zh" 
        }]
    };

    try {
        const response = await fetch("https://www.google.com/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]) {
            return data[1][0][1];
        }
        return [];
    } catch (error) {
        console.error("Lỗi API:", error);
        return [];
    }
  };

  // --- XỬ LÝ KẾT QUẢ ---
  const handleIdentify = async () => {
    if (!canvasRef.current || !canvasRef.current.getTrace) return;
    
    const trace = canvasRef.current.getTrace();
    const dimensions = canvasRef.current.getDimensions ? canvasRef.current.getDimensions() : { width: 500, height: 500 };

    if (!trace || trace.length === 0) return;

    setIsAnalyzing(true);

    const results = await recognizeKanji(trace, dimensions.width, dimensions.height);
    
    if (results && results.length > 0) {
        const singleChars = results.filter(str => str.length === 1);
        const kanjiRegex = /^[\u4E00-\u9FAF]+$/;
        const cleanResults = singleChars.filter(char => kanjiRegex.test(char));

        cleanResults.sort((a, b) => {
            const aExists = dictionary.some(d => d.kanji === a);
            const bExists = dictionary.some(d => d.kanji === b);
            return bExists - aExists; 
        });

        const finalResults = cleanResults.length > 0 ? cleanResults : singleChars.slice(0, 5);

        const mappedCandidates = finalResults.slice(0, 6).map(char => {
            const found = dictionary.find(item => item.kanji === char);
            return found || { 
                kanji: char, 
                hanviet: "---", 
                mean: "Chưa có trong dữ liệu",
                onyomi: "---",
                kunyomi: "---",
                detail: "Chưa có dữ liệu phân tích."
            };
        });

        setCandidates(mappedCandidates);
        if (mappedCandidates.length > 0) {
            setSelectedKanji(mappedCandidates[0]);
        }
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-r border-gray-100 p-5 flex flex-col shadow-sm z-10 flex-shrink-0">
        
        {/* LOGO KAN */}
        <div className="mb-10 flex items-center gap-3 px-1 select-none cursor-pointer group" onClick={() => window.location.reload()}>
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white text-3xl shadow-xl border-2 border-gray-800 transition-transform group-hover:scale-105" style={{ fontFamily: "'Yuji Syuku', serif" }}>
                漢
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mt-1" style={{ fontFamily: "'Yuji Syuku', serif" }}>
                KAN
            </h1>
        </div>

        <nav className="flex-1 space-y-2 font-bold text-gray-400">
          {/* 3. DÙNG BIẾN t THAY CHO CHỮ CỨNG */}
          <div className="text-black bg-gray-100 p-3 rounded-xl cursor-pointer flex items-center gap-3"><span>✍️</span> {t.menu_handwriting}</div>
          <div className="hover:text-black p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer flex items-center gap-3"><span>🤖</span> {t.menu_chatbot}</div>
          <div className="hover:text-black p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer flex items-center gap-3"><span>📖</span> {t.menu_dictionary}</div>
        </nav>
        
        <UserProfile />
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 h-full max-h-screen overflow-hidden">
        
        {/* CỘT TRÁI: KHU VỰC VẼ */}
        <div className="col-span-7 bg-white rounded-[1.5rem] shadow-lg border border-gray-100 p-5 flex flex-col h-full overflow-hidden">
          
          <div className="flex justify-between items-center mb-2 flex-shrink-0">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t.home_drawing_area}</h3>
            <button 
                onClick={() => { if(canvasRef.current.undo) canvasRef.current.undo(); }} 
                className="text-xs font-bold text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
                <span>↩</span> {t.home_undo}
            </button>
          </div>
          
          <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2 relative">
             <div className="aspect-square h-full max-h-full bg-[#fffcf5] rounded-[4px] border-4 border-red-900/10 shadow-inner overflow-hidden relative cursor-crosshair">
                <KanjiCanvas ref={canvasRef} onStrokeEnd={handleIdentify} />
             </div>
          </div>

          <div className="flex-shrink-0 mt-2 flex flex-col gap-2">
            <div className="flex gap-2 justify-center h-12 overflow-x-auto">
                {candidates.length > 0 ? (
                    candidates.map((item, index) => (
                    <button 
                        key={index} 
                        onClick={() => setSelectedKanji(item)}
                        style={{ fontFamily: "'Yuji Syuku', serif" }} 
                        className={`flex-shrink-0 w-12 h-12 rounded-lg text-2xl transition-all border-2 flex items-center justify-center pb-1 ${selectedKanji?.kanji === item.kanji ? 'bg-black text-white border-black scale-105 shadow-md' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                    >
                        {item.kanji}
                    </button>
                    ))
                ) : (
                    <div className="text-[10px] text-gray-300 font-bold flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg w-full">
                        {isAnalyzing ? t.home_analyzing : t.home_hint_draw}
                    </div>
                )}
            </div>
            
            <button 
                onClick={() => { canvasRef.current.clear(); setCandidates([]); setSelectedKanji(null); }} 
                className="w-full py-3 bg-gray-50 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
            >
                {t.home_clear}
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ */}
        <div className="col-span-5 flex flex-col gap-4 h-full overflow-hidden">
            
            <div className="bg-white rounded-[1.5rem] shadow-lg border border-gray-100 p-6 flex flex-col items-center relative overflow-hidden flex-1 min-h-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                
                <div className="relative z-10 w-full flex flex-col items-center h-full justify-center">
                    <div 
                        className="w-24 h-24 bg-black text-white rounded-[1.2rem] flex items-center justify-center text-6xl mb-3 shadow-xl pb-2 flex-shrink-0"
                        style={{ fontFamily: "'Yuji Syuku', serif" }}
                    >
                        {selectedKanji?.kanji || "?"}
                    </div>
                    
                    <span className="text-[9px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded uppercase mb-1">{t.home_result_hanviet}</span>
                    
                    <h3 className="text-2xl font-black mb-4 text-gray-800 text-center uppercase truncate w-full">
                        {selectedKanji?.hanviet || "---"}
                    </h3>

                    <div className="w-full grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Onyomi</p>
                            <p className="font-bold text-gray-700 text-xs truncate">{selectedKanji?.onyomi || "-"}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Kunyomi</p>
                            <p className="font-bold text-gray-700 text-xs truncate">{selectedKanji?.kunyomi || "-"}</p>
                        </div>
                    </div>
                    
                    <div className="w-full text-center border-t border-gray-100 pt-4 flex-1 flex flex-col justify-center">
                        <p className="text-gray-300 font-bold uppercase text-[9px] tracking-widest mb-1">{t.home_meaning}</p>
                        <p className="text-base font-bold text-gray-700 leading-snug line-clamp-3">
                            {selectedKanji?.mean || "---"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[1.5rem] border border-blue-100 p-5 flex flex-col justify-center items-center text-center gap-2 relative overflow-hidden group flex-shrink-0">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
                
                <div className="flex items-center gap-2">
                     <span className="text-2xl group-hover:-translate-y-1 transition-transform">🚀</span>
                     <div className="text-left">
                        <h4 className="font-bold text-blue-900 text-sm">{t.home_detail_title}</h4>
                        <p className="text-[10px] text-blue-600/80">{t.home_detail_sub}</p>
                     </div>
                </div>

                <button 
                    onClick={() => { if (selectedKanji) navigate(`/kanji/${selectedKanji.kanji}`); }}
                    disabled={!selectedKanji}
                    className="w-full mt-2 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200 hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
                >
                    {t.home_detail_btn}
                </button>
            </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;