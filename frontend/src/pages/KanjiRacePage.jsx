import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useRaceGame } from '../hooks/useRaceGame';

const styles = `
    @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
    .font-kanji { font-family: 'DFKai-SB', serif; }
    
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    
    @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    .animate-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

    .runner-move { transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
`;

// --- AVATAR ---
const RunnerAvatar = ({ avatar, name, isMe, position, length }) => (
    <div className={`absolute top-1/2 -translate-y-1/2 z-10 flex flex-col items-center runner-move`}
         style={{ left: `calc(${(Math.min(position, length) / length) * 100}% - 20px)` }}
    >
        <div className={`text-[9px] font-black uppercase mb-1 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap border ${isMe ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}>
            {isMe ? 'BẠN' : name.split(' ').pop()}
        </div>
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-[3px] shadow-md overflow-hidden bg-white ${isMe ? 'border-blue-500 ring-2 ring-blue-100' : 'border-red-400 grayscale opacity-90'}`}>
            <img src={avatar || `https://ui-avatars.com/api/?name=${name}`} className="w-full h-full object-cover" alt="" />
        </div>
    </div>
);

// --- TRACK ---
const SingleTrack = ({ user, position, length, isMe }) => (
    <div className="w-full h-10 md:h-12 bg-white rounded-full border-2 border-slate-100 shadow-inner relative flex items-center px-4">
        {Array.from({ length: length }).map((_, i) => (
            <div key={i} className="absolute top-2 bottom-2 w-px bg-slate-200" style={{ left: `${((i + 1) / length) * 100}%` }}></div>
        ))}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-lg opacity-50">🏁</div>
        <RunnerAvatar avatar={user.avatar} name={user.full_name} isMe={isMe} position={position} length={length} />
    </div>
);

