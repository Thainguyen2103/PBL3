import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { translations } from '../utils/translations';

// === SVG DECORATIONS ===
const GameControllerIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <rect x="2" y="6" width="20" height="12" rx="3" fill="url(#grad_ctrl)" />
        <path d="M6 12H8M7 11V13" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14.5" cy="11" r="1" fill="#Facc15" />
        <circle cx="16.5" cy="13" r="1" fill="#4ade80" />
        <circle cx="14.5" cy="13" r="1" fill="#3b82f6" />
        <circle cx="16.5" cy="11" r="1" fill="#ef4444" />
        <defs>
            <linearGradient id="grad_ctrl" x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a855f7" />
                <stop offset="1" stopColor="#7e22ce" />
            </linearGradient>
        </defs>
    </svg>
);

const DPadDeco = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <path d="M35 15H65V35H85V65H65V85H35V65H15V35H35V15Z" rx="5" />
        <circle cx="50" cy="50" r="15" className="text-slate-100" />
    </svg>
);

const ButtonsDeco = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
        <circle cx="50" cy="20" r="18" />
        <circle cx="80" cy="50" r="18" />
        <circle cx="50" cy="80" r="18" />
        <circle cx="20" cy="50" r="18" />
    </svg>
);

// === STYLES ===
const styles = `
    @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
    
    .bg-white-pattern { 
        background-color: #fcfcfc; 
        background-image: radial-gradient(#e5e7eb 1.5px, transparent 1.5px); 
        background-size: 24px 24px; 
    }
    
    .glass-card { 
        background: rgba(255, 255, 255, 0.95); 
        backdrop-filter: blur(12px); 
        border: 2px solid white; 
        box-shadow: 0 20px 40px -5px rgba(0,0,0,0.05); 
    }
    
    .animate-ripple { 
        position: absolute; 
        border-radius: 50%; 
        border: 4px solid #3b82f6; 
        opacity: 0; 
        animation: ripple 1.5s infinite ease-out; 
    }
    
    @keyframes ripple { 
        0% { transform: scale(0.8); opacity: 1; border-width: 6px; } 
        100% { transform: scale(2.2); opacity: 0; border-width: 0px; } 
    }
    
    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
    .animate-float { animation: float 3s ease-in-out infinite; }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
`;

