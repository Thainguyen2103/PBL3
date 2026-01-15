  import React, { useState, useEffect, useRef } from 'react';
  import { useNavigate } from 'react-router-dom';
  import KanjiCanvas from '../components/KanjiCanvas';
  // Import file từ điển json để tra cứu thông tin chi tiết
  import kanjiDictionary from '../utils/kanji-dictionary.json'; 

  const HomePage = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    
    const [activeTab, setActiveTab] = useState('handwriting'); 
    const [selectedKanji, setSelectedKanji] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [candidates, setCandidates] = useState([]); // Lưu danh sách 6 chữ gợi ý từ AI
    
    const session = JSON.parse(localStorage.getItem('session'));

    useEffect(() => {
      if (!session) navigate('/auth');
    }, [session, navigate]);

    // --- HÀM TRA CỨU CHI TIẾT KANJI TỪ TỪ ĐIỂN OFFLINE ---
    const updateKanjiDetails = (char) => {
      const found = kanjiDictionary.find(item => item.kanji === char);
      
      if (found) {
        setSelectedKanji({
          char: found.kanji,
          hanviet: found.hanviet,
          mean: found.mean,
          kunyomi: found.kunyomi,
          onyomi: found.onyomi
        });
      } else {
        // Trường hợp AI nhận diện đúng nhưng từ điển JSON chưa có chữ này
        setSelectedKanji({
          char,
          hanviet: "TRA CỨU THÊM",
          mean: "Chữ này hiện chưa có dữ liệu chi tiết trong từ điển offline.",
          kunyomi: "...",
          onyomi: "..."
        });
      }
    };

    // --- HÀM XỬ LÝ NHẬN DIỆN (LẤY 6 GỢI Ý) ---
    const handleIdentify = async () => {
      if (!canvasRef.current) return;
      setIsAnalyzing(true);
      setCandidates([]); // Xóa danh sách gợi ý cũ

      const imageData = canvasRef.current.getCanvasImage();

      try {
        const response = await fetch('https://pbl3-sofd.onrender.com/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData }),
        });

        const data = await response.json();

        // Kiểm tra biến 'candidates' trả về từ Server mới
        if (response.ok && data.candidates && data.candidates.length > 0) {
          setCandidates(data.candidates); // Hiển thị các nút gợi ý
          updateKanjiDetails(data.candidates[0]); // Mặc định hiển thị chi tiết chữ đầu tiên
        } else {
          alert("Lỗi: " + (data.error || "Không nhận diện được hình vẽ"));
        }

      } catch (error) {
        console.error("Lỗi kết nối:", error);
        alert("Không kết nối được với Server Render. Vui lòng thử lại!");
      } finally {
        setIsAnalyzing(false);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem('session');
      navigate('/auth');
    };

    const menuItems = [
      { id: 'profile', label: 'Tài Khoản', icon: '👤' },
      { id: 'chatbot', label: 'AI ChatBot', icon: '🤖' },
      { id: 'handwriting', label: 'Tra Cứu Viết Tay', icon: '✍️' },
      { id: 'dictionary', label: 'Từ Điển', icon: '📖' },
      { id: 'translate', label: 'Dịch Thuật', icon: '🌐' },
    ];

    return (
      <div className="flex h-screen w-screen bg-[#F1F3F5] font-sans text-slate-800 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center text-white text-xl font-black">漢</div>
            <h1 className="hidden lg:block text-lg font-black italic">Dojo</h1>
          </div>
          <nav className="flex-1 px-4 mt-4 space-y-1">
            {menuItems.map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === item.id ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <span>{item.icon}</span> <span className="hidden lg:block">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-6 border-t">
            <button onClick={handleLogout} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-red-500 w-full text-left">
              LOGOUT
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden">
          <header className="h-14 px-8 flex items-center justify-between border-b bg-white/50 backdrop-blur-md">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{activeTab}</span>
            <span className="text-[10px] font-bold text-slate-500">{session?.user?.email}</span>
          </header>

          <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
            <div className="w-full max-w-[1400px] h-full grid grid-cols-12 gap-8">
              
              {activeTab === 'handwriting' && (
                <>
                  {/* CỘT VIẾT TAY (7/12) */}
                  <div className="col-span-12 xl:col-span-7 flex flex-col h-full">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-white flex-1 flex flex-col">
                      <div className="flex-1 relative bg-[#FDFBF7] rounded-[1.8rem] border border-slate-100 overflow-hidden shadow-inner">
                        <KanjiCanvas ref={canvasRef} /> 
                      </div>

                      {/* HIỂN THỊ DANH SÁCH 6 GỢI Ý */}
                      <div className="mt-4 flex gap-3 justify-center min-h-[60px]">
                        {candidates.map((char, index) => (
                          <button 
                            key={index}
                            onClick={() => updateKanjiDetails(char)}
                            className={`w-14 h-14 rounded-2xl text-2xl font-black transition-all border-2 flex items-center justify-center
                              ${selectedKanji?.char === char 
                                ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-lg scale-110' 
                                : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600'}`}
                          >
                            {char}
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 flex gap-4">
                        <button 
                          onClick={handleIdentify} 
                          disabled={isAnalyzing} 
                          className="flex-[3] py-5 bg-[#0F172A] text-white rounded-[1.2rem] font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg"
                        >
                          {isAnalyzing ? 'ĐANG PHÂN TÍCH...' : 'NHẬN DIỆN (GEMINI AI)'}
                        </button>
                        <button 
                          onClick={() => {
                            canvasRef.current.clear();
                            setCandidates([]);
                            setSelectedKanji(null);
                          }} 
                          className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[1.2rem] font-black text-[10px] uppercase hover:bg-slate-100"
                        >
                          XÓA
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CỘT KẾT QUẢ (5/12) */}
                  <div className="col-span-12 xl:col-span-5 flex flex-col h-full">
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-white p-8 flex-1 flex flex-col">
                      
                      <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-50">
                        <div className="w-28 h-28 bg-[#0F172A] rounded-[1.8rem] flex items-center justify-center text-6xl font-black text-white shadow-xl">
                          {selectedKanji?.char || '？'}
                        </div>
                        <div>
                          <span className="px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[9px] font-black uppercase tracking-widest">Hán Việt</span>
                          <h4 className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{selectedKanji?.hanviet || '---'}</h4>
                        </div>
                      </div>

                      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nghĩa</p>
                          <p className="text-lg font-bold text-slate-600 leading-snug">
                            {selectedKanji?.mean || 'Hãy viết chữ vào bảng bên trái và nhấn nhận diện.'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-2xl">
                              <p className="text-[9px] font-black text-slate-400 mb-1">KUNYOMI</p>
                              <p className="font-black text-slate-800">{selectedKanji?.kunyomi || '---'}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl">
                              <p className="text-[9px] font-black text-slate-400 mb-1">ONYOMI</p>
                              <p className="font-black text-slate-800">{selectedKanji?.onyomi || '---'}</p>
                          </div>
                        </div>
                      </div>

                      <button className="mt-6 w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-colors">
                        🔍 XEM CHI TIẾT BỘ THỦ
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  };

  export default HomePage;