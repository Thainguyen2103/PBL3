import React, { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { useAppContext } from '../context/AppContext'; // Import Context

const KanjiWritingModal = ({ char, hanviet, onClose }) => {
    const { t } = useAppContext(); // Lấy hàm dịch t
    const writerRef = useRef(null);
    const timeoutRef = useRef(null);
    const [writer, setWriter] = useState(null);
    const [isHintVisible, setIsHintVisible] = useState(true); 
    const [mode, setMode] = useState('quiz'); 
    const [resetKey, setResetKey] = useState(0); 

    const SIZE = 500; 

    useEffect(() => {
        let writerInstance = null;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (writerRef.current) {
            writerRef.current.innerHTML = ""; 

            try {
                writerInstance = HanziWriter.create(writerRef.current, char, {
                    width: SIZE,
                    height: SIZE,
                    padding: 25,
                    showOutline: true,
                    strokeAnimationSpeed: 1,
                    delayBetweenStrokes: 200,
                    strokeColor: '#1e293b', 
                    outlineColor: '#cbd5e1', 
                    drawingWidth: 30, 
                    showCharacter: false, 
                });

                setWriter(writerInstance);
                writerInstance.quiz();

            } catch (err) {
                console.error("Lỗi khởi tạo:", err);
            }
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [char, resetKey]);

    const handleWatch = () => {
        if (!writer) return;
        setMode('animate');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        writer.cancelQuiz();
        writer.showCharacter();
        
        const playAnimation = () => {
            writer.animateCharacter({
                onComplete: () => {
                    timeoutRef.current = setTimeout(() => {
                        writer.hideCharacter();
                        setTimeout(() => {
                            writer.showCharacter();
                            playAnimation();
                        }, 200);
                    }, 2000);
                }
            });
        };
        playAnimation();
    };

    const handleQuiz = () => {
        setResetKey(prev => prev + 1); 
        setMode('quiz');
        setIsHintVisible(true);
    };

    const toggleHint = () => {
        if (!writer) return;
        if (isHintVisible) {
            writer.hideOutline();
        } else {
            writer.showOutline();
        }
        setIsHintVisible(!isHintVisible);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
            
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl relative flex flex-col lg:flex-row overflow-hidden ring-1 ring-white/20">
                
                {/* --- CỘT TRÁI: VÙNG VẼ --- */}
                <div className="flex-1 bg-[#f8fafc] flex flex-col items-center justify-center relative p-8 order-2 lg:order-1 select-none">
                    
                    <div 
                        className="relative bg-white shadow-xl rounded-[2rem] overflow-hidden cursor-crosshair shrink-0 border-4 border-white ring-1 ring-gray-200"
                        style={{ width: SIZE, height: SIZE }} 
                    >
                        {/* GRID KẺ Ô */}
                        <svg width={SIZE} height={SIZE} className="absolute inset-0 pointer-events-none z-0 opacity-20">
                            <rect x="0" y="0" width={SIZE} height={SIZE} fill="#fff" />
                            <line x1="0" y1="0" x2={SIZE} y2={SIZE} stroke="#ef4444" strokeWidth="2" strokeDasharray="10,10" />
                            <line x1={SIZE} y1="0" x2="0" y2={SIZE} stroke="#ef4444" strokeWidth="2" strokeDasharray="10,10" />
                            <line x1={SIZE/2} y1="0" x2={SIZE/2} y2={SIZE} stroke="#ef4444" strokeWidth="2" strokeDasharray="10,10"/>
                            <line x1="0" y1={SIZE/2} x2={SIZE} y2={SIZE/2} stroke="#ef4444" strokeWidth="2" strokeDasharray="10,10"/>
                            <rect x="2" y="2" width={SIZE-4} height={SIZE-4} fill="none" stroke="#ef4444" strokeWidth="4" rx="28" />
                        </svg>

                        {/* VÙNG VẼ */}
                        <div ref={writerRef} className="relative z-10 w-full h-full" />
                    </div>

                    <p className="mt-8 text-sm text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                        {mode === 'quiz' ? (
                            <>
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                {t?.practice_guide || "Dùng chuột tô theo nét mờ"}
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                {t?.loading || "Đang mô phỏng..."}
                            </>
                        )}
                    </p>
                </div>

                {/* --- CỘT PHẢI: SIDEBAR --- */}
                <div className="w-full lg:w-[360px] bg-white border-l border-gray-100 flex flex-col z-20 order-1 lg:order-2 shadow-2xl relative">
                    
                    {/* Header */}
                    <div className="p-8 pb-4 flex justify-between items-start">
                        <div>
                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider mb-2">
                                Practice Mode
                            </span>
                            <h3 className="text-3xl font-black text-slate-800">
                                {t?.practice_modal_title || "Tập Viết"}
                            </h3>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 bg-gray-50 hover:bg-slate-900 hover:text-white rounded-full flex items-center justify-center text-gray-400 transition-all text-xl font-bold"
                        >✕</button>
                    </div>

                    {/* Preview Char & Hán Việt */}
                    <div className="px-8 py-2">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-6xl text-slate-800 font-kai font-normal leading-none pb-2">{char}</span>
                            <div className="w-px h-10 bg-gray-200"></div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    {t?.write_result_hanviet || "Hán Việt"}
                                </p>
                                <p className="text-xl font-black text-slate-800 uppercase tracking-wide">
                                    {hanviet || "---"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* MENU ĐIỀU KHIỂN */}
                    <div className="flex-1 p-8 flex flex-col gap-3 justify-center">
                        
                        {/* 1. Xem Mẫu */}
                        <button 
                            onClick={handleWatch}
                            className={`w-full py-4 px-6 rounded-xl transition-all font-bold flex items-center gap-4 border
                                ${mode === 'animate' 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-100' 
                                    : 'bg-white border-gray-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'}
                            `}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{t?.practice_btn_sample || "Xem mẫu"}</span>
                        </button>

                        {/* 2. Viết lại / Tự viết */}
                        <button 
                            onClick={handleQuiz}
                            className={`w-full py-4 px-6 rounded-xl transition-all font-bold flex items-center gap-4 border
                                ${mode === 'quiz' 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                    : 'bg-white border-gray-200 text-slate-600 hover:border-slate-900 hover:text-slate-900'}
                            `}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            <span>{t?.practice_btn_rewrite || "Viết lại / Tự viết"}</span>
                        </button>

                        {/* 3. Ẩn/Hiện Gợi Ý */}
                        <button 
                            onClick={toggleHint}
                            className="w-full py-4 px-6 rounded-xl transition-all font-bold flex items-center gap-4 border border-gray-200 bg-white text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                        >
                            {isHintVisible ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                            {/* Logic hiển thị text Ẩn/Hiện */}
                            <span>
                                {isHintVisible 
                                    ? (t?.practice_btn_hide_hint || "Ẩn gợi ý") 
                                    : (t?.practice_btn_show_hint || "Hiện gợi ý") // Thêm key này vào translation nếu cần, hoặc fallback
                                }
                            </span>
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default KanjiWritingModal;