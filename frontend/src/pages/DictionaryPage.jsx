import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext';
import { flashcardData as dictionaryData } from "../utils/kanji-dictionary";
import { translations } from '../utils/translations'; // Import trực tiếp để đảm bảo

const DictionaryPage = () => {
    const navigate = useNavigate();
    const { user, language } = useAppContext(); // Lấy language từ context
    
    // ✅ Lấy đúng translation object
    const t = translations[language] || translations.vi;

    const [searchTerm, setSearchTerm] = useState("");

    // --- LOGIC LỌC THÔNG MINH ---
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return dictionaryData;
        
        const term = searchTerm.trim().toLowerCase();
        const normalizeVi = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

        // ✅ Kiểm tra nếu input là số thứ tự (1-512)
        const searchNumber = parseInt(term);
        if (!isNaN(searchNumber) && searchNumber >= 1 && searchNumber <= dictionaryData.length) {
            return [dictionaryData[searchNumber - 1]]; // Trả về đúng 1 item theo số thứ tự
        }

        return dictionaryData.filter(item => {
            // 1. TRA XUÔI: Tìm theo Hán Việt / Nghĩa / Kana
            const hanviet = item.hanviet ? item.hanviet.toLowerCase() : "";
            if (hanviet.includes(term) || normalizeVi(hanviet).includes(term)) return true;

            // Xử lý đa ngôn ngữ cho nghĩa (nếu item.mean là object)
            const mean = typeof item.mean === 'object' ? (item.mean[language] || item.mean.vi || "") : (item.mean || "");
            if (mean.toLowerCase().includes(term) || normalizeVi(mean).includes(term)) return true;

            if (item.onyomi && item.onyomi.toLowerCase().includes(term)) return true;
            if (item.kunyomi && item.kunyomi.toLowerCase().includes(term)) return true;

            // 2. TRA NGƯỢC (QUAN TRỌNG): Tìm Kanji có trong câu input
            if (searchTerm.includes(item.kanji)) return true;

            return false;
        });
    }, [searchTerm, language]);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
            <Sidebar />

            <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-slate-50/50">
                
                {/* HEADER ĐƠN GIẢN */}
                <div className="px-8 py-6 z-20 bg-white/80 backdrop-blur-md sticky top-0 border-b border-gray-100 shadow-sm shrink-0">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">
                                {t.dictionary_title || "Từ Điển Kanji"}
                            </h1>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <span>{t.dictionary_data_source || "KHO DỮ LIỆU"}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                <span>{dictionaryData.length} {t.dictionary_total_words || "TỪ (512 GỐC)"}</span>
                            </div>
                        </div>
                        
                        {/* THANH TÌM KIẾM ĐƠN GIẢN */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-96 group">
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t.dictionary_search_placeholder || "Tra Kanji, Hán Việt, số thứ tự, hoặc dán cả câu..."}
                                    className="w-full pl-12 pr-10 py-3 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-slate-900 rounded-2xl outline-none transition-all font-medium text-slate-700 placeholder-gray-400 shadow-sm"
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400 group-focus-within:text-slate-900 transition-colors">🔍</span>
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-red-500 hover:text-white text-xs font-bold">✕</button>
                                )}
                            </div>
                            
                            {/* Nút dẫn sang trang Dịch thuật */}
                            <button 
                                onClick={() => navigate('/translator')}
                                className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm group/btn"
                                title={t.dictionary_translator_tooltip || "Chuyển sang Dịch thuật AI"}
                            >
                                <span className="text-xl">🌐</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* GRID KANJI VỚI THANH CUỘN MỚI */}
                <div className="flex-1 overflow-y-auto p-8 pr-4 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        {filteredData.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-20">
                                {filteredData.map((item, index) => {
                                    // Tìm số thứ tự trong danh sách gốc 512 từ
                                    const originalIndex = dictionaryData.findIndex(d => d.kanji === item.kanji) + 1;
                                    
                                    return (
                                        <div 
                                            key={index}
                                            onClick={() => navigate(`/kanji/${item.kanji}`)}
                                            className="bg-white rounded-[1.5rem] p-4 border border-gray-100 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                                        >
                                            {/* Số thứ tự góc trên trái */}
                                            <div className="absolute top-2 left-2 bg-slate-100 text-slate-600 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black group-hover:bg-slate-900 group-hover:text-white transition-colors z-20">
                                                {originalIndex}
                                            </div>
                                            
                                            <div className="relative z-10 w-full">
                                                <span className="text-6xl font-kai text-slate-800 mb-2 block group-hover:scale-110 transition-transform duration-300">
                                                    {item.kanji}
                                                </span>
                                            <div className="mb-2">
                                                <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                    {item.hanviet}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 line-clamp-1 group-hover:text-slate-800">
                                                {/* Hiển thị nghĩa theo ngôn ngữ đã chọn */}
                                                {typeof item.mean === 'object' ? (item.mean[language] || item.mean.vi) : item.mean}
                                            </p>
                                            
                                            {/* Tag báo hiệu nếu Kanji này có trong câu input */}
                                            {searchTerm.includes(item.kanji) && (
                                                <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg z-20">
                                                    ✓ {t.dictionary_found || "Tìm thấy"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 opacity-50">
                                <span className="text-4xl mb-2">🍃</span>
                                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">{t.dictionary_not_found || "Không tìm thấy trong kho 512 từ"}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            
            {/* CSS TÙY CHỈNH THANH CUỘN */}
            <style>{`
                .font-kai { font-family: 'Yuji Syuku', serif; }
                
                /* THANH CUỘN ĐẸP */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px; /* Độ rộng thanh cuộn */
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent; /* Nền track trong suốt */
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1; /* Màu xám nhạt (Slate-300) */
                    border-radius: 20px;       /* Bo tròn 2 đầu */
                    border: 2px solid transparent; /* Tạo khoảng hở viền nếu cần */
                    background-clip: content-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8; /* Hover đậm hơn (Slate-400) */
                }
            `}</style>
        </div>
    );
};

export default DictionaryPage;