import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KanjiCanvas from '../components/KanjiCanvas';
import { getKanjiList } from '../utils/kanjiData';

const HomePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  // State quản lý dữ liệu
  const [candidates, setCandidates] = useState([]);
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dictionary, setDictionary] = useState([]);

  // 1. Kiểm tra đăng nhập
  const session = JSON.parse(localStorage.getItem('session'));
  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  // 2. Tải từ điển Offline
  useEffect(() => {
    const list = getKanjiList();
    setDictionary(list);
  }, []);

  // --- HÀM XỬ LÝ NHẬN DIỆN (OFFLINE - CỰC NHANH) ---
  const handleIdentify = () => {
    // Lấy tọa độ từ Canvas mới
    if (!canvasRef.current || !canvasRef.current.getTrace) return;
    const trace = canvasRef.current.getTrace();
    
    if (!trace || trace.length === 0) return;

    setIsAnalyzing(true);

    // Gọi thư viện handwriting.js
    window.handwriting.recognize(trace, { language: "ja", numOfReturn: 6 }, (results) => {
      if (results && results.length > 0) {
        // results = ['A', 'B', 'C'...]
        // Khớp với từ điển offline để lấy nghĩa
        const mappedCandidates = results.map(char => {
            const found = dictionary.find(item => item.kanji === char);
            return found || { 
                kanji: char, 
                hanviet: "---", 
                mean: "Chưa có trong từ điển offline" 
            };
        });

        setCandidates(mappedCandidates);
        setSelectedKanji(mappedCandidates[0]);
      } else {
        // Không nhận ra chữ gì
        setCandidates([]);
      }
      setIsAnalyzing(false);
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR (GIỮ NGUYÊN GIAO DIỆN CŨ) */}
      <aside className="w-64 bg-white border-r p-6 flex flex-col">
        <h2 className="text-2xl font-black italic mb-10">Dojo</h2>
        <nav className="flex-1 space-y-4 font-bold text-slate-400">
          <p className="text-black bg-slate-100 p-2 rounded-lg cursor-pointer">✍️ Tra cứu viết tay</p>
          <p className="hover:text-black p-2 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">🤖 AI Chatbot</p>
          <p className="hover:text-black p-2 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">📖 Từ điển</p>
        </nav>
        <button 
          onClick={() => { localStorage.removeItem('session'); navigate('/auth'); }} 
          className="text-xs font-black text-slate-300 uppercase hover:text-red-500 transition-colors text-left pl-2"
        >
          LOGOUT
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8">
        
        {/* CỘT TRÁI: BẢNG VẼ */}
        <div className="col-span-7 bg-white rounded-[2.5rem] shadow-xl p-8 flex flex-col">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Handwriting</h3>
            <button 
                onClick={() => canvasRef.current.undo()} 
                className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
            >
                Hoàn tác ↩
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-[1.8rem] border border-slate-100 overflow-hidden mb-6 relative">
            {/* onStrokeEnd: Vẽ xong nét nào là nhận diện luôn nét đó */}
            <KanjiCanvas ref={canvasRef} onStrokeEnd={handleIdentify} />
          </div>

          {/* HIỂN THỊ 6 GỢI Ý */}
          <div className="flex gap-2 justify-center mb-6 min-h-[56px]">
            {candidates.map((item, index) => (
              <button 
                key={index}
                onClick={() => setSelectedKanji(item)}
                className={`w-14 h-14 rounded-2xl text-2xl font-black transition-all border-2 
                  ${selectedKanji?.kanji === item.kanji 
                    ? 'bg-black text-white border-black transform -translate-y-1 shadow-lg' 
                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600'
                  }`}
              >
                {item.kanji}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button 
                onClick={handleIdentify} 
                className="flex-1 py-5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95"
            >
              {isAnalyzing ? "..." : "NHẬN DIỆN"}
            </button>
            <button 
                onClick={() => { 
                    canvasRef.current.clear(); 
                    setCandidates([]); 
                    setSelectedKanji(null); 
                }} 
                className="px-8 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              XÓA
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ CHI TIẾT */}
        <div className="col-span-5 bg-white rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>

          <div className="relative z-10 w-full flex flex-col items-center">
            <div className="w-32 h-32 bg-black text-white rounded-[1.8rem] flex items-center justify-center text-6xl font-black mb-6 shadow-2xl transition-all duration-300">
              {selectedKanji?.kanji || "?"}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black bg-red-100 text-red-500 px-2 py-1 rounded-md uppercase tracking-wider">Hán Việt</span>
            </div>
            
            <h3 className="text-4xl font-black mb-8 text-gray-800 text-center break-words w-full">
                {selectedKanji?.hanviet || "---"}
            </h3>
            
            <div className="w-full border-t border-slate-100 mb-8"></div>

            <p className="text-slate-400 font-bold mb-4 uppercase text-[10px] tracking-widest self-start pl-4">Nghĩa của chữ</p>
            <div className="flex-1 bg-slate-50 w-full rounded-3xl p-6 text-lg font-bold text-slate-600 text-center flex items-center justify-center min-h-[120px] border border-slate-100">
              {selectedKanji?.mean || "Hãy vẽ chữ vào bảng bên trái."}
            </div>

            <button className="mt-8 text-blue-600 text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-2 group">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Xem chi tiết bộ thủ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;