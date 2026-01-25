import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as wanakana from 'wanakana'; 
import { supabase } from '../supabaseClient'; 
import { useAppContext } from '../context/AppContext'; // ✅ Import Context
import { translations } from '../utils/translations'; // ✅ Import Translations
import kanjiBase from '../utils/kanji-base.json';
import jukugoBase from '../utils/jukugo-data.json';

// --- CẤU HÌNH ---
const ITEMS_PER_LESSON = 16;
const TOTAL_LESSONS = 32;

const ChallengePage = () => {
  const navigate = useNavigate();
  const { user, language } = useAppContext(); // ✅ Lấy language từ Context
  
  // ✅ Lấy bộ từ điển ngôn ngữ tương ứng
  const t = translations[language] || translations.vi;
  
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState(null); 
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedLessons, setCompletedLessons] = useState([]); 
  
  // Settings & Game State
  const [settings, setSettings] = useState({ checkMeaning: true, checkReading: true, enableWriting: true, timeMode: 'normal' });
  const [questionCount, setQuestionCount] = useState(30); 
  const [maxAvailableQuestions, setMaxAvailableQuestions] = useState(30); 
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Answer & Timer State
  const [selectedAns, setSelectedAns] = useState(null); 
  const [wrongIndex, setWrongIndex] = useState(null);   
  const [inputValue, setInputValue] = useState("");     
  const [inputStatus, setInputStatus] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const timerRef = useRef(null);
  const inputRef = useRef(null); 

  // Style CSS
  const customStyles = `
    @font-face { font-family: 'DFKai-SB'; src: url('/fonts/dfkai-sb.ttf') format('truetype'); }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-15px); } 75% { transform: translateX(15px); } }
    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    input[type=range] { -webkit-appearance: none; background: transparent; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 24px; width: 24px; border-radius: 50%; background: black; cursor: pointer; margin-top: -10px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 6px; cursor: pointer; background: #e2e8f0; border-radius: 99px; }
    
    /* Ẩn thanh cuộn cho gọn */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  // --- 🔥 1. LOAD USER & TIẾN ĐỘ TỪ SUPABASE 🔥 ---
  useEffect(() => {
    const fetchUserData = async () => {
        const storedJson = localStorage.getItem('session');
        if (storedJson) {
            try {
                const userObj = JSON.parse(storedJson);
                setCurrentUser(userObj); 
                
                const { data, error } = await supabase
                    .from('challenge_progress')
                    .select('lesson_id')
                    .eq('user_id', userObj.id); 

                if (!error && data) {
                    const finishedList = data.map(row => row.lesson_id);
                    setCompletedLessons(finishedList);
                }
            } catch (e) {
                console.error("Lỗi parse user:", e);
            }
        }
    };
    fetchUserData();
  }, []);

  // --- 🔥 2. LƯU ĐIỂM (QUAN TRỌNG NHẤT) 🔥 ---
  useEffect(() => {
    const saveToSupabase = async () => {
        if (isFinished && score > 0 && selectedLesson && currentUser) {
            if (!completedLessons.includes(selectedLesson)) {
                setCompletedLessons(prev => [...prev, selectedLesson]);
            }
            try {
                const { data: existingData } = await supabase
                    .from('challenge_progress')
                    .select('score')
                    .eq('user_id', currentUser.id) 
                    .eq('lesson_id', selectedLesson)
                    .maybeSingle();

                if (!existingData || score > existingData.score) {
                    await supabase.from('challenge_progress').upsert({ 
                        user_id: currentUser.id, 
                        lesson_id: selectedLesson,
                        score: score,
                        completed_at: new Date().toISOString()
                    }, { onConflict: 'user_id, lesson_id' });
                }
            } catch (err) {
                console.error("Lỗi lưu điểm:", err);
            }
        }
    };
    saveToSupabase();
  }, [isFinished, score, selectedLesson, currentUser]);

  // --- LOGIC TÍNH TOÁN MAX CÂU HỎI ---
  useEffect(() => {
    if (!selectedLesson) return;
    const startIndex = (selectedLesson - 1) * ITEMS_PER_LESSON;
    const endIndex = startIndex + ITEMS_PER_LESSON;
    const singleCount = kanjiBase.slice(startIndex, endIndex).length;
    const jukugoCount = jukugoBase.filter(j => j.lesson === selectedLesson).length;
    const totalItems = singleCount + jukugoCount;

    let multiplier = 0;
    if (settings.checkMeaning) multiplier++;
    if (settings.checkReading) multiplier++;

    const maxQ = totalItems * multiplier;
    setMaxAvailableQuestions(maxQ);
    if (questionCount > maxQ) setQuestionCount(maxQ);
    if (questionCount < 16 && maxQ >= 16) setQuestionCount(16);
  }, [selectedLesson, settings.checkMeaning, settings.checkReading]);

  // --- HELPER LOGIC ---
  const parseReadings = (item) => {
    let readings = [];
    if (item.kunyomi && item.kunyomi !== "-") {
        const kuns = item.kunyomi.split(',').map(s => s.split('(')[0].replace(/\./g, '').trim());
        readings.push(...kuns);
    }
    if (item.onyomi && item.onyomi !== "-") {
        const ons = item.onyomi.split(',').map(s => {
            const clean = s.split('(')[0].replace(/\./g, '').trim();
            return wanakana.toHiragana(clean); 
        });
        readings.push(...ons);
    }
    return [...new Set(readings)]; 
  };

  const handleSelectLesson = (id) => {
    setSelectedLesson(id);
    setIsPlaying(false);
    setScore(0);
    setIsFinished(false);
    setQuestionCount(30);
  };

  const handleQuestionCountChange = (e) => setQuestionCount(parseInt(e.target.value) || 0);
  const handleQuestionCountBlur = () => {
    let val = questionCount;
    if (val < 16) val = 16;
    if (val > maxAvailableQuestions) val = maxAvailableQuestions;
    setQuestionCount(val);
  };

  const startGame = () => {
    if (!settings.checkMeaning && !settings.checkReading) {
        alert("Bạn phải chọn ít nhất 1 nội dung kiểm tra!");
        return;
    }
    let timeLimit = 15;
    if (settings.timeMode === 'relaxed') timeLimit = 30;
    if (settings.timeMode === 'fast') timeLimit = 8;
    setMaxTime(timeLimit);
    setTimeLeft(timeLimit);

    const quizData = generateQuizData(selectedLesson);
    if (!quizData) return;
    setQuestions(quizData);
    setCurrentQ(0);
    resetQuestionState();
    setIsPlaying(true);
  };

  const generateQuizData = (lessonId) => {
    const startIndex = (lessonId - 1) * ITEMS_PER_LESSON;
    const endIndex = startIndex + ITEMS_PER_LESSON;
    const singleData = kanjiBase.slice(startIndex, endIndex);
    const compoundData = jukugoBase.filter(j => j.lesson === lessonId);

    if (singleData.length === 0 && compoundData.length === 0) {
      alert("Chưa có dữ liệu bài này!");
      return null;
    }

    let allPossibleQuestions = [];

    const createQuestionObj = (item, typeTarget, isSingle) => {
        const isMeaning = typeTarget === 'meaning';
        const mode = (settings.enableWriting && Math.random() > 0.5) 
            ? (isMeaning ? 'writing_meaning' : 'writing_reading') 
            : (isMeaning ? 'mcq_meaning' : 'mcq_reading');

        let q = {
            question: item.kanji,
            type: mode,
            hint: "",
            options: [],
            correctAnswers: []
        };

        // ✅ Cập nhật Hint theo ngôn ngữ (t)
        if (isMeaning) {
            q.hint = mode === 'writing_meaning' ? t.hint_meaning : t.hint_meaning_mcq;
            const correctArr = isSingle 
                ? [item.hanviet.toLowerCase(), ...item.mean.split(/[,;]/).map(s => s.trim().toLowerCase())]
                : [item.hanviet.toLowerCase(), item.mean.toLowerCase()];
            q.correctAnswers = correctArr;

            if (mode === 'mcq_meaning') {
                const sourceArray = isSingle ? kanjiBase : jukugoBase;
                const distractors = sourceArray
                    .filter(k => k.kanji !== item.kanji)
                    .sort(() => 0.5 - Math.random()).slice(0, 3)
                    .map(d => ({ 
                        text: isSingle ? `${d.hanviet} - ${d.mean}` : d.mean, isCorrect: false 
                    }));
                const correctText = isSingle ? `${item.hanviet} - ${item.mean}` : item.mean;
                q.options = [...distractors, { text: correctText, isCorrect: true }].sort(() => 0.5 - Math.random());
            }
        } else {
            q.hint = mode === 'writing_reading' ? t.hint_reading : t.hint_reading_mcq;
            const correctArr = isSingle ? parseReadings(item) : [item.hiragana];
            q.correctAnswers = correctArr;

            if (mode === 'mcq_reading') {
                const sourceArray = isSingle ? kanjiBase : jukugoBase;
                const distractors = sourceArray
                    .filter(k => k.kanji !== item.kanji)
                    .sort(() => 0.5 - Math.random()).slice(0, 3)
                    .map(d => {
                        let txt = isSingle ? parseReadings(d).join(' / ') : d.hiragana;
                        return { text: txt, isCorrect: false };
                    });
                const displayTxt = isSingle ? correctArr.join(' / ') : item.hiragana;
                q.options = [...distractors, { text: displayTxt, isCorrect: true }].sort(() => 0.5 - Math.random());
            }
        }
        return q;
    };

    singleData.forEach(item => {
        if (settings.checkMeaning) allPossibleQuestions.push({ q: createQuestionObj(item, 'meaning', true), isCore: true });
        if (settings.checkReading) allPossibleQuestions.push({ q: createQuestionObj(item, 'reading', true), isCore: true });
    });
    compoundData.forEach(item => {
        if (settings.checkMeaning) allPossibleQuestions.push({ q: createQuestionObj(item, 'meaning', false), isCore: false });
        if (settings.checkReading) allPossibleQuestions.push({ q: createQuestionObj(item, 'reading', false), isCore: false });
    });

    allPossibleQuestions.sort(() => 0.5 - Math.random());
    const coreQuestions = allPossibleQuestions.filter(i => i.isCore);
    const extraQuestions = allPossibleQuestions.filter(i => !i.isCore);
    let prioritizedList = [...coreQuestions, ...extraQuestions];
    let finalSet = prioritizedList.slice(0, questionCount).map(i => i.q);

    return finalSet.sort(() => 0.5 - Math.random());
  };

  const resetQuestionState = () => {
    setSelectedAns(null);
    setWrongIndex(null);
    setInputValue("");
    setInputStatus(null);
  };

  useEffect(() => {
    if (isPlaying && !isFinished && selectedAns === null && inputStatus === null) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, isFinished, selectedAns, inputStatus, currentQ]);

  useEffect(() => {
    if (timeLeft === 0 && selectedAns === null && inputStatus === null && isPlaying && !isFinished) {
       handleTimeOut();
    }
  }, [timeLeft]);

  useEffect(() => {
    if (questions[currentQ]?.type.includes('writing') && !inputStatus) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentQ, questions]);

  const handleTimeOut = () => {
    clearInterval(timerRef.current); 
    if (questions[currentQ].type.includes('writing')) setInputStatus('wrong'); 
    else setSelectedAns(false); 
    goToNextQuestion();
  };

  const handleMCQAnswer = (isCorrect, index) => {
    if (selectedAns !== null) return; 
    clearInterval(timerRef.current);
    setSelectedAns(isCorrect);
    if (isCorrect) setScore(s => s + 10);
    else setWrongIndex(index);
    goToNextQuestion();
  };

  const handleWritingSubmit = (e) => {
    e.preventDefault();
    if (inputStatus) return; 
    clearInterval(timerRef.current);

    const userVal = inputValue.toLowerCase().trim();
    const userValKana = wanakana.toHiragana(userVal);

    const isCorrect = questions[currentQ].correctAnswers.some(ans => 
        ans === userVal ||            
        ans === userValKana ||        
        userVal.includes(ans)         
    );

    if (isCorrect) { 
        setScore(s => s + 10); 
        setInputStatus('correct'); 
    } else { 
        setInputStatus('wrong'); 
    }
    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        resetQuestionState();
        setTimeLeft(maxTime); 
      } else {
        setIsFinished(true);
      }
    }, 2500); 
  };

  // --- RENDER ---
  return (
    <div className="h-screen w-screen bg-[#f8f9fa] flex flex-col font-sans overflow-hidden relative select-none">
      <style>{customStyles}</style>

      {/* 1. MENU CHỌN BÀI */}
      {!selectedLesson ? (
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center no-scrollbar">
             <div className="w-full max-w-7xl">
                
                {/* --- 🔥 NÚT QUAY LẠI TRANG CHỦ ĐẸP HƠN 🔥 --- */}
                <button 
                    onClick={() => navigate('/')} 
                    className="mb-8 group flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-gray-300 hover:-translate-x-1 transition-all duration-300 ease-out"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-black transition-colors">
                            <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    {/* ✅ Cập nhật: t.back */}
                    <span className="font-bold text-gray-500 uppercase tracking-widest text-sm group-hover:text-black">{t.back}</span>
                </button>

                {/* ✅ Cập nhật: t.challenge_title */}
                <h1 className="text-6xl font-black text-slate-800 mb-10 uppercase">{t.challenge_title}</h1>
                
                {/* Lưới Level */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 pb-10">
                {Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1).map((num) => {
                    const isDone = completedLessons.includes(num); 
                    return (
                        <button key={num} onClick={() => handleSelectLesson(num)} className={`aspect-square bg-white border-2 rounded-[2rem] flex flex-col items-center justify-center transition-all shadow-sm active:scale-95 group relative overflow-hidden ${isDone ? 'border-green-400 shadow-green-100' : 'border-gray-200 hover:border-black'}`}>
                            {isDone && (<div className="absolute top-2 right-2 text-green-500 bg-green-100 rounded-full p-1 text-xs font-bold w-6 h-6 flex items-center justify-center">✓</div>)}
                            <span className={`text-4xl font-black mb-1 transition-transform group-hover:scale-110 ${isDone ? 'text-green-600' : 'text-black'}`}>{num}</span>
                            {/* ✅ Cập nhật: t.challenge_level */}
                            <span className={`text-[10px] font-bold uppercase opacity-50 ${isDone ? 'text-green-500' : 'text-gray-400'}`}>{t.challenge_level}</span>
                        </button>
                    );
                })}
                </div>
             </div>
        </div>
      ) : !isPlaying ? (
        // 2. LOBBY
        <div className="flex-1 flex items-center justify-center animate-fade-in-up p-4">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl w-full max-w-2xl border border-gray-100 relative">
                {/* ✅ Cập nhật: t.challenge_quit */}
                <button onClick={() => setSelectedLesson(null)} className="absolute top-8 left-8 text-gray-400 font-bold hover:text-black">✕ {t.challenge_quit}</button>
                {/* ✅ Cập nhật: t.challenge_config_title */}
                <h2 className="text-4xl font-black text-slate-800 mb-2 text-center uppercase">{t.challenge_config_title}</h2>
                {completedLessons.includes(selectedLesson) && (<div className="bg-green-50 text-green-700 text-center py-2 rounded-xl font-bold mb-4 text-sm border border-green-100">✨ Bạn đã chinh phục bài này!</div>)}
                {/* ✅ Cập nhật: t.challenge_lesson_prefix */}
                <p className="text-center text-gray-500 mb-6 font-medium">{t.challenge_lesson_prefix} {selectedLesson}</p>

                <div className="space-y-5">
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                         <div className="flex justify-between items-center mb-4">
                            {/* ✅ Cập nhật: t.challenge_question_count */}
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{t.challenge_question_count}</div>
                            <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-indigo-100 shadow-sm">
                                <input type="number" value={questionCount} onChange={handleQuestionCountChange} onBlur={handleQuestionCountBlur} className="w-10 font-black text-right outline-none text-indigo-600" />
                                <span className="text-gray-400 font-bold text-xs">/ {maxAvailableQuestions}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                             <span className="text-xs font-bold text-gray-400">16</span>
                             <input type="range" min="16" max={maxAvailableQuestions} value={questionCount} onChange={handleQuestionCountChange} className="flex-1 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer" />
                             <span className="text-xs font-bold text-gray-400">{maxAvailableQuestions}</span>
                         </div>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                        {/* ✅ Cập nhật: t.challenge_content */}
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t.challenge_content}</div>
                        <div className="flex gap-4">
                            {/* ✅ Cập nhật: t.challenge_meaning */}
                            <button onClick={() => setSettings(s => ({...s, checkMeaning: !s.checkMeaning}))} className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${settings.checkMeaning ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-400 border-gray-200'}`}>📖 {t.challenge_meaning}</button>
                            {/* ✅ Cập nhật: t.challenge_reading */}
                            <button onClick={() => setSettings(s => ({...s, checkReading: !s.checkReading}))} className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${settings.checkReading ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-400 border-gray-200'}`}>🗣️ {t.challenge_reading}</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between">
                             {/* ✅ Cập nhật: t.challenge_typing_mode */}
                             <div className="font-bold text-slate-800 text-sm mb-2">{t.challenge_typing_mode}</div>
                             <div className="flex justify-between items-center">
                                 <span className="text-xs text-gray-400 font-bold">{settings.enableWriting ? 'BẬT' : 'TẮT'}</span>
                                 <div onClick={() => setSettings(s => ({...s, enableWriting: !s.enableWriting}))} className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${settings.enableWriting ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.enableWriting ? 'translate-x-5' : ''}`}></div>
                                 </div>
                             </div>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-between">
                             {/* ✅ Cập nhật: t.challenge_speed */}
                             <div className="font-bold text-slate-800 text-sm mb-2">{t.challenge_speed}</div>
                             <div className="flex gap-1">
                                {[{id: 'relaxed', label: '🐢'}, {id: 'normal', label: '⚖️'}, {id: 'fast', label: '⚡'}].map(opt => (
                                    <button key={opt.id} onClick={() => setSettings(s => ({...s, timeMode: opt.id}))} className={`flex-1 py-1 rounded-lg border transition-all text-sm ${settings.timeMode === opt.id ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>{opt.label}</button>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
                {/* ✅ Cập nhật: t.challenge_start_btn */}
                <button onClick={startGame} className="w-full mt-6 py-5 bg-black text-white rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-gray-800 shadow-xl shadow-slate-300 active:scale-95 transition-transform">{t.challenge_start_btn} ({questionCount} Câu) ⚔️</button>
            </div>
        </div>

      ) : (
        // 3. GAMEPLAY
        <div className="flex-1 flex flex-col h-full w-full max-w-[90rem] mx-auto px-4 py-4 md:py-6">
          <div className="flex justify-between items-center mb-4 border-b-2 border-gray-100 pb-4">
             {/* ✅ Cập nhật: t.challenge_quit */}
             <button onClick={() => setSelectedLesson(null)} className="px-5 py-2 bg-white border rounded-xl font-bold text-xs uppercase hover:bg-red-50 hover:border-red-200 text-gray-500 hover:text-red-500 transition-all">✕ {t.challenge_quit}</button>
             {!isFinished && (
               <div className="flex-1 mx-8 max-w-xl">
                 {/* ✅ Cập nhật: t.challenge_time */}
                 <div className="flex justify-between text-xs font-black text-gray-400 mb-1 uppercase tracking-widest"><span>{t.challenge_time}</span><span className={timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-indigo-500"}>{timeLeft}s</span></div>
                 <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / maxTime) * 100}%` }}></div></div>
               </div>
             )}
             {/* ✅ Cập nhật: t.challenge_score */}
             <div className="text-right"><div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.challenge_score}</div><div className="text-3xl font-black text-indigo-600">{score}</div></div>
          </div>

          {!isFinished && questions.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center gap-6">
               <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3rem] shadow-xl border-2 border-gray-50 relative p-4">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gray-100"><div className="h-full bg-green-500 transition-all" style={{ width: `${((currentQ)/questions.length)*100}%` }}></div></div>
                  {/* ✅ Cập nhật: t.challenge_question_no */}
                  <span className="mb-2 px-4 py-1 bg-gray-100 rounded-full text-xs font-black text-gray-400 uppercase tracking-widest">{t.challenge_question_no} {currentQ + 1} / {questions.length}</span>
                  <h1 className="text-[8rem] md:text-[11rem] leading-none text-slate-800 mb-4 drop-shadow-md transition-all select-none" style={{ fontFamily: "'DFKai-SB', serif" }}>{questions[currentQ].question}</h1>
                  <div className={`px-6 py-2 rounded-2xl font-black text-lg uppercase tracking-widest border-2 shadow-sm ${questions[currentQ].type.includes('writing') ? 'bg-purple-50 text-purple-600 border-purple-100' : questions[currentQ].hint.includes('NGHĨA') ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{questions[currentQ].hint}</div>
               </div>
               
               <div className="h-56 md:h-72">
                 {questions[currentQ].type.includes('writing') ? (
                   <form onSubmit={handleWritingSubmit} className="h-full flex flex-col gap-4 animate-fade-in-up max-w-3xl mx-auto w-full">
                      <input 
                          ref={inputRef} 
                          type="text" 
                          value={inputValue} 
                          onChange={(e) => setInputValue(e.target.value)} 
                          disabled={inputStatus !== null} 
                          // ✅ Cập nhật placeholder
                          placeholder={questions[currentQ].type === 'writing_reading' ? t.challenge_input_placeholder_reading : t.challenge_input_placeholder_meaning} 
                          className={`w-full flex-1 text-center text-4xl md:text-5xl font-bold rounded-[2rem] border-4 outline-none transition-all placeholder:text-gray-300 placeholder:text-2xl placeholder:font-normal leading-loose py-4 ${inputStatus === 'correct' ? 'border-green-500 bg-green-50 text-green-700' : inputStatus === 'wrong' ? 'border-red-500 bg-red-50 text-red-700 animate-shake' : 'border-gray-200 focus:border-indigo-500 text-slate-800 focus:bg-white'}`} 
                      />
                      {inputStatus === 'wrong' ? (
                          <div className="h-20 flex flex-col items-center justify-center bg-red-50 rounded-2xl border-2 border-red-200 text-red-600 font-bold animate-pulse px-4">
                              {/* ✅ Cập nhật: t.challenge_correct_answer */}
                              <span className="text-[10px] uppercase opacity-70">{t.challenge_correct_answer}:</span>
                              <span className="text-xl md:text-3xl">{questions[currentQ].correctAnswers.join(' / ').toUpperCase()}</span>
                          </div>
                      ) : (
                          // ✅ Cập nhật: t.challenge_check_btn
                          <button type="submit" disabled={!inputValue || inputStatus !== null} className="h-20 bg-black text-white rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95">{t.challenge_check_btn}</button>
                      )}
                   </form>
                 ) : (
                   <div className="h-full grid grid-cols-2 md:grid-cols-4 gap-4">
                      {questions[currentQ].options.map((opt, idx) => {
                        let colorStyle = "bg-white text-slate-600 border-gray-200 hover:border-gray-300 hover:text-black";
                        if (selectedAns !== null) {
                          if (opt.isCorrect) colorStyle = "bg-green-500 text-white border-green-700 scale-[1.02] shadow-xl z-10";
                          else if (idx === wrongIndex) colorStyle = "bg-red-500 text-white border-red-700 animate-shake z-10";
                          else colorStyle = "opacity-30 grayscale cursor-not-allowed";
                        }
                        return (<button key={idx} onClick={() => handleMCQAnswer(opt.isCorrect, idx)} disabled={selectedAns !== null} className={`h-full rounded-3xl font-bold text-xl md:text-2xl border-b-[6px] active:scale-95 transition-all flex items-center justify-center px-4 text-center leading-tight ${colorStyle}`}>{opt.text}</button>);
                      })}
                   </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center animate-fade-in-up">
               <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center w-full max-w-2xl border-2 border-gray-100">
                  <div className="text-[7rem] mb-6">{score >= (questions.length*10*0.8) ? '👑' : score >= (questions.length*10*0.5) ? '🔥' : '💀'}</div>
                  {/* ✅ Cập nhật: t.challenge_finished_title */}
                  <h2 className="text-5xl font-black text-slate-800 mb-4 uppercase tracking-tighter">{t.challenge_finished_title}</h2>
                  {/* ✅ Cập nhật: t.challenge_score_result */}
                  <p className="text-2xl text-gray-500 mb-10 font-medium">{t.challenge_score_result} <b className="text-indigo-600 text-5xl">{score}</b> / {questions.length * 10} điểm</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* ✅ Cập nhật: t.challenge_menu_btn */}
                    <button onClick={() => setSelectedLesson(null)} className="py-5 bg-gray-100 rounded-3xl font-black text-gray-600 uppercase tracking-wide border-b-4 border-gray-200 hover:bg-gray-200">{t.challenge_menu_btn}</button>
                    {/* ✅ Cập nhật: t.challenge_replay_btn */}
                    <button onClick={() => { setIsFinished(false); startGame(); }} className="py-5 bg-black text-white rounded-3xl font-black uppercase tracking-wide shadow-xl shadow-indigo-200 border-b-4 border-gray-800 hover:bg-gray-800 active:scale-95">{t.challenge_replay_btn} ↻</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChallengePage;