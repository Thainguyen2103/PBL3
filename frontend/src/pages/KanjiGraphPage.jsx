import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import KanjiGraphWrapper from '../components/KanjiInteractiveGraph';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext'; 

const KanjiGraphPage = () => {
    const { kanji } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // Lấy location để kiểm tra xem có state truyền tới không (nếu cần mở rộng sau này)
    const { t } = useAppContext(); 

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [kanji]);

    // --- XỬ LÝ QUAY LẠI ---
    const handleBack = () => {
        // 🔥 QUAN TRỌNG: Dùng -1 để quay lại đúng trang Detail trước đó.
        // Điều này giúp "hủy" bước đi sang Graph, đưa lịch sử về trạng thái cũ.
        // Khi về Detail, nút Back ở Detail sẽ hoạt động đúng như logic ta đã viết (về Flashcard/Dictionary).
        navigate(-1);
        
        // Nếu bạn muốn an toàn hơn (trường hợp user vào thẳng link Graph):
        // if (window.history.length > 1) navigate(-1);
        // else navigate(`/kanji/${kanji}`); 
    };

    return (
        <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
            <Sidebar />

            <main className="flex-1 relative h-full flex flex-col bg-slate-50">
                
                {/* HEADER */}
                <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-white z-20 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleBack} // Sử dụng hàm handleBack mới
                            className="w-10 h-10 bg-gray-100 hover:bg-slate-900 hover:text-white rounded-xl flex items-center justify-center transition-all font-bold group"
                        >
                            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                        </button>
                        
                        {/* TIÊU ĐỀ ĐA NGÔN NGỮ */}
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-sm font-black text-slate-500 uppercase tracking-widest">
                                {t?.graph_title || "Mạng lưới liên kết"}: 
                            </h1>
                            {/* Font Kanji DFKai-SB */}
                            <span className="text-3xl font-kai text-slate-900 leading-none transform translate-y-0.5">
                                {kanji}
                            </span>
                        </div>
                    </div>

                    {/* HƯỚNG DẪN ĐA NGÔN NGỮ */}
                    <div className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                        {t?.graph_instruction || "🖱️ Kéo thả node • 📜 Lăn chuột Zoom"}
                    </div>
                </div>

                {/* VÙNG CHỨA SƠ ĐỒ (FULL MÀN HÌNH) */}
                <div className="flex-1 relative w-full h-full overflow-hidden">
                    <KanjiGraphWrapper 
                        rootChar={kanji}
                        // Khi bấm vào một node con trong sơ đồ, ta vẫn dùng navigate thường
                        // Nhưng nhớ truyền tiếp state (nếu có) để giữ mạch "đường về nhà"
                        onNavigate={(char) => navigate(`/kanji-graph/${char}`, { state: location.state })}
                    />
                </div>

            </main>
        </div>
    );
};

export default KanjiGraphPage;