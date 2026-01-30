import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { translations } from '../utils/translations';
import { useArenaGame } from '../hooks/useArenaGame';

// === STYLES ===
const customStyles = `
    @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
    
    @keyframes shake { 
        0%, 100% { transform: translateX(0); } 
        25% { transform: translateX(-10px); } 
        75% { transform: translateX(10px); } 
    }
    .animate-shake { animation: shake 0.3s ease-in-out; }
    
    @keyframes pulse-green {
        0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
        50% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
    }
    .animate-pulse-green { animation: pulse-green 0.5s ease-out; }
    
    @keyframes countdown-pop {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
    }
    .animate-countdown { animation: countdown-pop 0.5s ease-out; }
    
    @keyframes slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slide-up 0.4s ease-out; }
    
    @keyframes winner-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
        50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8); }
    }
    .animate-winner-glow { animation: winner-glow 1s ease-in-out infinite; }
    
    @keyframes fade-in-up {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
    
    @keyframes float-slow {
        0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
        50% { transform: translateY(-20px) rotate(var(--rotate, 0deg)); }
    }
    .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
    
    @keyframes float-slower {
        0%, 100% { transform: translateY(0) rotate(var(--rotate, 0deg)); }
        50% { transform: translateY(-15px) rotate(var(--rotate, 0deg)); }
    }
    .animate-float-slower { animation: float-slower 8s ease-in-out infinite; }
    
    @keyframes pulse-slow {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.1); }
    }
    .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
    
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// === COUNTDOWN OVERLAY ===
const CountdownOverlay = ({ count }) => (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 z-50 flex items-center justify-center">
        <div className="text-center">
            <div 
                key={count} 
                className="text-[12rem] font-black text-white animate-countdown drop-shadow-2xl"
                style={{ textShadow: '0 0 60px rgba(255,255,255,0.5)' }}
            >
                {count > 0 ? count : 'GO!'}
            </div>
            <p className="text-white/80 text-2xl font-bold uppercase tracking-widest mt-4">
                {count > 0 ? 'Chuẩn bị...' : 'CHIẾN ĐẤU!'}
            </p>
        </div>
    </div>
);

// === FORFEIT CONFIRM MODAL ===
const ForfeitConfirmModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-4xl font-black text-red-500">X</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Xác nhận đầu hàng?</h2>
            <p className="text-slate-500 mb-6">Bạn sẽ thua trận này và mất điểm xếp hạng.</p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                    Hủy
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all"
                >
                    Đầu hàng
                </button>
            </div>
        </div>
    </div>
);

// === FORFEITING OVERLAY (hiển thị sau khi đầu hàng) ===
const ForfeitingOverlay = ({ countdown }) => (
    <div className="fixed inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800 z-50 flex items-center justify-center">
        <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-5xl font-black text-white">GG</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4">Bạn đã đầu hàng</h2>
            <p className="text-white/80 text-xl mb-6">Đang quay về sảnh chờ...</p>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/20 rounded-2xl">
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white font-bold text-lg">{countdown}s</span>
            </div>
        </div>
    </div>
);

// === PLAYER SCORE CARD ===
const PlayerScoreCard = ({ player, score, isMe, winningScore, isWinner, isForfeited }) => {
    const progress = (score / winningScore) * 100;
    
    // Nếu đầu hàng → hiển thị xám
    if (isForfeited) {
        return (
            <div className="relative p-3 rounded-2xl bg-slate-200 opacity-60">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}&background=random`} 
                            className="w-12 h-12 rounded-full border-3 border-slate-300 shadow-md object-cover grayscale"
                            alt={player.full_name}
                        />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">X</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate text-slate-500 line-through">
                            {player.full_name}
                            {isMe && <span className="ml-1 text-[10px] opacity-75">(Bạn)</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-medium">Đã đầu hàng</div>
                    </div>
                    <div className="text-3xl font-black tabular-nums text-slate-400">
                        {score}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`relative p-3 rounded-2xl transition-all duration-300 ${
            isWinner 
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 animate-winner-glow' 
                : isMe 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200' 
                    : 'bg-white border-2 border-slate-200'
        }`}>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img 
                        src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}&background=random`} 
                        className={`w-12 h-12 rounded-full border-3 shadow-md object-cover ${
                            isWinner ? 'border-yellow-200' : isMe ? 'border-white' : 'border-slate-200'
                        }`}
                        alt={player.full_name}
                    />
                    {isWinner && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow">
                            <span className="text-yellow-900 text-xs font-black">★</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm truncate ${
                        isWinner || isMe ? 'text-white' : 'text-slate-800'
                    }`}>
                        {player.full_name}
                        {isMe && <span className="ml-1 text-[10px] opacity-75">(Bạn)</span>}
                    </div>
                    {/* Progress bar */}
                    <div className={`h-2 rounded-full mt-1 overflow-hidden ${
                        isWinner || isMe ? 'bg-white/30' : 'bg-slate-200'
                    }`}>
                        <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                                isWinner ? 'bg-white' : isMe ? 'bg-white' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div className={`text-3xl font-black tabular-nums ${
                    isWinner || isMe ? 'text-white' : 'text-indigo-600'
                }`}>
                    {score}
                </div>
            </div>
        </div>
    );
};

