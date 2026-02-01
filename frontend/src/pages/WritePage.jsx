import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import KanjiCanvas from '../components/KanjiCanvas';
import { searchAndGraphData as dictionaryData } from "../utils/kanji-dictionary";
import { useAppContext } from '../context/AppContext';
import Sidebar from '../components/Sidebar';

const WritePage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const { t, user, language } = useAppContext();
  const [candidates, setCandidates] = useState([]);
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dictionary] = useState(dictionaryData);

  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);

  const getContent = (field) => {
    if (!field) return "---";
    return typeof field === 'object' ? (field[language] || field['vi'] || "---") : field;
  };

  // --- LOGIC NHẬN DIỆN ---
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
        if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]) return data[1][0][1];
        return [];
    } catch (error) { console.error("Lỗi API:", error); return []; }
  };

  const handleIdentify = async () => {
    if (!canvasRef.current || !canvasRef.current.getTrace) return;
    const trace = canvasRef.current.getTrace();
    const dimensions = canvasRef.current.getDimensions ? canvasRef.current.getDimensions() : { width: 500, height: 500 };
    if (!trace || trace.length === 0) return;

    setIsAnalyzing(true);
    let results = await recognizeKanji(trace, dimensions.width, dimensions.height);
    
    if (results && results.length > 0) {
        const radicalMap = { '⻌': '辶', '⻏': '阝', '⺾': '艹', '⺡': '氵', '⺅': '亻', '⺘': '扌', '⺖': '忄', '⺣': '灬', '之': '辶' };
        results = results.map(char => radicalMap[char] || char);
        const singleChars = results.filter(str => str.length === 1);
        const kanjiRegex = /^[\u4E00-\u9FAF\u2E80-\u2EFF]+$/;
        const cleanResults = singleChars.filter(char => kanjiRegex.test(char));
        cleanResults.sort((a, b) => {
            const aExists = dictionary.some(d => d.kanji === a);
            const bExists = dictionary.some(d => d.kanji === b);
            return bExists - aExists; 
        });
        const finalResults = cleanResults.length > 0 ? cleanResults : singleChars.slice(0, 5);
        const mappedCandidates = finalResults.slice(0, 6).map(char => {
            const found = dictionary.find(item => item.kanji === char);
            return found || { kanji: char, hanviet: "---", mean: "Chưa có trong dữ liệu", onyomi: "---", kunyomi: "---", detail: "Dữ liệu ký tự này chưa được cập nhật." };
        });
        setCandidates(mappedCandidates);
        if (mappedCandidates.length > 0) setSelectedKanji(mappedCandidates[0]);
    }
    setIsAnalyzing(false);
  };

  // --- 🔥 HÀM XỬ LÝ KHI CHUỘT RA NGOÀI KHUNG 🔥 ---
  const handleMouseLeave = () => {
      // Gọi hàm up() của thư viện handwriting để ngắt nét vẽ
      if (canvasRef.current && canvasRef.current.up) {
          console.log("Chuột ra ngoài -> Ngắt nét vẽ");
          canvasRef.current.up(); 
      }
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 h-full max-h-screen overflow-hidden">
        
        <div className="col-span-7 bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 p-6 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t?.write_area || "KHU VỰC VẼ"}</h3>
            <button onClick={() => { if(canvasRef.current.undo) canvasRef.current.undo(); }} className="text-xs font-bold text-gray-500 hover:text-black bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-1">
                <span>↩</span> {t?.write_undo || "Hoàn tác"}
            </button>
          </div>
          
          <div className="flex-1 min-h-0 w-full flex items-center justify-center py-2 relative">
             
             {/* --- VÙNG VẼ --- */}
             <div 
                className="aspect-square h-full max-h-full bg-[#fffcf5] rounded-[1rem] border-4 border-gray-100 shadow-inner overflow-hidden relative no-select cursor-default"
                // 🔥 QUAN TRỌNG: Bắt sự kiện React ở đây
                onMouseLeave={handleMouseLeave} 
                onTouchEnd={handleMouseLeave} // Cho cảm ứng
             >
                {/* Class pen-cursor để hiện bút lông */}
                <div className="w-full h-full pen-cursor">
                    <KanjiCanvas ref={canvasRef} onStrokeEnd={handleIdentify} />
                </div>
             </div>

          </div>

          <div className="flex-shrink-0 mt-4 flex flex-col gap-3">
            <div className="flex gap-2 justify-center h-14 overflow-x-auto py-1">
                {candidates.length > 0 ? (
                    candidates.map((item, index) => (
                    <button key={index} onClick={() => setSelectedKanji(item)} style={{ fontFamily: "'DFKai-SB', serif" }} className={`flex-shrink-0 w-12 h-12 rounded-xl text-2xl transition-all border-2 flex items-center justify-center pb-1 ${selectedKanji?.kanji === item.kanji ? 'bg-black text-white border-black scale-110 shadow-lg' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}>
                        {item.kanji}
                    </button>
                    ))
                ) : (
                    <div className="text-xs text-gray-300 font-bold flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl w-full">
                        {isAnalyzing ? (t?.write_analyzing || "Đang phân tích...") : (t?.write_hint || "Hãy vẽ chữ vào ô vuông")}
                    </div>
                )}
            </div>
            <button onClick={() => { canvasRef.current.clear(); setCandidates([]); setSelectedKanji(null); }} className="w-full py-3.5 bg-gray-50 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-500 transition-all">
                {t?.write_clear || "XÓA BẢNG VẼ"}
            </button>
          </div>
        </div>

        {/* --- CỘT PHẢI (Giữ nguyên) --- */}
        <div className="col-span-5 flex flex-col gap-6 h-full overflow-hidden">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 p-8 flex flex-col items-center relative overflow-hidden flex-1 min-h-0">
                <div className="relative z-10 w-full flex flex-col items-center h-full justify-center">
                    <div className="w-28 h-28 bg-black text-white rounded-[1.5rem] flex items-center justify-center text-7xl mb-4 shadow-2xl pb-2 flex-shrink-0" style={{ fontFamily: "'DFKai-SB', serif" }}>
                        {selectedKanji?.kanji || "?"}
                    </div>
                    <span className="text-[10px] font-black bg-red-50 text-red-500 px-3 py-1 rounded-full uppercase mb-2 tracking-wide">
                        {t?.write_result_hanviet || "HÁN VIỆT"}
                    </span>
                    <h3 className="text-3xl font-black mb-6 text-gray-800 text-center uppercase truncate w-full">{selectedKanji?.hanviet || "---"}</h3>
                    <div className="w-full grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Onyomi</p>
                            <p className="font-bold text-gray-700 text-sm truncate">{selectedKanji?.onyomi || "-"}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Kunyomi</p>
                            <p className="font-bold text-gray-700 text-sm truncate">{selectedKanji?.kunyomi || "-"}</p>
                        </div>
                    </div>
                    <div className="w-full text-center border-t border-gray-100 pt-6 flex-1 flex flex-col justify-center">
                        <p className="text-gray-300 font-bold uppercase text-[9px] tracking-widest mb-2">
                            {t?.write_meaning || "Ý nghĩa"}
                        </p>
                        <p className="text-lg font-bold text-gray-700 leading-snug line-clamp-3">
                            {getContent(selectedKanji?.mean)}
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] border border-blue-100 p-6 flex flex-col justify-center items-center text-center gap-3 relative overflow-hidden group flex-shrink-0 cursor-pointer hover:shadow-lg transition-all" onClick={() => { if (selectedKanji) navigate(`/kanji/${selectedKanji.kanji}`); }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center gap-3">
                      <span className="text-3xl group-hover:-translate-y-1 transition-transform">🚀</span>
                      <div className="text-left">
                          <h4 className="font-bold text-blue-900 text-sm">
                              {t?.write_deep_dive_title || "Bạn muốn hiểu sâu chữ này?"}
                          </h4>
                          <p className="text-[10px] text-blue-600/80">
                              {t?.write_deep_dive_sub || "Xem phân tích bộ thủ, cách nhớ."}
                          </p>
                      </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default WritePage;