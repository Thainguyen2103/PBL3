import React, { useState, useEffect } from 'react';

const MatchConfirmModal = ({ matchData, onAccept, onReject, onTimeout }) => {
    const [timeLeft, setTimeLeft] = useState(30);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (!matchData) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    onTimeout?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [matchData, onTimeout]);

    if (!matchData) return null;

    const progressPercent = (timeLeft / 30) * 100;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
                {/* Header với countdown */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-3 animate-bounce">🎮</div>
                    <h2 className="text-3xl font-black text-white">MATCH FOUND!</h2>
                    
                    {/* Countdown circle */}
                    <div className="relative w-32 h-32 mx-auto mt-6 mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                            {/* Background circle */}
                            <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="8" />
                            {/* Progress circle */}
                            <circle 
                                cx="60" 
                                cy="60" 
                                r="50" 
                                fill="none" 
                                stroke={timeLeft > 10 ? "#10b981" : timeLeft > 5 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="8"
                                strokeDasharray={`${(timeLeft / 30) * 314} 314`}
                                strokeLinecap="round"
                                className="transition-all duration-1000"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`text-4xl font-black transition-colors ${
                                timeLeft > 10 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                                {timeLeft}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Players grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {matchData.players.map((player, idx) => (
                        <div 
                            key={idx} 
                            className={`p-3 rounded-lg border-2 transition-all ${
                                matchData.playerAccepts?.[player.id] 
                                    ? 'bg-green-900/50 border-green-500 ring-2 ring-green-500/50' 
                                    : 'bg-slate-700/50 border-slate-600'
                            }`}
                        >
                            <img 
                                src={player.avatar || `https://ui-avatars.com/api/?name=${player.full_name}`}
                                className="w-10 h-10 rounded-full mx-auto mb-2"
                                alt={player.full_name}
                            />
                            <div className="text-xs font-bold text-white text-center truncate">{player.full_name}</div>
                            <div className="text-xs text-slate-400 text-center">{player.rankName}</div>
                            {matchData.playerAccepts?.[player.id] && (
                                <div className="mt-2 text-center text-green-400 text-xs font-bold">✓ Ready</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setAccepted(false);
                            onReject();
                        }}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all active:scale-95"
                    >
                        DECLINE
                    </button>
                    <button
                        onClick={() => {
                            setAccepted(true);
                            onAccept();
                        }}
                        disabled={accepted}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 ${
                            accepted 
                                ? 'bg-green-600 text-white' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                    >
                        {accepted ? '✓ ACCEPTED' : 'ACCEPT'}
                    </button>
                </div>

                <p className="text-xs text-slate-400 text-center mt-4">
                    Tất cả phải accept trong {timeLeft}s
                </p>
            </div>
        </div>
    );
};

export default MatchConfirmModal;

