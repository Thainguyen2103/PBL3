import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KanjiCanvas from '../components/KanjiCanvas';

const HomePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const session = JSON.parse(localStorage.getItem('session'));

  useEffect(() => {
    if (!session) navigate('/auth');
  }, [session, navigate]);

  const handleIdentify = async () => {
    if (!canvasRef.current) return;
    setIsAnalyzing(true);
    setCandidates([]);

    const imageData = canvasRef.current.getCanvasImage();

    try {
      // Phải có /api/ocr để khớp với server.js
      const response = await fetch("https://pbl3-sofd.onrender.com/api/ocr", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();

      if (response.ok) {
        setCandidates(data.candidates); // Nhận về 6 gợi ý
        setSelectedKanji(data.candidates[0]); // Mặc định chọn chữ đầu tiên
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Lỗi kết nối AI. Hãy kiểm tra Logs trên Render!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r p-6 flex flex-col">
        <h2 className="text-2xl font-black italic mb-10">Dojo</h2>
        <nav className="flex-1 space-y-4 font-bold text-slate-400">
          <p className="text-black">✍️ Tra cứu viết tay</p>
          <p>🤖 AI Chatbot</p>
          <p>📖 Từ điển</p>
        </nav>
        <button onClick={() => { localStorage.removeItem('session'); navigate('/auth'); }} className="text-xs font-black text-slate-300 uppercase">LOGOUT</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 grid grid-cols-12 gap-8">
        {/* CỘT TRÁI: BẢNG VẼ */}
        <div className="col-span-7 bg-white rounded-[2.5rem] shadow-xl p-8 flex flex-col">
          <div className="flex-1 bg-slate-50 rounded-[1.8rem] border border-slate-100 overflow-hidden mb-6">
            <KanjiCanvas ref={canvasRef} />
          </div>

          {/* HIỂN THỊ 6 GỢI Ý */}
          <div className="flex gap-2 justify-center mb-6 min-h-[56px]">
            {candidates.map((item, index) => (
              <button 
                key={index}
                onClick={() => setSelectedKanji(item)}
                className={`w-14 h-14 rounded-2xl text-2xl font-black transition-all border-2 
                  ${selectedKanji?.kanji === item.kanji ? 'bg-black text-white border-black' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
              >
                {item.kanji}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            <button onClick={handleIdentify} disabled={isAnalyzing} className="flex-1 py-5 bg-black text-white rounded-2xl font-black uppercase text-xs">
              {isAnalyzing ? "ĐANG PHÂN TÍCH..." : "NHẬN DIỆN"}
            </button>
            <button onClick={() => { canvasRef.current.clear(); setCandidates([]); setSelectedKanji(null); }} className="px-8 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">XÓA</button>
          </div>
        </div>

        {/* CỘT PHẢI: KẾT QUẢ */}
        <div className="col-span-5 bg-white rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center">
          <div className="w-32 h-32 bg-black text-white rounded-[1.8rem] flex items-center justify-center text-6xl font-black mb-6">
            {selectedKanji?.kanji || "?"}
          </div>
          <h3 className="text-4xl font-black mb-2">{selectedKanji?.hanviet || "---"}</h3>
          <p className="text-slate-500 font-bold mb-8 uppercase text-xs tracking-widest">Nghĩa của chữ</p>
          <div className="flex-1 bg-slate-50 w-full rounded-2xl p-6 text-lg font-bold text-slate-600 text-center">
            {selectedKanji?.mean || "Vẽ chữ vào bảng bên trái để xem kết quả."}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;