// === RANK SYSTEM ===
const getRankSystem = (t) => [
    { threshold: 200, key: 'CHALLENGER', name: t.arena_rank_challenger || 'Thách đấu', img: 'https://cdn-icons-png.flaticon.com/128/14235/14235832.png', color: 'text-red-600', bg: 'bg-red-100 border-red-200' },
    { threshold: 150, key: 'GRANDMASTER', name: t.arena_rank_grandmaster || 'Đại cao thủ', img: 'https://cdn-icons-png.flaticon.com/128/17301/17301398.png', color: 'text-rose-600', bg: 'bg-rose-100 border-rose-200' },
    { threshold: 100, key: 'MASTER', name: t.arena_rank_master || 'Cao thủ', img: 'https://cdn-icons-png.flaticon.com/128/18541/18541426.png', color: 'text-purple-600', bg: 'bg-purple-100 border-purple-200' },
    { threshold: 50, key: 'DIAMOND', name: t.arena_rank_diamond || 'Kim cương', img: 'https://cdn-icons-png.flaticon.com/128/16847/16847167.png', color: 'text-blue-500', bg: 'bg-blue-100 border-blue-200' },
    { threshold: 30, key: 'GOLD', name: t.arena_rank_gold || 'Vàng', img: 'https://cdn-icons-png.flaticon.com/128/15304/15304293.png', color: 'text-yellow-600', bg: 'bg-yellow-100 border-yellow-200' },
    { threshold: 10, key: 'SILVER', name: t.arena_rank_silver || 'Bạc', img: 'https://cdn-icons-png.flaticon.com/128/12927/12927321.png', color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
    { threshold: 0, key: 'BRONZE', name: t.arena_rank_bronze || 'Đồng', img: 'https://cdn-icons-png.flaticon.com/128/12927/12927172.png', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' }
];

// === MATCHMAKING STATES ===
const STATES = {
    IDLE: 'IDLE',
    FINDING: 'FINDING',
    READY_CHECK: 'READY_CHECK',
    MATCHED: 'MATCHED'
};

const ArenaLobbyPage = () => {
    const { user, language } = useAppContext();
    const navigate = useNavigate();
    const t = translations[language] || translations.vi;
    
    const RANK_SYSTEM = getRankSystem(t);
    
    // === STATE ===
    const [realPoints, setRealPoints] = useState(0);
    const [status, setStatus] = useState(STATES.IDLE);
    const [desiredPlayers, setDesiredPlayers] = useState(2);
    const [foundPlayers, setFoundPlayers] = useState([]);
    const [readyPlayers, setReadyPlayers] = useState([]);
    const [countdown, setCountdown] = useState(15);
    const [selectedLesson, setSelectedLesson] = useState(null);
    
    // === REFS ===
    const channelRef = useRef(null);
    const roomIdRef = useRef(null);
    const countdownRef = useRef(null);
    const statusRef = useRef(status); // Track status để tránh stale closure
    
    // Sync status với ref
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // === LOAD RANK POINTS ===
    useEffect(() => {
        const fetchPoints = async () => {
            if (!user?.id) return;
            const { data } = await supabase.from('users').select('rank_points').eq('id', user.id).single();
            if (data) setRealPoints(data.rank_points || 0);
        };
        fetchPoints();
    }, [user?.id]);

    const currentRankObj = RANK_SYSTEM.find(r => realPoints >= r.threshold) || RANK_SYSTEM[RANK_SYSTEM.length - 1];

    // === CLEANUP ON UNMOUNT ===
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);

    // === START FINDING ===
    const startFinding = async () => {
        if (!selectedLesson) {
            alert('Vui lòng chọn bài học trước!');
            return;
        }
        
        setStatus(STATES.FINDING);
        const myPlayerData = {
            id: user.id,
            full_name: user.full_name,
            avatar: user.avatar,
            rankName: currentRankObj.name,
            rankIcon: currentRankObj.img,
            rankColor: currentRankObj.color
        };
        setFoundPlayers([myPlayerData]);

        // 🔥 QUAN TRỌNG: Tất cả người chơi cùng bài học + số người sẽ join CÙNG 1 channel
        const queueChannelName = `matchmaking_lesson_${selectedLesson}_mode_${desiredPlayers}`;
        console.log('🔍 Joining queue channel:', queueChannelName);
        
        roomIdRef.current = queueChannelName;

        // Create realtime channel for matchmaking - SHARED channel
        const channel = supabase.channel(queueChannelName, {
            config: { presence: { key: user.id } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const allPlayers = Object.values(state).flat().map(p => p.playerData).filter(Boolean);
                console.log('👥 Players in queue:', allPlayers.length, allPlayers.map(p => p.full_name));
                setFoundPlayers(allPlayers);
                
                // Check if enough players - TẤT CẢ cùng chuyển sang ready check
                if (allPlayers.length >= desiredPlayers) {
                    // Sắp xếp để đảm bảo thứ tự nhất quán
                    const sortedPlayers = [...allPlayers].sort((a, b) => String(a.id).localeCompare(String(b.id)));
                    // Lấy đúng số người cần thiết
                    const matchPlayers = sortedPlayers.slice(0, desiredPlayers);
                    
                    // Kiểm tra xem mình có trong danh sách không
                    const isInMatch = matchPlayers.some(p => String(p.id) === String(user.id));
                    
                    if (isInMatch) {
                        // Tạo matchId nhất quán dựa trên danh sách player IDs
                        const playerIds = matchPlayers.map(p => String(p.id)).sort().join('_');
                        const matchId = `match_${playerIds.substring(0, 20)}`;
                        
                        console.log('🎮 Enough players! Starting ready check...', matchId);
                        startReadyCheck(matchPlayers, matchId);
                    }
                }
            })
            .on('presence', { event: 'join' }, ({ newPresences }) => {
                console.log('✅ Player joined queue:', newPresences);
            })
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('❌ Player left queue:', leftPresences);
            })
            .on('broadcast', { event: 'READY' }, ({ payload }) => {
                console.log('✋ Player ready:', payload.playerId);
                setReadyPlayers(prev => {
                    if (!prev.includes(payload.playerId)) {
                        return [...prev, payload.playerId];
                    }
                    return prev;
                });
            })
            .on('broadcast', { event: 'START_GAME' }, ({ payload }) => {
                console.log('🚀 Starting game!', payload);
                // Navigate to game
                navigate('/arena/play', {
                    state: {
                        matchId: payload.matchId,
                        players: payload.players,
                        config: {
                            lesson: selectedLesson,
                            questionCount: 20,
                            checkMeaning: true,
                            checkReading: true,
                            enableWriting: true,
                            timeMode: 'normal'
                        }
                    }
                });
            })
            .subscribe(async (subStatus) => {
                console.log('📡 Channel status:', subStatus);
                if (subStatus === 'SUBSCRIBED') {
                    await channel.track({
                        online: true,
                        joinedAt: Date.now(),
                        playerData: myPlayerData
                    });
                    console.log('✅ Tracked presence in queue');
                }
            });

        channelRef.current = channel;
    };

    // === START READY CHECK ===
    const startReadyCheck = (players, matchId) => {
        // Tránh chạy lại nếu đã ở ready check - dùng ref để tránh stale closure
        if (statusRef.current === STATES.READY_CHECK || statusRef.current === STATES.MATCHED) {
            console.log('⏭️ Already in ready check, skipping...');
            return;
        }
        
        console.log('⏱️ Starting ready check for match:', matchId);
        setStatus(STATES.READY_CHECK);
        setFoundPlayers(players);
        setReadyPlayers([]);
        setCountdown(15);
        roomIdRef.current = matchId;

        // Start countdown
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    // Timeout - cancel match
                    console.log('⏰ Ready check timeout!');
                    cancelFinding();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // === CHECK IF ALL READY ===
    useEffect(() => {
        if (status === STATES.READY_CHECK && 
            readyPlayers.length === foundPlayers.length && 
            foundPlayers.length >= desiredPlayers &&
            readyPlayers.length >= desiredPlayers) {
            
            clearInterval(countdownRef.current);
            setStatus(STATES.MATCHED);
            console.log('🎉 All players ready! Starting game...');
            
            // Chỉ host broadcast start game - đảm bảo ID là string
            const sortedPlayers = [...foundPlayers].sort((a, b) => String(a.id).localeCompare(String(b.id)));
            const isHost = String(sortedPlayers[0].id) === String(user.id);
            
            if (isHost && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'START_GAME',
                    payload: { 
                        matchId: roomIdRef.current,
                        players: foundPlayers 
                    }
                });
            }

            // Navigate to game after short delay
            setTimeout(() => {
                navigate('/arena/play', {
                    state: {
                        matchId: roomIdRef.current,
                        players: foundPlayers,
                        config: {
                            lesson: selectedLesson,
                            questionCount: 20,
                            checkMeaning: true,
                            checkReading: true,
                            enableWriting: true,
                            timeMode: 'normal'
                        }
                    }
                });
            }, 1000);
        }
    }, [readyPlayers, foundPlayers, status, desiredPlayers, navigate, selectedLesson, user.id]);

    // === ACCEPT MATCH ===
    const acceptMatch = () => {
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'READY',
                payload: { playerId: user.id }
            });
            setReadyPlayers(prev => [...prev, user.id]);
        }
    };

    // === CANCEL FINDING ===
    const cancelFinding = () => {
        console.log('🚫 Cancelling matchmaking...');
        if (channelRef.current) {
            channelRef.current.untrack();
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
        }
        setStatus(STATES.IDLE);
        setFoundPlayers([]);
        setReadyPlayers([]);
        setCountdown(15);
        roomIdRef.current = null;
    };

    // === PROFILE SECTION ===
    const ProfileSection = () => (
        <div className="glass-card rounded-[2.5rem] p-6 flex flex-col h-full border-4 border-white shadow-xl relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-3/5 h-full opacity-5 bg-gradient-to-l from-current to-transparent pointer-events-none ${currentRankObj.color}`}></div>
            <div className="flex h-full gap-2">
                {/* Rank List */}
                <div className="w-[40%] border-r border-slate-100 pr-2 flex flex-col pt-1">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                        {t.arena_progress || 'Tiến trình'}
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                        {RANK_SYSTEM.slice().reverse().map((rank) => {
                            const isCurrent = currentRankObj.key === rank.key;
                            return (
                                <div key={rank.key} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${isCurrent ? 'bg-white shadow-md border border-slate-100 ring-1 ring-slate-200 scale-[1.02]' : 'opacity-60 grayscale'}`}>
                                    <img src={rank.img} className="w-8 h-8 object-contain" alt={rank.name}/>
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold ${rank.threshold <= realPoints ? 'text-slate-700' : 'text-slate-400'}`}>{rank.name}</span>
                                        <span className="text-[9px] font-medium text-slate-400">{rank.threshold}+</span>
                                    </div>
                                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto animate-pulse"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Profile */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 pl-2">
                    <div className="relative animate-float filter drop-shadow-2xl z-20 mb-[-15px]">
                        <img src={currentRankObj.img} alt={currentRankObj.name} className="w-40 h-40 md:w-48 md:h-48 object-contain"/>
                    </div>
                    <div className="relative z-10 mb-2">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white">
                            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.full_name}`} className="w-full h-full object-cover rounded-full" alt=""/>
                        </div>
                    </div>
                    <h2 className="text-lg font-black text-slate-800 truncate max-w-[140px] mb-1">{user?.full_name}</h2>
                    <div className={`px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border mb-1 ${currentRankObj.bg} ${currentRankObj.color}`}>
                        {currentRankObj.name}
                    </div>
                    <div className="text-xl font-black text-slate-600">
                        {realPoints} <span className="text-[10px] text-slate-400 align-top">{t.arena_points || 'điểm'}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    // === MATCHMAKING SECTION ===
    const MatchmakingSection = () => {
        if (status === STATES.IDLE) {
            return (
                <div className="glass-card rounded-[2.5rem] p-6 flex flex-col h-full border-4 border-white shadow-xl">
                    <h2 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight text-center">
                        {t.arena_find_opponent || 'Tìm đối thủ'}
                    </h2>

                    {/* Lesson Selection */}
                    <div className="mb-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Chọn bài học</div>
                        <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                            {Array.from({ length: 32 }, (_, i) => i + 1).map(num => (
                                <button
                                    key={num}
                                    onClick={() => setSelectedLesson(num)}
                                    className={`aspect-square rounded-lg font-bold text-sm transition-all ${
                                        selectedLesson === num
                                            ? 'bg-indigo-600 text-white shadow-lg scale-110'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        {selectedLesson && (
                            <div className="mt-2 text-center text-sm text-indigo-600 font-bold">
                                ✓ Đã chọn bài {selectedLesson}
                            </div>
                        )}
                    </div>

                    {/* Player Count */}
                    <div className="mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-center">
                            {t.arena_mode || 'Chế độ'}
                        </div>
                        <div className="flex gap-2">
                            {[2, 3, 4].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setDesiredPlayers(num)}
                                    className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${
                                        desiredPlayers === num
                                            ? 'bg-black text-white shadow-md'
                                            : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {num} {t.arena_players || 'người'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startFinding}
                        disabled={!selectedLesson}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t.arena_start_btn || 'Bắt đầu tìm'}
                    </button>
                </div>
            );
        }

        if (status === STATES.FINDING) {
            return (
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center h-full border-4 border-white shadow-xl">
                    <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                        <div className="animate-ripple inset-0 border-blue-400"></div>
                        <div className="animate-ripple inset-0 border-indigo-400" style={{animationDelay: '0.5s'}}></div>
                        <div className="w-24 h-24 bg-white rounded-full shadow-inner flex items-center justify-center relative z-10 border-4 border-slate-50">
                            <span className="text-4xl animate-bounce">🔍</span>
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-blue-600 animate-pulse uppercase mb-2">
                        {t.arena_finding || 'Đang tìm'} {desiredPlayers} {t.arena_players || 'người'}...
                    </h3>
                    <p className="text-slate-400 text-sm font-bold bg-slate-100 px-4 py-1 rounded-full mb-4">
                        {t.arena_found || 'Đã tìm thấy'}: {foundPlayers.length}/{desiredPlayers}
                    </p>
                    <p className="text-xs text-slate-400 mb-4">Bài học: {selectedLesson}</p>
                    <button
                        onClick={cancelFinding}
                        className="px-6 py-2 bg-white border-2 border-red-100 text-red-400 rounded-xl font-bold hover:bg-red-50 transition-all"
                    >
                        {t.arena_cancel || 'Hủy'}
                    </button>
                </div>
            );
        }

        if (status === STATES.READY_CHECK) {
            const isReady = readyPlayers.includes(user.id);
            return (
                <div className="glass-card rounded-[2.5rem] p-5 flex flex-col h-full border-4 border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-cyan-50/90 shadow-xl relative">
                    {/* Countdown */}
                    <div className="absolute top-3 right-3">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black border-4 ${
                            countdown > 5 ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-red-400 bg-red-50 text-red-600 animate-pulse'
                        }`}>
                            {countdown}
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-4">
                        <span className="text-3xl mb-2 block">⚔️</span>
                        <h2 className="text-lg font-black text-emerald-700 uppercase">
                            {t.arena_match_found || 'Trận đấu được tìm thấy!'}
                        </h2>
                    </div>

                    {/* Players */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4">
                        {foundPlayers.map((player, idx) => {
                            const playerReady = readyPlayers.includes(player.id);
                            const isMe = player.id === user.id;
                            return (
                                <div
                                    key={player.id || idx}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${
                                        playerReady
                                            ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 border-2 border-emerald-400'
                                            : 'bg-white/80 border-2 border-slate-200'
                                    } ${isMe ? 'ring-2 ring-blue-400' : ''}`}
                                >
                                    <img
                                        src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}`}
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
                                        alt=""
                                    />
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-800">
                                            {player.full_name}
                                            {isMe && <span className="ml-1 text-[10px] text-blue-500">(Bạn)</span>}
                                        </div>
                                        <div className={`text-[10px] font-bold ${player.rankColor}`}>
                                            {player.rankName}
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                        playerReady ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {playerReady ? '✓ Sẵn sàng' : 'Đang chờ...'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                                style={{ width: `${(readyPlayers.length / foundPlayers.length) * 100}%` }}
                            />
                        </div>
                        <div className="text-xs font-bold text-slate-500 mt-1 text-center">
                            {readyPlayers.length}/{foundPlayers.length} sẵn sàng
                        </div>
                    </div>

                    {/* Buttons */}
                    {!isReady ? (
                        <div className="flex gap-2">
                            <button
                                onClick={cancelFinding}
                                className="flex-1 py-3 bg-white border-2 border-red-200 text-red-500 rounded-xl font-black hover:bg-red-50"
                            >
                                ✕ Từ chối
                            </button>
                            <button
                                onClick={acceptMatch}
                                className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-xl font-black shadow-lg"
                            >
                                ✓ Sẵn sàng!
                            </button>
                        </div>
                    ) : (
                        <div className="py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-center border-2 border-emerald-300">
                            Đang chờ người chơi khác...
                        </div>
                    )}
                </div>
            );
        }

        if (status === STATES.MATCHED) {
            return (
                <div className="glass-card rounded-[2.5rem] p-8 flex flex-col items-center justify-center h-full border-4 border-green-100 bg-green-50/50 shadow-xl">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h2 className="text-2xl font-black text-green-700 uppercase mb-2">
                        {t.arena_matched || 'Đã ghép trận!'}
                    </h2>
                    <p className="text-green-600 font-bold mb-4">Đang vào trận...</p>
                    <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-white-pattern font-sans text-slate-800 flex flex-col overflow-hidden select-none relative">
            <style>{styles}</style>

            {/* Background Decorations */}
            <div className="absolute top-1/2 left-10 text-slate-200 hidden lg:block opacity-60 pointer-events-none rotate-[-15deg] -translate-y-1/2">
                <DPadDeco className="w-80 h-80" />
            </div>
            <div className="absolute top-1/2 right-10 text-slate-200 hidden lg:block opacity-60 pointer-events-none rotate-[15deg] -translate-y-1/2">
                <ButtonsDeco className="w-80 h-80" />
            </div>

            {/* Header */}
            <header className="h-16 px-6 flex justify-between items-center bg-white/80 backdrop-blur-md shadow-sm z-30 shrink-0 border-b border-gray-100">
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors border border-slate-200"
                >
                    ← {t.back || 'Quay lại'}
                </button>
                <div className="flex items-center gap-3">
                    <GameControllerIcon className="w-8 h-8 drop-shadow-sm" />
                    <h1 className="text-xl font-black uppercase text-slate-700 tracking-tight">
                        {t.arena_lobby_title || 'Võ Đài'}
                    </h1>
                </div>
                <div className="w-20"></div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full flex items-center justify-center">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full h-[550px]">
                    <div className="h-full"><ProfileSection /></div>
                    <div className="h-full"><MatchmakingSection /></div>
                </div>
            </main>
        </div>
    );
};

export default ArenaLobbyPage;
