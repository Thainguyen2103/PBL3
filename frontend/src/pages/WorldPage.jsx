import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext'; // Import Context
import { supabase } from '../supabaseClient';
import FriendSystem from './FriendSystem';
import ForumTab from '../components/ForumTab'; // Component Diễn Đàn
import MessageSystem from './MessageSystem'; // Component Tin Nhắn

// 1. CẤU HÌNH (Giữ nguyên)
const COUNTRY_MAP = { 'VN': 'Việt Nam', 'JP': '日本', 'KR': '한국', 'CN': '中国', 'US': 'USA', 'GB': 'UK', 'FR': 'France', 'DE': 'Deutschland', 'RU': 'Россия', 'TH': 'ประเทศไทย', 'OT': 'Earth' };
const RANK_TIERS = [
    { limit: 1, title: "THẦN NGỮ CHI VƯƠNG 👑", bg: "bg-yellow-950", text: "text-yellow-200", border: "border-yellow-500", glow: "shadow-yellow-500/50" },
    { limit: 3, title: "THÁNH NGÔN SƯ 🔥", bg: "bg-orange-950", text: "text-orange-200", border: "border-orange-500", glow: "shadow-orange-500/50" },
    { limit: 10, title: "ĐẠI CHIẾN TƯỚNG ⚔️", bg: "bg-slate-900", text: "text-slate-200", border: "border-slate-500", glow: "shadow-blue-500/30" },
    { limit: 20, title: "CAO THỦ VÕ LÂM 🥋", bg: "bg-indigo-900", text: "text-indigo-100", border: "border-indigo-500", glow: "shadow-indigo-500/20" },
    { limit: 50, title: "DŨNG SĨ TINH ANH 🛡️", bg: "bg-purple-900", text: "text-purple-100", border: "border-purple-500", glow: "shadow-purple-500/20" },
    { limit: 100, title: "CHIẾN BINH TẬP SỰ 🗡️", bg: "bg-emerald-800", text: "text-emerald-100", border: "border-emerald-500", glow: "shadow-emerald-500/20" },
    { limit: 9999, title: "NGƯỜI MỚI NHẬP MÔN 🌱", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", glow: "shadow-none" }
];

// 2. COMPONENT LEVEL BADGE
const LevelBadge = ({ level }) => {
    let style = "bg-gray-100 text-gray-500 border-gray-200";
    const l = level ? level.toUpperCase() : "N5";
    if (l === 'N1') style = "bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 shadow-md";
    else if (l === 'N2') style = "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-md";
    else if (l === 'N3') style = "bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-400 shadow-md";
    else if (l === 'N4') style = "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-400";
    return <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${style} inline-block min-w-[50px] text-center`}>{l}</span>;
};

// 🔥 3. COMPONENT LỬA 🔥
const RealFireAura = ({ rank, children }) => {
    if (rank > 3) return <div className="relative">{children}</div>;

    const fireStyle = rank === 1 
        ? { main: '#fbbf24', core: '#fffbeb', base: '#b45309' } // Vàng
        : rank === 2 
        ? { main: '#f97316', core: '#fff7ed', base: '#9a3412' } // Cam
        : { main: '#22d3ee', core: '#ecfeff', base: '#1e3a8a' }; // Xanh

    return (
        <div className="relative flex items-center justify-center p-2 group">
            <div className="absolute inset-0 -top-3 w-[120%] h-[130%] left-[-10%] animate-fire-wave opacity-80 z-0 mix-blend-screen"
                 style={{
                     background: `linear-gradient(to top, ${fireStyle.base}, ${fireStyle.main}, transparent)`,
                     clipPath: 'polygon(50% 0%, 70% 20%, 85% 10%, 95% 40%, 100% 70%, 85% 90%, 50% 100%, 15% 90%, 0% 70%, 5% 40%, 15% 10%, 30% 20%)',
                     filter: 'blur(5px)'
                 }}>
            </div>
            
            <div className="absolute inset-0 -top-2 w-[100%] h-[120%] animate-fire-wave-fast opacity-90 z-0 mix-blend-screen"
                 style={{
                     background: `linear-gradient(to top, ${fireStyle.main}, ${fireStyle.core}, transparent)`,
                     clipPath: 'polygon(50% 0%, 60% 30%, 80% 20%, 90% 50%, 95% 80%, 50% 100%, 5% 80%, 10% 50%, 20% 20%, 40% 30%)',
                     filter: 'blur(2px)'
                 }}>
            </div>

            <div className={`relative z-10 p-[2px] rounded-full bg-white ring-2 ring-white/60 shadow-lg overflow-hidden`}>
                {children}
            </div>
        </div>
    );
};

// 🐉 4. COMPONENT RANK ICON 🐉
const RankBadge = ({ index }) => {
    const rank = index + 1;
    if (rank === 1) return (
        <div className="relative w-24 h-24 flex items-center justify-center -my-6 transition-transform hover:scale-110 drop-shadow-xl">
            <img src="https://cdn-icons-png.flaticon.com/128/2877/2877189.png" alt="Dragon" className="w-full h-full object-contain filter drop-shadow-md" />
            <div className="absolute -bottom-1 w-7 h-7 bg-yellow-600 text-white rounded-full flex items-center justify-center font-black border-2 border-yellow-300 shadow-md text-sm z-20">1</div>
        </div>
    );
    if (rank === 2) return (
        <div className="relative w-20 h-20 flex items-center justify-center -my-5 transition-transform hover:scale-110 drop-shadow-lg">
            <img src="https://cdn-icons-png.flaticon.com/128/16780/16780898.png" alt="Phoenix" className="w-full h-full object-contain filter drop-shadow-md" />
            <div className="absolute -bottom-1 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center font-black border-2 border-orange-300 shadow-md text-xs z-20">2</div>
        </div>
    );
    if (rank === 3) return (
        <div className="relative w-16 h-16 flex items-center justify-center -my-4 transition-transform hover:scale-110 drop-shadow-md">
            <img src="https://cdn-icons-png.flaticon.com/128/13640/13640322.png" alt="Tiger" className="w-full h-full object-contain filter drop-shadow-md" />
            <div className="absolute -bottom-1 w-5 h-5 bg-slate-600 text-white rounded-full flex items-center justify-center font-black border-2 border-slate-300 shadow-md text-[10px] z-20">3</div>
        </div>
    );
    if (rank <= 10) return <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-sm border-b-4 border-slate-600 shadow-md">{rank}</div>;
    return <div className="text-gray-400 font-bold text-sm">#{rank}</div>;
};

// --- MAIN PAGE ---
const WorldPage = () => {
    // ✅ Lấy thêm notifications và setNotifications từ Context
    const { user, notifications, setNotifications } = useAppContext();
    
    const [activeTab, setActiveTab] = useState('ranking'); 
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    const getGenderBadge = (g) => g === 'male' ? <span className="text-blue-500 font-kai ml-1">男</span> : g === 'female' ? <span className="text-pink-500 font-kai ml-1">女</span> : null;
    const getCountryInfo = (c) => ({ name: COUNTRY_MAP[c] || c, flag: c && c !== 'OT' ? `https://flagcdn.com/20x15/${c.toLowerCase()}.png` : null });
    const getRankTierInfo = (idx) => RANK_TIERS.find(t => idx + 1 <= t.limit) || RANK_TIERS[RANK_TIERS.length - 1];
    
    // ✅ Hàm chuyển tab & xóa thông báo khi xem
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        
        // Nếu bấm vào tab Tin nhắn -> Xóa số đỏ tin nhắn
        if (tabName === 'messages') {
            setNotifications(prev => ({ ...prev, message: 0 }));
        }
        // Nếu bấm vào tab Diễn đàn -> Xóa số đỏ diễn đàn
        if (tabName === 'forum') {
            setNotifications(prev => ({ ...prev, forum: 0 }));
        }
    };

    // Xử lý khi bấm vào user trên BXH
    const handleUserClick = (u) => { 
        setSelectedUser(u); 
        setActiveTab('friends'); // Chuyển sang tab Bạn Bè để xem hồ sơ
    };
    
    const handleFriendTabClick = () => { 
        setSelectedUser(null); 
        setActiveTab('friends'); 
    };

    useEffect(() => {
        if (activeTab === 'ranking') {
            const fetchLeaderboard = async () => {
                setLoading(true);
                const { data } = await supabase.from('users')
                    .select('id, full_name, avatar, lessons_completed, kanji_learned, level, gender, country, bio, email, phone, address, birthdate')
                    .order('lessons_completed', { ascending: false })
                    .limit(100);
                setLeaderboard(data || []);
                setLoading(false);
            };
            fetchLeaderboard();
        }
    }, [activeTab]);

    return (
        <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
            <Sidebar />
            <main className="flex-1 h-full flex flex-col bg-slate-50/50 p-6 overflow-hidden relative">
                
                {/* HEADER & MENU TABS */}
                <div className="flex justify-between items-end mb-6 shrink-0 relative z-10 max-w-5xl mx-auto w-full">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2 flex items-center gap-3">
                            Thế Giới Kanji <span className="text-4xl animate-bounce">🌏</span>
                        </h1>
                        <p className="text-gray-500 font-medium text-sm">
                            {activeTab === 'ranking' && "Sảnh Danh Vọng - Vinh danh Chiến Binh!"}
                            {activeTab === 'friends' && "Kết nối bạn bè bốn phương!"}
                            {activeTab === 'messages' && "Trò chuyện & Nhắn tin!"}
                            {activeTab === 'forum' && "Thảo luận & Chia sẻ kiến thức!"}
                        </p>
                    </div>
                    
                    {/* ✅ THANH MENU VỚI BADGE THÔNG BÁO ĐỎ */}
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex gap-1">
                        <button 
                            onClick={() => handleTabChange('ranking')} 
                            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ranking' ? 'bg-slate-900 text-white shadow-md' : 'text-gray-400 hover:text-slate-900'}`}
                        >
                            🏆 BXH
                        </button>
                        <button 
                            onClick={handleFriendTabClick} 
                            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-600'}`}
                        >
                            🤝 Bạn Bè
                        </button>
                        
                        {/* 🆕 NÚT TIN NHẮN + BADGE */}
                        <button 
                            onClick={() => handleTabChange('messages')} 
                            className={`relative px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'messages' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-teal-600'}`}
                        >
                            💬 Tin Nhắn
                            {notifications?.message > 0 && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white animate-bounce shadow-sm">
                                    {notifications.message > 99 ? '99+' : notifications.message}
                                </span>
                            )}
                        </button>

                        {/* 🆕 NÚT DIỄN ĐÀN + BADGE */}
                        <button 
                            onClick={() => handleTabChange('forum')} 
                            className={`relative px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'forum' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-pink-600'}`}
                        >
                            🗨️ Diễn Đàn
                            {notifications?.forum > 0 && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white animate-bounce shadow-sm">
                                    {notifications.forum > 99 ? '99+' : notifications.forum}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 w-full max-w-5xl mx-auto">
                    
                    {/* --- TAB 1: BẢNG XẾP HẠNG --- */}
                    {activeTab === 'ranking' && (
                        loading ? <div className="flex justify-center h-64 items-center text-gray-400 font-bold animate-pulse">⏳ Đang tải...</div> : (
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                                            <th className="py-4 pl-8 w-28 text-center">Hạng</th>
                                            <th className="py-4 pl-4">Chiến binh</th>
                                            <th className="py-4 text-center w-36">Trình độ</th>
                                            <th className="py-4 text-center w-32">Sức mạnh</th>
                                            <th className="py-4 text-right pr-8 w-32">Thành tựu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {leaderboard.length > 0 ? leaderboard.map((u, idx) => {
                                            const isMe = user && u.id === user.id;
                                            const displayAvatar = u.avatar || `https://ui-avatars.com/api/?name=${u.full_name}&background=random&color=fff`;
                                            const tierInfo = getRankTierInfo(idx);
                                            const countryInfo = getCountryInfo(u.country);

                                            return (
                                                <tr key={u.id} onClick={() => handleUserClick(u)} className={`group transition-all border-b border-gray-50 last:border-0 cursor-pointer ${isMe ? 'bg-indigo-50/60 hover:bg-indigo-100' : 'hover:bg-gray-50'} relative z-10`}>
                                                    <td className="py-4 pl-8"><div className="flex justify-center items-center"><RankBadge index={idx} /></div></td>
                                                    <td className="py-4 pl-4">
                                                        <div className="flex items-center gap-6">
                                                            <RealFireAura rank={idx + 1}>
                                                                <div className={`w-12 h-12 rounded-full overflow-hidden border-[2px] shadow-sm group-hover:scale-105 transition-transform ${idx === 0 ? 'border-yellow-200' : 'border-gray-100'}`}>
                                                                    <img src={displayAvatar} alt="" className="w-full h-full object-cover" />
                                                                </div>
                                                            </RealFireAura>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`font-black text-sm truncate max-w-[180px] ${isMe ? 'text-indigo-900' : 'text-slate-800'}`}>{u.full_name || "Vô danh"}</p>
                                                                    {getGenderBadge(u.gender)}
                                                                    {isMe && <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">YOU</span>}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    <div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                                        {countryInfo.flag ? <img src={countryInfo.flag} alt="" className="w-3.5 rounded-[2px]" /> : <span>🌍</span>}
                                                                        <span className="text-[9px] font-bold text-gray-600 uppercase">{countryInfo.name}</span>
                                                                    </div>
                                                                    <div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wide shadow-sm ${tierInfo.bg} ${tierInfo.text} ${tierInfo.border} ${tierInfo.glow}`}>{tierInfo.title}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-center"><LevelBadge level={u.level} /></td>
                                                    <td className="py-4 text-center"><div className="inline-flex flex-col items-center"><span className={`font-black text-lg ${idx < 3 ? 'text-yellow-600' : 'text-slate-700'}`}>{u.kanji_learned || 0}</span><span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 rounded-full mt-0.5">Kanji</span></div></td>
                                                    <td className="py-4 text-right pr-8"><div className={`inline-block px-4 py-2 rounded-xl font-black text-xs shadow-md transition-transform group-hover:scale-105 ${idx === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white' : 'bg-slate-900 text-white'}`}>{u.lessons_completed || 0} <span className="opacity-70 ml-0.5">BÀI</span></div></td>
                                                </tr>
                                            );
                                        }) : <tr><td colSpan="5" className="py-20 text-center text-gray-400 font-medium">Chưa có dữ liệu chiến binh.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* --- TAB 2: BẠN BÈ --- */}
                    {activeTab === 'friends' && (
                        <FriendSystem 
                            user={user} 
                            initialSelectedUser={selectedUser} 
                            onBackToRank={selectedUser ? () => {
                                setSelectedUser(null);
                                setActiveTab('ranking'); 
                            } : null} 
                        />
                    )}

                    {/* --- TAB 3: TIN NHẮN (MỚI) --- */}
                    {activeTab === 'messages' && (
                        <MessageSystem user={user} />
                    )}

                    {/* --- TAB 4: DIỄN ĐÀN --- */}
                    {activeTab === 'forum' && (
                        <ForumTab 
                            user={user} 
                            onUserClick={handleUserClick} 
                        />
                    )}
                </div>
            </main>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                .font-kai { font-family: 'Yuji Syuku', serif; }
                @keyframes fire-wave {
                    0% { transform: translateY(0) scaleX(1) rotate(0deg); opacity: 0.8; }
                    25% { transform: translateY(-5px) scaleX(1.05) rotate(1deg); }
                    50% { transform: translateY(-10px) scaleX(0.95) rotate(-1deg); opacity: 0.6; }
                    75% { transform: translateY(-5px) scaleX(1.02) rotate(0.5deg); }
                    100% { transform: translateY(0) scaleX(1) rotate(0deg); opacity: 0.8; }
                }
                .animate-fire-wave { animation: fire-wave 2s ease-in-out infinite; }
                .animate-fire-wave-fast { animation: fire-wave 1.2s ease-in-out infinite reverse; }
            `}</style>
        </div>
    );
};

export default WorldPage;