// === ROUND WINNER POPUP ===
const RoundWinnerPopup = ({ winner }) => {
    const isSkipped = winner.odlId === null;
    const isAllWrong = winner.odlName === 'Không ai trả lời đúng';
    const isVoteSkip = winner.odlName === 'Tất cả đồng ý bỏ qua';
    
    // Xác định icon và màu sắc
    let iconContent = <span className="text-green-600 font-black">✓</span>;
    let textColor = 'text-green-600';
    let bgColor = 'bg-green-100';
    let iconBg = 'bg-green-100';
    let message = `${winner.odlName} trả lời đúng!`;
    
    if (isAllWrong) {
        iconContent = <span className="text-red-600 font-black">X</span>;
        textColor = 'text-red-600';
        bgColor = 'bg-red-100';
        iconBg = 'bg-red-100';
        message = 'Tất cả đều trả lời sai!';
    } else if (isVoteSkip) {
        iconContent = <span className="text-amber-600 font-black">→</span>;
        textColor = 'text-amber-600';
        bgColor = 'bg-amber-100';
        iconBg = 'bg-amber-100';
        message = 'Bỏ qua câu hỏi';
    }
    
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 animate-slide-up">
            <div className="bg-white rounded-3xl p-6 shadow-2xl text-center max-w-sm mx-4">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full ${iconBg} flex items-center justify-center`}>
                    <span className="text-3xl">{iconContent}</span>
                </div>
                <div className={`text-lg font-black mb-2 ${textColor}`}>
                    {message}
                </div>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Đáp án đúng</div>
                <div className={`text-2xl font-bold text-slate-800 rounded-xl px-4 py-3 ${bgColor}`}>
                    {winner.answer}
                </div>
            </div>
        </div>
    );
};

// === RESULT OVERLAY ===
const ResultOverlay = ({ result, winner, scores, players, myId, onBack }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
            {/* Result Icon */}
            <div className="text-center mb-6">
                <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    result === 'WIN' ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-slate-300 to-slate-400'
                }`}>
                    <span className="text-5xl font-black text-white">
                        {result === 'WIN' ? '#1' : 'GG'}
                    </span>
                </div>
                <h2 className={`text-4xl font-black uppercase tracking-tight ${
                    result === 'WIN' ? 'text-yellow-500' : 'text-slate-500'
                }`}>
                    {result === 'WIN' ? 'CHIẾN THẮNG!' : 'THUA CUỘC'}
                </h2>
                {winner && (
                    <p className="text-slate-500 mt-2">
                        Người chiến thắng: <span className="font-bold text-slate-800">{winner.full_name}</span>
                    </p>
                )}
            </div>

            {/* Final Scores */}
            <div className="space-y-2 mb-6">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kết quả</div>
                {players
                    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                    .map((player, idx) => (
                        <div 
                            key={player.id}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                                String(player.id) === String(myId)
                                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300' 
                                    : 'bg-slate-50'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                                idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                                idx === 1 ? 'bg-gray-300 text-gray-700' :
                                'bg-orange-400 text-orange-900'
                            }`}>
                                {idx === 0 ? '👑' : idx + 1}
                            </div>
                            <img 
                                src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}`}
                                className="w-10 h-10 rounded-full border-2 border-white shadow"
                                alt=""
                            />
                            <div className="flex-1 font-bold text-slate-700">
                                {player.full_name}
                            </div>
                            <div className="font-black text-2xl text-indigo-600">{scores[player.id] || 0}</div>
                        </div>
                    ))}
            </div>

            {/* Back Button */}
            <button 
                onClick={onBack}
                className="w-full py-4 bg-gradient-to-r from-slate-800 to-black text-white rounded-xl font-black uppercase tracking-wider hover:shadow-xl active:scale-95 transition-all"
            >
                ← Về Sảnh Chờ
            </button>
        </div>
    </div>
);

const ArenaGamePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, language } = useAppContext();
    const t = translations[language] || translations.vi;
    
    const { matchId, players, config } = location.state || {};
    const inputRef = useRef(null);
    
    // State for forfeit modal
    const [showForfeitModal, setShowForfeitModal] = useState(false);
    
    // State for forfeiting overlay (after confirming forfeit)
    const [isForfeiting, setIsForfeiting] = useState(false);
    const [forfeitCountdown, setForfeitCountdown] = useState(3);
    
    // State for MCQ anti-spam delay (options only clickable after delay)
    const [mcqReady, setMcqReady] = useState(false);
    const [mcqCountdown, setMcqCountdown] = useState(0);

    // Validate navigation
    useEffect(() => {
        if (!matchId || !players || !user) {
            navigate('/arena/lobby', { replace: true });
        }
    }, [matchId, players, user, navigate]);

    // Get game hook
    const {
        gamePhase,
        countdown,
        winningScore,
        currentQuestion,
        currentQ,
        scores,
        inputValue,
        setInputValue,
        isLocked,
        roundWinner,
        showAnswer,
        myAnswerStatus,
        gameResult,
        winner,
        submitAnswer,
        voteSkip,
        skipVotes,
        forfeit,
        forfeitedPlayers,
        mcqWrongPlayers,
        myWrongAnswer
    } = useArenaGame(matchId, players, user, config);
    
    // Tính số người active (không forfeit)
    const activePlayers = players?.filter(p => !forfeitedPlayers.includes(String(p.id))) || [];
    const hasVoted = skipVotes.includes(String(user?.id));
    
    // Kiểm tra xem tôi đã bị khóa vì trả lời sai MCQ chưa
    const iAmLockedFromMCQ = mcqWrongPlayers?.includes(String(user?.id));

    // Focus input
    useEffect(() => {
        if (gamePhase === 'PLAYING' && !isLocked) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [gamePhase, isLocked, currentQ]);
    
    // MCQ anti-spam: delay 1.5s trước khi có thể chọn đáp án
    useEffect(() => {
        if (gamePhase === 'PLAYING' && currentQuestion?.mode === 'mcq' && !isLocked) {
            setMcqReady(false);
            setMcqCountdown(2); // 2 giây countdown
            
            const interval = setInterval(() => {
                setMcqCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setMcqReady(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
            return () => clearInterval(interval);
        } else if (currentQuestion?.mode === 'writing') {
            setMcqReady(true); // Writing mode không cần delay
        }
    }, [gamePhase, currentQ, currentQuestion?.mode, isLocked]);

    // Handle submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim()) {
            submitAnswer(inputValue.trim());
        }
    };

    // Handle back to lobby (forfeit first if game is still active)
    const handleBack = () => {
        if (gamePhase === 'PLAYING' || gamePhase === 'COUNTDOWN') {
            forfeit();
        }
        navigate('/arena/lobby', { replace: true });
    };
    
    // Handle browser back button
    useEffect(() => {
        const handlePopState = (e) => {
            if (gamePhase === 'PLAYING' || gamePhase === 'COUNTDOWN') {
                forfeit();
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [gamePhase, forfeit]);

    if (!matchId || !players) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-50 flex flex-col font-sans overflow-hidden select-none relative">
            <style>{customStyles}</style>

            {/* Floating Kanji Background Decoration - Chữ Hán đỏ văn thơ */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                {/* Left column 1 - near edge */}
                <div className="absolute left-2 top-0 h-full w-24 flex flex-col justify-around items-center">
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-300/30 text-[3.5rem] text-red-700/[0.15] transform -rotate-12 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>夢</span>
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-200/25 text-[2.8rem] text-red-600/[0.12] transform rotate-6 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>月</span>
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-400/30 text-[3.5rem] text-red-800/[0.15] transform -rotate-3 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>風</span>
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-300/25 text-[2.8rem] text-red-700/[0.12] transform rotate-12 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>雲</span>
                    <span className="w-18 h-18 flex items-center justify-center rounded-full border-2 border-red-200/30 text-[3rem] text-red-600/[0.15] transform -rotate-6 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>詩</span>
                </div>
                
                {/* Left column 2 - inner */}
                <div className="absolute left-28 top-16 h-full w-24 flex flex-col justify-around items-center">
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-200/20 text-[2.8rem] text-red-600/[0.10] transform rotate-8 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>花</span>
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-300/25 text-[3.5rem] text-red-700/[0.12] transform -rotate-10 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>愛</span>
                    <span className="w-18 h-18 flex items-center justify-center rounded-full border-2 border-red-400/20 text-[3rem] text-red-800/[0.10] transform rotate-5 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>春</span>
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-200/25 text-[2.8rem] text-red-600/[0.12] transform -rotate-8 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>星</span>
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-300/20 text-[3.5rem] text-red-700/[0.10] transform rotate-3 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>心</span>
                </div>
                
                {/* Right column 1 - near edge */}
                <div className="absolute right-2 top-0 h-full w-24 flex flex-col justify-around items-center">
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-200/25 text-[2.8rem] text-red-600/[0.12] transform rotate-12 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>天</span>
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-400/30 text-[3.5rem] text-red-800/[0.15] transform -rotate-6 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>道</span>
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-300/25 text-[2.8rem] text-red-700/[0.12] transform rotate-3 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>雪</span>
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-200/30 text-[3.5rem] text-red-600/[0.15] transform -rotate-12 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>魂</span>
                    <span className="w-18 h-18 flex items-center justify-center rounded-full border-2 border-red-300/25 text-[3rem] text-red-700/[0.12] transform rotate-8 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>光</span>
                </div>
                
                {/* Right column 2 - inner */}
                <div className="absolute right-28 top-20 h-full w-24 flex flex-col justify-around items-center">
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-300/20 text-[3.5rem] text-red-700/[0.10] transform -rotate-5 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>水</span>
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-200/25 text-[2.8rem] text-red-600/[0.12] transform rotate-10 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>山</span>
                    <span className="w-18 h-18 flex items-center justify-center rounded-full border-2 border-red-400/20 text-[3rem] text-red-800/[0.10] transform -rotate-8 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>秋</span>
                    <span className="w-20 h-20 flex items-center justify-center rounded-full border-2 border-red-300/25 text-[3.5rem] text-red-700/[0.12] transform rotate-6 animate-float-slower" style={{fontFamily: "'DFKai-SB', serif"}}>夜</span>
                    <span className="w-16 h-16 flex items-center justify-center rounded-full border-2 border-red-200/20 text-[2.8rem] text-red-600/[0.10] transform -rotate-3 animate-float-slow" style={{fontFamily: "'DFKai-SB', serif"}}>霧</span>
                </div>
            </div>

            {/* Countdown Overlay */}
            {gamePhase === 'COUNTDOWN' && <CountdownOverlay count={countdown} />}

            {/* Result Overlay */}
            {gamePhase === 'FINISHED' && gameResult && (
                <ResultOverlay 
                    result={gameResult}
                    winner={winner}
                    scores={scores}
                    players={players}
                    myId={user.id}
                    onBack={handleBack}
                />
            )}
            
            {/* Forfeit Confirm Modal */}
            {showForfeitModal && (
                <ForfeitConfirmModal 
                    onConfirm={() => {
                        setShowForfeitModal(false);
                        forfeit();
                        setIsForfeiting(true);
                        setForfeitCountdown(3);
                        
                        // Countdown 3 giây trước khi về lobby
                        let count = 3;
                        const interval = setInterval(() => {
                            count--;
                            setForfeitCountdown(count);
                            if (count <= 0) {
                                clearInterval(interval);
                                navigate('/arena/lobby', { replace: true });
                            }
                        }, 1000);
                    }}
                    onCancel={() => setShowForfeitModal(false)}
                />
            )}
            
            {/* Forfeiting Overlay */}
            {isForfeiting && <ForfeitingOverlay countdown={forfeitCountdown} />}

            {/* HEADER */}
            <header className="px-4 py-3 bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-200">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button 
                        onClick={() => setShowForfeitModal(true)}
                        className="px-4 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-all flex items-center gap-1.5"
                    >
                        <span className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-current text-xs font-black">✕</span>
                        Đầu hàng
                    </button>

                    {/* Target Score */}
                    <div className="text-center">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mục tiêu</div>
                        <div className="text-2xl font-black text-indigo-600">{winningScore} điểm</div>
                    </div>

                    {/* Question Counter */}
                    <div className="px-4 py-2 bg-slate-100 rounded-xl">
                        <div className="text-xs text-slate-400 font-bold">Câu hỏi</div>
                        <div className="text-lg font-black text-slate-700">{currentQ + 1}</div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col p-4 max-w-4xl mx-auto w-full">
                {/* Players Score Bar */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {players.map(player => (
                        <PlayerScoreCard 
                            key={player.id}
                            player={player}
                            score={scores[player.id] || 0}
                            isMe={String(player.id) === String(user.id)}
                            winningScore={winningScore}
                            isWinner={roundWinner?.odlId === player.id}
                            isForfeited={forfeitedPlayers?.includes(String(player.id)) || forfeitedPlayers?.includes(player.id)}
                        />
                    ))}
                </div>

                {/* Question Card */}
                {gamePhase === 'PLAYING' && currentQuestion && (
                    <div className="flex-1 flex flex-col animate-slide-up">
                        {/* Question Display */}
                        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl shadow-xl border border-slate-100 p-6 relative overflow-hidden">
                            
                            {/* Round Winner Popup */}
                            {showAnswer && roundWinner && (
                                <RoundWinnerPopup winner={roundWinner} />
                            )}

                            {/* Hint Badge */}
                            <div className={`px-5 py-2 rounded-2xl font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2 ${
                                currentQuestion.askMeaning 
                                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-200' 
                                    : 'bg-orange-100 text-orange-600 border-2 border-orange-200'
                            }`}>
                                <span className="text-lg">{currentQuestion.askMeaning ? '文' : 'あ'}</span>
                                {currentQuestion.mode === 'mcq' 
                                    ? (currentQuestion.askMeaning ? 'CHỌN HÁN VIỆT / NGHĨA' : 'CHỌN CÁCH ĐỌC')
                                    : (currentQuestion.askMeaning ? 'NHẬP HÁN VIỆT / NGHĨA' : 'NHẬP CÁCH ĐỌC')
                                }
                            </div>

                            {/* Kanji */}
                            <h1 
                                className={`leading-none text-slate-800 mb-4 drop-shadow-lg ${
                                    currentQuestion.mode === 'mcq' ? 'text-[6rem] md:text-[8rem]' : 'text-[8rem] md:text-[10rem]'
                                }`}
                                style={{ fontFamily: "'DFKai-SB', serif" }}
                            >
                                {currentQuestion.question}
                            </h1>

                            {/* Type Tag */}
                            <div className="px-4 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold mb-4">
                                {currentQuestion.type === 'kanji' ? '漢字 Kanji' : '熟語 Jukugo'}
                                <span className="ml-2 text-indigo-500">
                                    {currentQuestion.mode === 'mcq' ? '• Trắc nghiệm' : '• Tự luận'}
                                </span>
                            </div>

                            {/* MCQ Options - hiển thị trong card với delay chống spam */}
                            {currentQuestion.mode === 'mcq' && currentQuestion.options && (
                                <div className="w-full max-w-2xl mt-2">
                                    {/* Countdown overlay */}
                                    {!mcqReady && !isLocked && !iAmLockedFromMCQ && (
                                        <div className="text-center mb-3">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold">
                                                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                                Đọc câu hỏi... {mcqCountdown}s
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Thông báo đã trả lời sai */}
                                    {iAmLockedFromMCQ && !isLocked && (
                                        <div className="text-center mb-3">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold">
                                                <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">✕</span>
                                                Bạn đã chọn sai! Chờ đối thủ...
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        {currentQuestion.options.map((option, idx) => {
                                            // Xác định trạng thái của option này
                                            const isMyWrongChoice = myWrongAnswer === option.text;
                                            const isDisabled = isLocked || !mcqReady || iAmLockedFromMCQ;
                                            
                                            let buttonClass = '';
                                            if (isLocked) {
                                                // Game đã khóa (có người đúng hoặc tất cả sai)
                                                if (option.isCorrect) {
                                                    buttonClass = 'bg-green-100 border-green-500 text-green-700';
                                                } else if (isMyWrongChoice) {
                                                    buttonClass = 'bg-red-100 border-red-500 text-red-700';
                                                } else {
                                                    buttonClass = 'bg-slate-100 border-slate-300 text-slate-400';
                                                }
                                            } else if (iAmLockedFromMCQ) {
                                                // Tôi đã chọn sai, đang chờ đối thủ
                                                if (isMyWrongChoice) {
                                                    buttonClass = 'bg-red-100 border-red-500 text-red-700 cursor-not-allowed';
                                                } else {
                                                    buttonClass = 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60';
                                                }
                                            } else if (!mcqReady) {
                                                buttonClass = 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-70';
                                            } else {
                                                buttonClass = 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-[1.02] active:scale-95 cursor-pointer text-slate-700';
                                            }
                                            
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => !isDisabled && submitAnswer(option.text)}
                                                    disabled={isDisabled}
                                                    className={`p-4 rounded-2xl text-lg font-bold transition-all duration-200 border-3 animate-fade-in-up ${buttonClass}`}
                                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                                >
                                                    <span className={`inline-block w-8 h-8 rounded-full text-sm font-black mr-2 leading-8 ${
                                                        isMyWrongChoice 
                                                            ? 'bg-red-200 text-red-600' 
                                                            : (isLocked && option.isCorrect)
                                                                ? 'bg-green-200 text-green-600'
                                                                : mcqReady && !isDisabled 
                                                                    ? 'bg-indigo-100 text-indigo-600' 
                                                                    : 'bg-slate-200 text-slate-500'
                                                    }`}>
                                                        {isMyWrongChoice ? '✗' : String.fromCharCode(65 + idx)}
                                                    </span>
                                                    {option.text}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Answer Input - chỉ hiện cho Writing mode */}
                        {currentQuestion.mode === 'writing' && (
                            <form onSubmit={handleSubmit} className="mt-4">
                                <div className="flex gap-3">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        disabled={isLocked}
                                        placeholder={currentQuestion.askMeaning 
                                            ? 'Nhập nghĩa (VD: nhật, mặt trời)...' 
                                            : 'Nhập cách đọc (VD: にち, nichi)...'
                                        }
                                        className={`flex-1 text-center text-2xl font-bold rounded-2xl border-4 outline-none transition-all px-6 py-4 ${
                                            isLocked
                                                ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : myAnswerStatus === 'correct'
                                                    ? 'border-green-500 bg-green-50 text-green-700 animate-pulse-green'
                                                    : myAnswerStatus === 'wrong'
                                                        ? 'border-red-500 bg-red-50 text-red-700 animate-shake'
                                                        : 'border-indigo-300 focus:border-indigo-500 text-slate-800 bg-white'
                                        }`}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        disabled={isLocked || !inputValue.trim()}
                                        className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-lg uppercase tracking-wider hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                                    >
                                        GỬI
                                    </button>
                                    <button
                                        type="button"
                                        onClick={voteSkip}
                                        disabled={isLocked || hasVoted}
                                        className={`px-6 py-4 rounded-2xl font-bold text-sm uppercase tracking-wider hover:shadow-xl disabled:cursor-not-allowed active:scale-95 transition-all flex flex-col items-center gap-0.5 ${
                                            hasVoted 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                        } ${isLocked ? 'opacity-50' : ''}`}
                                        title="Vote bỏ qua câu này (cần tất cả đồng ý)"
                                    >
                                        <span className="font-bold">{hasVoted ? '✓' : '⏭'}</span>
                                        <span className="text-xs">{skipVotes.length}/{activePlayers.length}</span>
                                    </button>
                                </div>
                                
                                {/* Vote status */}
                                {skipVotes.length > 0 && !isLocked && (
                                    <p className="text-center text-amber-600 text-sm mt-2 font-semibold">
                                        ⏭ {skipVotes.length}/{activePlayers.length} người muốn bỏ qua
                                        {!hasVoted && ' - Bấm để vote!'}
                                    </p>
                                )}
                                
                                {/* Hint text */}
                                <p className="text-center text-slate-400 text-sm mt-2">
                                    ☆ Ai trả lời đúng trước sẽ ghi điểm! Bấm ⏭ nếu không biết.
                                </p>
                            </form>
                        )}
                    </div>
                )}

                {/* Loading State */}
                {gamePhase === 'LOADING' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-500 font-bold text-lg">Đang kết nối trận đấu...</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ArenaGamePage;
