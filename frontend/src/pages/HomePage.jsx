import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KanjiCanvas from '../components/KanjiCanvas';
import { getKanjiList } from '../utils/kanjiData';

const HomePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  // State quản lý dữ liệu
  const [candidates, setCandidates] = useState([]); // Danh sách 6 chữ gợi ý
  const [selectedKanji, setSelectedKanji] = useState(null); // Chữ đang chọn xem chi tiết
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dictionary, setDictionary] = useState([]);

  // 1. Kiểm tra Session (Chặn nếu chưa đăng nhập)
  const session = JSON.parse(localStorage.getItem('session'));
  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  // 2. Tải từ điển Offline
  useEffect(() => {
    const list = getKanjiList();
    setDictionary(list);
  }, []);

  // --- HÀM NHẬN DIỆN OFFLINE (HANZI/MAZII STYLE) ---
  const handleIdentify = () => {
    // Lấy nét vẽ
    if (!canvasRef.current || !canvasRef.current.getTrace) return;
    const trace = canvasRef.current.getTrace();
    
    // Nếu chưa vẽ gì thì dừng
    if (!trace || trace.length === 0) return;

    setIsAnalyzing(true);

    // GỌI THƯ VIỆN HANDWRITING (Xử lý ngay tại trình duyệt)
    if (window.handwriting) {
        window.handwriting.recognize(trace, { language: "ja", numOfReturn: 10 }, (results) => {
            if (results && results.length > 0) {
                // results = ['木', '本', '术'...]
                
                // Tìm kiếm trong từ điển Offline
                const mappedCandidates = results.map(char => {
                    const found = dictionary.find(item => item.kanji === char);
                    // Nếu không có trong từ điển thì vẫn hiện chữ đó nhưng để trống nghĩa
                    return found || { 
                        kanji: char, 
                        hanviet: "---", 
                        mean: "Chưa có trong dữ liệu",
                        onyomi: "---",
                        kunyomi: "---",
                        detail: "Chưa có dữ liệu phân tích cho chữ này."
                    };
                });

                setCandidates(mappedCandidates);
                setSelectedKanji(mappedCandidates[0]); // Chọn chữ đầu tiên
            }
            setIsAnalyzing(false);
        });
    } else {
        alert("Lỗi: Thư viện Handwriting chưa tải xong. Hãy F5 lại trang!");
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col shadow-sm z-10">
        <h2 className="text-3xl font-black italic mb-10 tracking-tighter">Dojo</h2>
        <nav className="flex-1 space-y-3 font-bold text-gray-400">
          <div className="text-black bg-gray-100 p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all">
            <span>✍️</span> Tra cứu viết tay
          </div>
          <div className="hover:text-black p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer flex items-center gap-3">
            <span>🤖</span> AI Chatbot
          </div>
          <div className="hover:text-black p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer flex items-center gap-3">
            <span>📖</span> Từ điển
          </div>
        </nav>
        <button 
          onClick={() => { localStorage.removeItem('session'); navigate('/auth'); }} 
          className="text-xs font-black text-gray-300 uppercase hover:text-red-500 transition-colors pl-3 tracking-widest"
        >
          LOGOUT
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 h-full overflow-y-auto">
        
        {/* CỘT TRÁI: BẢNG VẼ */}
        <div className="col-span-7 bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 flex flex-col h-full max-h-[90vh]">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Khu vực vẽ</h3>
            <button 
                onClick={() => { if(canvasRef.current.undo) canvasRef.current.undo(); }} 
                className="text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1 rounded-lg"
            >
                Hoàn tác ↩
            </button>
          </div>
          
          <div className="flex-1 bg-[#F8F9FA] rounded-[1.5rem] border-2 border-dashed border-gray-200 overflow-hidden mb-6 relative cursor-crosshair">
            {/* Tự động nhận diện khi nhấc bút (onStrokeEnd) */}
            <KanjiCanvas ref={canvasRef} onStrokeEnd={handleIdentify} />
            
            {/* Label hướng dẫn mờ */}
            {!isAnalyzing && candidates.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-gray-400 font-bold text-lg">
                    Vẽ chữ Kanji vào đây...
                </div>
            )}
          </div>

          {/* THANH GỢI Ý KẾT QUẢ */}
          <div className="flex gap-3 justify-center mb-6 min-h-[64px] px-4 overflow-x-auto py-2">
            {candidates.map((item, index) => (
              <button 
                key={index}
                onClick={() => setSelectedKanji(item)}
                className={`flex-shrink-0 w-14 h-14 rounded-xl text-2xl font-serif font-bold transition-all border-2 
                  ${selectedKanji?.kanji === item.kanji 
                    ? 'bg-black text-white border-black transform -translate-y-1 shadow-lg scale-110' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'
                  }`}
              >
                {item.kanji}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button 
                onClick={handleIdentify} 
                disabled={isAnalyzing} 
                className="flex-1 py-4 bg-black text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-gray-800 transition-all active:scale-95"
            >
              {isAnalyzing ? "ĐANG TÌM..." : "NHẬN DIỆN THỦ CÔNG"}
            </button>
            <button 
                onClick={() => { 
                    canvasRef.current.clear(); 
                    setCandidates([]); 
                    setSelectedKanji(null); 
                }} 
                className="px-8 py-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all active:scale-95"
            >
              XÓA
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ CHI TIẾT (ĐÃ THÊM ON/KUN/NGUỒN GỐC) */}
        <div className="col-span-5 flex flex-col gap-6 h-full">
            
            {/* THẺ KẾT QUẢ CHÍNH */}
            <div className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-8 flex flex-col items-center relative overflow-hidden flex-1">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>

                <div className="relative z-10 w-full flex flex-col items-center">
                    {/* Chữ Kanji To */}
                    <div className="w-28 h-28 bg-black text-white rounded-[1.5rem] flex items-center justify-center text-6xl font-serif font-medium mb-4 shadow-2xl transition-transform hover:scale-105 duration-300">
                    {selectedKanji?.kanji || "?"}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded uppercase tracking-wider">Hán Việt</span>
                    </div>
                    
                    <h3 className="text-3xl font-black mb-6 text-gray-800 text-center uppercase tracking-tight">
                        {selectedKanji?.hanviet || "---"}
                    </h3>

                    {/* BẢNG THÔNG TIN ON/KUN [CẬP NHẬT MỚI] */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Âm Onyomi</p>
                            <p className="font-bold text-gray-700 text-sm">{selectedKanji?.onyomi || "---"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Âm Kunyomi</p>
                            <p className="font-bold text-gray-700 text-sm">{selectedKanji?.kunyomi || "---"}</p>
                        </div>
                    </div>
                    
                    <div className="w-full border-t border-gray-100 mb-6"></div>

                    {/* NGHĨA */}
                    <div className="w-full text-center mb-6">
                        <p className="text-gray-300 font-bold uppercase text-[10px] tracking-widest mb-2">Ý nghĩa</p>
                        <p className="text-lg font-bold text-gray-700 leading-snug">
                            {selectedKanji?.mean || "Hãy vẽ chữ vào bảng bên trái."}
                        </p>
                    </div>
                </div>
            </div>

            {/* THẺ PHÂN TÍCH NGUỒN GỐC [CẬP NHẬT MỚI] */}
            <div className="bg-blue-50/50 rounded-[2rem] border border-blue-100 p-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">💡</span>
                    <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Phân tích & Nguồn gốc</h4>
                </div>
                <p className="text-sm text-blue-800/80 font-medium leading-relaxed">
                    {selectedKanji?.detail || "Thông tin nguồn gốc của từ sẽ hiện tại đây sau khi nhận diện."}
                </p>
            </div>

        </div>
      </main>
    </div>
  );
};

export default HomePage;