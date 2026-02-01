import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext'; 
import { supabase } from '../supabaseClient';
import FriendSystem from './FriendSystem';
import ForumTab from '../components/ForumTab'; 
import MessageSystem from './MessageSystem'; 
import { translations } from '../utils/translations'; // ✅ Import translations

// --- CẤU HÌNH ---
const COUNTRY_MAP = { 'VN': 'Việt Nam', 'JP': '日本', 'KR': '한국', 'CN': '中国', 'US': 'USA', 'GB': 'UK', 'FR': 'France', 'DE': 'Deutschland', 'RU': 'Россия', 'TH': 'ประเทศไทย', 'OT': 'Earth' };
const RANK_TIERS = [
    { limit: 1, titleKey: "world_rank_1", bg: "bg-yellow-950", text: "text-yellow-200", border: "border-yellow-500", glow: "shadow-yellow-500/50" },
    { limit: 3, titleKey: "world_rank_2", bg: "bg-orange-950", text: "text-orange-200", border: "border-orange-500", glow: "shadow-orange-500/50" },
    { limit: 10, titleKey: "world_rank_3", bg: "bg-slate-900", text: "text-slate-200", border: "border-slate-500", glow: "shadow-blue-500/30" },
    { limit: 20, titleKey: "world_rank_4", bg: "bg-indigo-900", text: "text-indigo-100", border: "border-indigo-500", glow: "shadow-indigo-500/20" },
    { limit: 50, titleKey: "world_rank_5", bg: "bg-purple-900", text: "text-purple-100", border: "border-purple-500", glow: "shadow-purple-500/20" },
    { limit: 100, titleKey: "world_rank_6", bg: "bg-emerald-800", text: "text-emerald-100", border: "border-emerald-500", glow: "shadow-emerald-500/20" },
    { limit: 9999, titleKey: "world_rank_7", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", glow: "shadow-none" }
];

// --- BỘ ICON SVG ---
const Icons = {
    Ranking: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    ),
    Friends: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    Message: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    Forum: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    )
};

// --- COMPONENTS CON ---
const LevelBadge = ({ level }) => {
    let style = "bg-gray-100 text-gray-500 border-gray-200";
    const l = level ? level.toUpperCase() : "N5";
    if (l === 'N1') style = "bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-400 shadow-md";
    else if (l === 'N2') style = "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-md";
    else if (l === 'N3') style = "bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-400 shadow-md";
    else if (l === 'N4') style = "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-400";
    return <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${style} inline-block min-w-[50px] text-center`}>{l}</span>;
};

const RealFireAura = ({ rank, children }) => {
    if (rank > 3) return <div className="relative">{children}</div>;
    const fireStyle = rank === 1 ? { main: '#fbbf24', core: '#fffbeb', base: '#b45309' } : rank === 2 ? { main: '#f97316', core: '#fff7ed', base: '#9a3412' } : { main: '#22d3ee', core: '#ecfeff', base: '#1e3a8a' }; 
    return (
        <div className="relative flex items-center justify-center p-2 group">
            <div className="absolute inset-0 -top-3 w-[120%] h-[130%] left-[-10%] animate-fire-wave opacity-80 z-0 mix-blend-screen" style={{ background: `linear-gradient(to top, ${fireStyle.base}, ${fireStyle.main}, transparent)`, clipPath: 'polygon(50% 0%, 70% 20%, 85% 10%, 95% 40%, 100% 70%, 85% 90%, 50% 100%, 15% 90%, 0% 70%, 5% 40%, 15% 10%, 30% 20%)', filter: 'blur(5px)' }}></div>
            <div className="absolute inset-0 -top-2 w-[100%] h-[120%] animate-fire-wave-fast opacity-90 z-0 mix-blend-screen" style={{ background: `linear-gradient(to top, ${fireStyle.main}, ${fireStyle.core}, transparent)`, clipPath: 'polygon(50% 0%, 60% 30%, 80% 20%, 90% 50%, 95% 80%, 50% 100%, 5% 80%, 10% 50%, 20% 20%, 40% 30%)', filter: 'blur(2px)' }}></div>
            <div className={`relative z-10 p-[2px] rounded-full bg-white ring-2 ring-white/60 shadow-lg overflow-hidden`}>{children}</div>
        </div>
    );
};

const RankBadge = ({ index }) => {
    const rank = index + 1;
    if (rank === 1) return <div className="relative w-24 h-24 flex items-center justify-center -my-6 hover:scale-110 transition-transform"><img src="https://cdn-icons-png.flaticon.com/128/2877/2877189.png" className="w-full h-full object-contain filter drop-shadow-md" alt=""/><div className="absolute -bottom-1 w-7 h-7 bg-yellow-600 text-white rounded-full flex items-center justify-center font-black border-2 border-yellow-300 shadow-md text-sm z-20">1</div></div>;
    if (rank === 2) return <div className="relative w-20 h-20 flex items-center justify-center -my-5 hover:scale-110 transition-transform"><img src="https://cdn-icons-png.flaticon.com/128/16780/16780898.png" className="w-full h-full object-contain filter drop-shadow-md" alt=""/><div className="absolute -bottom-1 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center font-black border-2 border-orange-300 shadow-md text-xs z-20">2</div></div>;
    if (rank === 3) return <div className="relative w-16 h-16 flex items-center justify-center -my-4 hover:scale-110 transition-transform"><img src="https://cdn-icons-png.flaticon.com/128/13640/13640322.png" className="w-full h-full object-contain filter drop-shadow-md" alt=""/><div className="absolute -bottom-1 w-5 h-5 bg-slate-600 text-white rounded-full flex items-center justify-center font-black border-2 border-slate-300 shadow-md text-[10px] z-20">3</div></div>;
    return <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-black text-sm border-b-4 border-slate-600 shadow-md">{rank}</div>;
};

// --- MAIN PAGE ---
const WorldPage = () => {
    const { user, notifications, setNotifications, language } = useAppContext(); 
    const t = translations[language] || translations.vi;

    // --- HỆ THỐNG RANK ARENA (Inside component to access translations) ---
    const RANK_SYSTEM = [
        { threshold: 200, key: 'CHALLENGER', name: t.arena_rank_challenger, img: 'https://cdn-icons-png.flaticon.com/128/14235/14235832.png', color: 'text-red-600', bg: 'bg-red-100 border-red-200', ring: 'border-red-500' },
        { threshold: 150, key: 'GRANDMASTER', name: t.arena_rank_grandmaster, img: 'https://cdn-icons-png.flaticon.com/128/17301/17301398.png', color: 'text-rose-600', bg: 'bg-rose-100 border-rose-200', ring: 'border-rose-500' },
        { threshold: 100, key: 'MASTER', name: t.arena_rank_master, img: 'https://cdn-icons-png.flaticon.com/128/18541/18541426.png', color: 'text-purple-600', bg: 'bg-purple-100 border-purple-200', ring: 'border-purple-400' },
        { threshold: 50, key: 'DIAMOND', name: t.arena_rank_diamond, img: 'https://cdn-icons-png.flaticon.com/128/16847/16847167.png', color: 'text-blue-500', bg: 'bg-blue-100 border-blue-200', ring: 'border-blue-400' },
        { threshold: 30, key: 'GOLD', name: t.arena_rank_gold, img: 'https://cdn-icons-png.flaticon.com/128/15304/15304293.png', color: 'text-yellow-600', bg: 'bg-yellow-100 border-yellow-200', ring: 'border-yellow-400' },
        { threshold: 10, key: 'SILVER', name: t.arena_rank_silver, img: 'https://cdn-icons-png.flaticon.com/128/12927/12927321.png', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200', ring: 'border-slate-400' },
        { threshold: 0, key: 'BRONZE', name: t.arena_rank_bronze, img: 'https://cdn-icons-png.flaticon.com/128/12927/12927172.png', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200', ring: 'border-orange-400' }
    ];

    const [activeTab, setActiveTab] = useState('ranking'); 
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    const getGenderBadge = (g) => g === 'male' ? <span className="text-blue-500 font-kai ml-1">男</span> : g === 'female' ? <span className="text-pink-500 font-kai ml-1">女</span> : null;
    const getCountryInfo = (c) => ({ name: COUNTRY_MAP[c] || c, flag: c && c !== 'OT' ? `https://flagcdn.com/20x15/${c.toLowerCase()}.png` : null });
    const getRankTierInfo = (idx) => RANK_TIERS.find(t => idx + 1 <= t.limit) || RANK_TIERS[RANK_TIERS.length - 1];
    const getRankFromPoints = (points) => RANK_SYSTEM.find(r => (points || 0) >= r.threshold) || RANK_SYSTEM[RANK_SYSTEM.length - 1];
    
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        if (tabName === 'messages') setNotifications(prev => ({ ...prev, message: 0 }));
        if (tabName === 'forum') setNotifications(prev => ({ ...prev, forum: 0 }));
    };

    // Khi bấm vào 1 user, chuyển sang tab FriendSystem nhưng kèm selectedUser
    const handleUserClick = (u) => { 
        setSelectedUser(u); 
        setActiveTab('friends'); 
    };
    
    // Khi bấm tab Bạn bè bình thường
    const handleFriendTabClick = () => { 
        setSelectedUser(null); 
        setActiveTab('friends'); 
    };

    // --- FETCH DATA ---
    useEffect(() => {
        if (activeTab === 'ranking') {
            const fetchLeaderboard = async () => {
                setLoading(true);
                const { data: users } = await supabase.from('users').select('id, full_name, avatar, lessons_completed, kanji_learned, level, gender, country, bio, rank_points').limit(200);
                if (users) {
                    const userIds = users.map(u => u.id);
                    const { data: scores } = await supabase.from('challenge_progress').select('user_id, score').in('user_id', userIds);
                    const scoreMap = {};
                    if (scores) scores.forEach(item => { if (!scoreMap[item.user_id]) scoreMap[item.user_id] = 0; scoreMap[item.user_id] += item.score; });
                    const mergedData = users.map(u => {
                        const challengeScore = scoreMap[u.id] || 0;
                        const rankPoints = u.rank_points || 0;
                        const lessonsCompleted = u.lessons_completed || 0;
                        const kanjiLearned = u.kanji_learned || 0;
                        
                        // Tính điểm toàn diện (trọng số: rank 40%, challenge 30%, lessons 20%, kanji 10%)
                        const comprehensiveScore = (rankPoints * 0.4) + (challengeScore * 0.3) + (lessonsCompleted * 20 * 0.2) + (kanjiLearned * 0.1);
                        
                        return { 
                            ...u, 
                            total_challenge_score: challengeScore,
                            comprehensive_score: comprehensiveScore
                        };
                    });
                    mergedData.sort((a, b) => b.comprehensive_score - a.comprehensive_score);
                    setLeaderboard(mergedData.slice(0, 100));
                }
                setLoading(false);
            };
            fetchLeaderboard();
        }
    }, [activeTab]);

    // --- REALTIME NOTIFICATIONS ---
    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('forum_final_tracker')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                if (String(payload.new.user_id) !== String(user.id)) setNotifications(prev => ({ ...prev, forum: (prev.forum || 0) + 1 }));
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
                const newComment = payload.new;
                if (String(newComment.user_id) === String(user.id)) return;
                const { data: post } = await supabase.from('posts').select('user_id').eq('id', newComment.post_id).single();
                if (post && String(post.user_id) === String(user.id)) setNotifications(prev => ({ ...prev, forum: (prev.forum || 0) + 1 }));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
                const newPost = payload.new;
                const oldPost = payload.old;
                if (String(newPost.user_id) === String(user.id)) {
                    const oldLikes = JSON.stringify(oldPost.likes || []);
                    const newLikes = JSON.stringify(newPost.likes || []);
                    if (oldLikes !== newLikes) setNotifications(prev => ({ ...prev, forum: (prev.forum || 0) + 1 }));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, setNotifications]);

    return (
        <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
            <Sidebar />
            <main className="flex-1 h-full flex flex-col bg-slate-50/50 relative overflow-hidden">
                
                {/* --- HEADER CHẤT MẠNG XÃ HỘI --- */}
                <div className="pt-8 px-8 pb-4 shrink-0 relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-200/50 bg-white/80 backdrop-blur-md sticky top-0 rounded-b-[2rem] shadow-sm mb-4">
                    
                    {/* 1. Tiêu đề (Left) */}
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            {t.world_title} <span className="text-4xl animate-bounce">🌏</span>
                        </h1>
                        <p className="text-gray-500 font-bold text-sm mt-1 uppercase tracking-widest pl-1">{t.world_slogan}</p>
                    </div>

                    {/* 2. Menu Tabs (Right) */}
                    <div className="flex bg-gray-100/80 p-1.5 rounded-2xl shadow-inner gap-2">
                        {/* TAB 1: Bảng Xếp Hạng */}
                        <button 
                            onClick={() => handleTabChange('ranking')}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative group
                            ${activeTab === 'ranking' 
                                ? 'bg-white text-slate-900 shadow-md ring-1 ring-black/5 scale-[1.03]' 
                                : 'text-gray-400 hover:text-slate-700 hover:bg-white/50'
                            }`}
                        >
                            <span className={`text-xl ${activeTab === 'ranking' ? 'text-yellow-500' : 'text-gray-400 group-hover:text-yellow-500'}`}><Icons.Ranking /></span>
                            <span>{t.world_tab_ranking}</span>
                        </button>

                        {/* TAB 2: Bạn Bè */}
                        <button 
                            onClick={handleFriendTabClick}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative group
                            ${activeTab === 'friends' 
                                ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5 scale-[1.03]' 
                                : 'text-gray-400 hover:text-indigo-600 hover:bg-white/50'
                            }`}
                        >
                            <span className={`text-xl ${activeTab === 'friends' ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'}`}><Icons.Friends /></span>
                            <span>{t.world_tab_friends}</span>
                        </button>

                        {/* TAB 3: Tin Nhắn */}
                        <button 
                            onClick={() => handleTabChange('messages')}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative group
                            ${activeTab === 'messages' 
                                ? 'bg-white text-teal-600 shadow-md ring-1 ring-black/5 scale-[1.03]' 
                                : 'text-gray-400 hover:text-teal-600 hover:bg-white/50'
                            }`}
                        >
                            <div className="relative">
                                <span className={`text-xl block ${activeTab === 'messages' ? 'text-teal-500' : 'text-gray-400 group-hover:text-teal-500'}`}><Icons.Message /></span>
                                {notifications?.message > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border border-white animate-bounce shadow-sm">{notifications.message > 99 ? '!' : notifications.message}</span>}
                            </div>
                            <span>{t.world_tab_messages}</span>
                        </button>

                        {/* TAB 4: Diễn Đàn */}
                        <button 
                            onClick={() => handleTabChange('forum')}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative group
                            ${activeTab === 'forum' 
                                ? 'bg-white text-pink-600 shadow-md ring-1 ring-black/5 scale-[1.03]' 
                                : 'text-gray-400 hover:text-pink-600 hover:bg-white/50'
                            }`}
                        >
                            <div className="relative">
                                <span className={`text-xl block ${activeTab === 'forum' ? 'text-pink-500' : 'text-gray-400 group-hover:text-pink-500'}`}><Icons.Forum /></span>
                                {notifications?.forum > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border border-white animate-bounce shadow-sm">{notifications.forum > 99 ? '!' : notifications.forum}</span>}
                            </div>
                            <span>{t.world_tab_forum}</span>
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 w-full max-w-6xl mx-auto pb-10 px-6">
                    {activeTab === 'ranking' && (
                        loading ? <div className="flex justify-center h-64 items-center text-gray-400 font-bold animate-pulse">⏳ {t.loading_data}</div> : (
                            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                                            <th className="py-4 pl-8 w-28 text-center">{t.world_table_rank}</th>
                                            <th className="py-4 pl-4">{t.world_table_player}</th>
                                            <th className="py-4 text-center w-32">{t.world_table_arena_rank}</th>
                                            <th className="py-4 text-center w-36">{t.world_table_level}</th>
                                            <th className="py-4 text-center w-32">{t.world_table_power}</th>
                                            <th className="py-4 text-center w-36 text-red-600">{t.world_table_score}</th>
                                            <th className="py-4 text-right pr-8 w-32">{t.world_table_achieve}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {leaderboard.length > 0 ? leaderboard.map((u, idx) => {
                                            const isMe = user && u.id === user.id;
                                            const displayAvatar = u.avatar || `https://ui-avatars.com/api/?name=${u.full_name}&background=random&color=fff`;
                                            const tierInfo = getRankTierInfo(idx);
                                            const countryInfo = getCountryInfo(u.country);
                                            const tierTitle = t[tierInfo.titleKey] || tierInfo.titleKey; 
                                            return (
                                                <tr key={u.id} onClick={() => handleUserClick(u)} className={`group transition-all border-b border-gray-50 last:border-0 cursor-pointer ${isMe ? 'bg-indigo-50/60 hover:bg-indigo-100' : 'hover:bg-gray-50'} relative z-10`}>
                                                    <td className="py-4 pl-8"><div className="flex justify-center items-center"><RankBadge index={idx} /></div></td>
                                                    <td className="py-4 pl-4"><div className="flex items-center gap-6"><RealFireAura rank={idx + 1}><div className={`w-12 h-12 rounded-full overflow-hidden border-[2px] shadow-sm group-hover:scale-105 transition-transform ${idx === 0 ? 'border-yellow-200' : 'border-gray-100'}`}><img src={displayAvatar} alt="avatar" className="w-full h-full object-cover" /></div></RealFireAura><div><div className="flex items-center gap-2"><p className={`font-black text-sm truncate max-w-[180px] ${isMe ? 'text-indigo-900' : 'text-slate-800'}`}>{u.full_name || t.world_unknown}</p>{getGenderBadge(u.gender)}{isMe && <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded shadow-sm">{t.world_you}</span>}</div><div className="flex items-center gap-2 mt-1.5"><div className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{countryInfo.flag ? <img src={countryInfo.flag} alt="flag" className="w-3.5 rounded-[2px]" /> : <span>🌍</span>}<span className="text-[9px] font-bold text-gray-600 uppercase">{countryInfo.name}</span></div><div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wide shadow-sm ${tierInfo.bg} ${tierInfo.text} ${tierInfo.border} ${tierInfo.glow}`}>{tierTitle}</div></div></div></div></td>
                                                    <td className="py-4 text-center"><div className="flex items-center justify-center gap-2"><img src={getRankFromPoints(u.rank_points).img} alt="rank" className="w-8 h-8 object-contain" /><div className="flex flex-col items-start"><span className="text-[10px] font-black text-slate-700">{getRankFromPoints(u.rank_points).name}</span><span className="text-[8px] font-medium text-slate-400">{u.rank_points || 0} {t.world_stat_pts}</span></div></div></td>
                                                    <td className="py-4 text-center"><LevelBadge level={u.level} /></td>
                                                    <td className="py-4 text-center"><div className="inline-flex flex-col items-center"><span className={`font-black text-lg ${idx < 3 ? 'text-yellow-600' : 'text-slate-700'}`}>{u.kanji_learned || 0}</span><span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 rounded-full mt-0.5">{t.world_stat_kanji}</span></div></td>
                                                    <td className="py-4 text-center"><div className="inline-flex flex-col items-center bg-red-50 border border-red-100 px-3 py-1 rounded-lg shadow-sm"><span className="font-black text-red-600 text-lg">{u.total_challenge_score ? u.total_challenge_score.toLocaleString() : 0}</span><span className="text-[8px] font-bold text-red-300 uppercase tracking-widest">{t.world_points}</span></div></td>
                                                    <td className="py-4 text-right pr-8"><div className={`inline-block px-4 py-2 rounded-xl font-black text-xs shadow-md transition-transform group-hover:scale-105 ${idx === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white' : 'bg-slate-900 text-white'}`}>{u.lessons_completed || 0} <span className="opacity-70 ml-0.5">{t.world_lessons}</span></div></td>
                                                </tr>
                                            );
                                        }) : <tr><td colSpan="7" className="py-20 text-center text-gray-400 font-medium">{t.world_no_data}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* ✅ FIX LỖI: Sửa onBackToRank để chỉ reset selectedUser, không set tab về ranking */}
                    {activeTab === 'friends' && (
                        <FriendSystem 
                            user={user} 
                            initialSelectedUser={selectedUser} 
                            onBackToRank={() => setSelectedUser(null)} 
                        />
                    )}
                    
                    {activeTab === 'messages' && <MessageSystem user={user} />}
                    {activeTab === 'forum' && <ForumTab user={user} onUserClick={handleUserClick} />}
                </div>
            </main>
            <style>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; } .font-kai { font-family: 'Yuji Syuku', serif; } @keyframes fire-wave { 0% { transform: translateY(0) scaleX(1) rotate(0deg); opacity: 0.8; } 25% { transform: translateY(-5px) scaleX(1.05) rotate(1deg); } 50% { transform: translateY(-10px) scaleX(0.95) rotate(-1deg); opacity: 0.6; } 75% { transform: translateY(-5px) scaleX(1.02) rotate(0.5deg); } 100% { transform: translateY(0) scaleX(1) rotate(0deg); opacity: 0.8; } } .animate-fire-wave { animation: fire-wave 2s ease-in-out infinite; } .animate-fire-wave-fast { animation: fire-wave 1.2s ease-in-out infinite reverse; } `}</style>
        </div>
    );
};

export default WorldPage;