const KanjiRacePage = () => {
    const { user } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { matchId, opponent, isHost } = location.state || {};

    const { 
        gameState, myPos, oppPos, currentQuestion, 
        feedback, answerReveal, stunCountdown, 
        resultMsg, gameResult, TRACK_LENGTH, 
        handleAnswer, confirmQuit 
    } = useRaceGame(matchId, opponent, isHost, user);

    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        setInputValue("");
        if (currentQuestion && !currentQuestion.isMCQ && !feedback && !answerReveal && stunCountdown === 0) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [currentQuestion, feedback, answerReveal, stunCountdown]);

    if (!matchId || !opponent) return <div className="h-screen flex items-center justify-center font-bold text-slate-400 text-xl font-game">ĐANG TẢI ĐẤU TRƯỜNG...</div>;

    return (
        <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative select-none">
            <style>{styles}</style>

            {/* HEADER */}
            <div className="bg-white p-3 shadow-sm z-30 border-b border-slate-100 shrink-0">
                <div className="max-w-6xl mx-auto w-full">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex-1 flex justify-start">
                            <button onClick={confirmQuit} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-95">
                                <span className="text-xl">✕</span> ĐẦU HÀNG
                            </button>
                        </div>
                        <div className="font-black text-xl text-slate-800 uppercase tracking-widest text-center flex-1">
                            {gameState === 'RACING' ? (
                                <span className="bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200">
                                    CÂU {myPos + 1} / {TRACK_LENGTH}
                                </span>
                            ) : 'CHUẨN BỊ...'}
                        </div>
                        <div className="flex-1 flex justify-end">
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-4 py-2 rounded-xl border border-blue-100">
                                VS {opponent.full_name}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-6"> 
                        <SingleTrack user={opponent} position={oppPos} length={TRACK_LENGTH} isMe={false} />
                        <SingleTrack user={user} position={myPos} length={TRACK_LENGTH} isMe={true} />
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-4xl mx-auto relative h-full">
                
                {gameState === 'RACING' && currentQuestion ? (
                    <div className={`w-full flex flex-col items-center gap-4 transition-all duration-300 ${feedback === 'WRONG' ? 'animate-shake' : ''}`}>
                        
                        {/* CARD CÂU HỎI */}
                        <div className={`bg-white rounded-[3rem] shadow-xl w-full border-[3px] text-center relative overflow-hidden transition-colors flex flex-col justify-between py-10 px-6 md:px-12
                            ${answerReveal ? 'border-orange-300' : feedback === 'WRONG' ? 'border-red-400' : feedback === 'CORRECT' ? 'border-green-400' : 'border-slate-100'}
                            min-h-[420px]`}
                        >
                            {/* BANNER THÔNG BÁO */}
                            {(answerReveal || feedback) && (
                                <div className={`absolute top-0 left-0 right-0 py-3 font-black text-white text-center shadow-md animate-slide-down z-20
                                    ${answerReveal ? 'bg-orange-500' : feedback === 'CORRECT' ? 'bg-green-500' : 'bg-red-500'}`}>
                                    {answerReveal ? (
                                        <>⚠️ SAI 2 LẦN (-1 BƯỚC) • ĐÁP ÁN: <span className="text-xl ml-2 bg-white/20 px-2 rounded">{answerReveal}</span></>
                                    ) : feedback === 'CORRECT' ? (
                                        "✨ CHÍNH XÁC!"
                                    ) : (
                                        `❌ SAI RỒI! CHỜ ${stunCountdown} GIÂY...`
                                    )}
                                </div>
                            )}

                            {/* Type Tag */}
                            <div className="mt-4">
                                <span className={`inline-block px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm ${currentQuestion.typeTag === 'HÁN TỰ' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                    {currentQuestion.typeTag}
                                </span>
                            </div>

                            {/* KANJI BIG */}
                            <div className="flex-1 flex items-center justify-center my-4">
                                <h1 className="text-[6rem] md:text-[9rem] leading-none text-slate-800 font-kanji drop-shadow-sm select-none">
                                    {currentQuestion.question}
                                </h1>
                            </div>

                            {/* HINT */}
                            <div className="mb-8">
                                <div className={`inline-block px-8 py-3 rounded-2xl font-black text-sm md:text-lg uppercase tracking-wide border-2 shadow-sm ${currentQuestion.askMode === 'READING' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                    {currentQuestion.askMode === 'READING' ? "HIRAGANA ?" : "HÁN VIỆT / NGHĨA ?"}
                                </div>
                            </div>

                            {/* INPUT / MCQ AREA */}
                            <div className="h-24 w-full">
                                {currentQuestion.isMCQ ? (
                                    <div className="h-full grid grid-cols-2 gap-4">
                                        {currentQuestion.options.map((opt, i) => (
                                            <button key={i} disabled={stunCountdown > 0 || answerReveal} onClick={() => handleAnswer(opt)}
                                                // 🔥 STYLE NÚT 3D: border-b-[6px], hover nổi lên, active lún xuống
                                                className="h-full bg-white border-2 border-slate-200 border-b-[6px] rounded-3xl font-black text-lg md:text-xl text-slate-600 
                                                hover:border-blue-400 hover:text-blue-600 hover:-translate-y-1 
                                                active:border-b-0 active:translate-y-1 transition-all 
                                                disabled:opacity-50 disabled:cursor-not-allowed px-2 shadow-sm flex items-center justify-center leading-tight">
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <form onSubmit={e => { e.preventDefault(); handleAnswer(inputValue); }} className="flex gap-4 h-full items-center">
                                        <input 
                                            ref={inputRef} 
                                            value={inputValue} 
                                            onChange={(e) => setInputValue(e.target.value)} 
                                            disabled={stunCountdown > 0 || answerReveal}
                                            placeholder={currentQuestion.askMode === 'READING' ? "Gõ Romaji..." : "Nhập nghĩa..."}
                                            className={`flex-1 h-full text-center text-3xl md:text-4xl font-bold rounded-[2rem] border-[4px] outline-none transition-all placeholder:text-gray-300 placeholder:text-xl placeholder:font-normal 
                                                ${feedback === 'WRONG' ? 'border-red-400 bg-red-50 text-red-500' : feedback === 'CORRECT' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 focus:border-indigo-500 focus:bg-white bg-slate-50 text-slate-700'}`} 
                                        />
                                        <button type="submit" disabled={stunCountdown > 0 || answerReveal} 
                                            className="w-24 h-full bg-slate-900 text-white rounded-[2rem] font-black text-3xl shadow-lg border-b-[6px] border-slate-700 
                                            hover:bg-slate-800 hover:-translate-y-1 
                                            active:border-b-0 active:translate-y-1 transition-all 
                                            disabled:opacity-50 flex items-center justify-center shrink-0">
                                            ➜
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center animate-pulse gap-6">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div>
                        <div className="text-xl font-black text-slate-400 uppercase tracking-widest">
                            {gameState === 'LOADING' ? "ĐANG TẢI..." : "ĐANG ĐỢI..."}
                        </div>
                    </div>
                )}
            </div>

            {/* RESULT OVERLAY */}
            {gameState === 'FINISHED' && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-fade-in p-6">
                    <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-4 border-slate-50 text-center w-full max-w-md relative overflow-hidden transform scale-100 hover:scale-105 transition-transform duration-500">
                        <div className={`absolute top-0 left-0 w-full h-4 ${gameResult === 'WIN' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div className="text-[7rem] mb-6 animate-bounce">{gameResult === 'WIN' ? '🏆' : '💀'}</div>
                        <h2 className={`text-5xl font-black mb-4 uppercase ${gameResult === 'WIN' ? 'text-green-600' : 'text-slate-500'}`}>{gameResult === 'WIN' ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</h2>
                        <p className="text-xl text-slate-400 font-bold mb-10 px-4">{resultMsg}</p>
                        <button onClick={() => navigate('/arena')} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xl hover:bg-slate-800 shadow-xl transition-all active:scale-95">QUAY VỀ SẢNH</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanjiRacePage;