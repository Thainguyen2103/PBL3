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
                    const scoreToAdd = existingData ? (score - existingData.score) : score;
                    
                    await supabase.from('challenge_progress').upsert({ 
                        user_id: currentUser.id, 
                        lesson_id: selectedLesson,
                        score: score,
                        completed_at: new Date().toISOString()
                    }, { onConflict: 'user_id, lesson_id' });
                    
                    // 📊 Cập nhật daily_stats - tracking theo ngày
                    if (scoreToAdd > 0) {
                        const today = new Date().toISOString().split('T')[0];
                        const { data: existingStat } = await supabase
                            .from('daily_stats')
                            .select('id, challenge_score')
                            .eq('user_id', currentUser.id)
                            .eq('stat_date', today)
                            .maybeSingle();
                        
                        if (existingStat) {
                            await supabase.from('daily_stats').update({
                                challenge_score: (existingStat.challenge_score || 0) + scoreToAdd
                            }).eq('id', existingStat.id);
                        } else {
                            await supabase.from('daily_stats').insert({
                                user_id: currentUser.id,
                                stat_date: today,
                                challenge_score: scoreToAdd
                            });
                        }
                    }
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
        <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center no-scrollbar bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/30">
             <div className="w-full max-w-7xl">
                
                {/* Header Section */}
                <div className="mb-12 space-y-6">
                    <button 
                        onClick={() => navigate('/')} 
                        className="group flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-md hover:shadow-xl hover:border-gray-300 hover:-translate-x-2 hover:scale-105 transition-all duration-300 ease-out"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-slate-800 group-hover:to-slate-900 transition-all duration-300">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500 group-hover:text-white transition-colors">
                                <path d="M19 12H5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <span className="font-black text-gray-600 uppercase tracking-wider text-sm group-hover:text-slate-900 transition-colors">{t.back}</span>
                    </button>

                    {/* Title with animated gradient */}
                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl"></div>
                        <h1 className="relative text-6xl md:text-7xl font-black mb-3 uppercase tracking-tight bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 bg-clip-text text-transparent drop-shadow-sm">
                            {t.challenge_title}
                        </h1>
                        <div className="h-2 w-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg shadow-indigo-200"></div>
                    </div>

                    {/* Stats bar */}
                    <div className="flex items-center gap-4 p-5 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                                <span className="text-2xl">✓</span>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t.challenge_completed_count}</div>
                                <div className="text-2xl font-black text-green-600">{completedLessons.length}</div>
                            </div>
                        </div>
                        <div className="h-12 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t.challenge_total_lessons}</div>
                                <div className="text-2xl font-black text-indigo-600">{TOTAL_LESSONS}</div>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <div className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white font-bold text-sm shadow-lg">
                                {Math.round((completedLessons.length / TOTAL_LESSONS) * 100)}% {t.challenge_progress}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Lưới Level với thiết kế mới */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 pb-10">
                {Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1).map((num) => {
                    const isDone = completedLessons.includes(num); 
                    return (
                        <button 
                            key={num} 
                            onClick={() => handleSelectLesson(num)} 
                            className={`group aspect-square rounded-3xl flex flex-col items-center justify-center transition-all duration-300 active:scale-90 relative overflow-hidden ${
                                isDone 
                                ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-200 hover:shadow-2xl hover:shadow-green-300' 
                                : 'bg-white border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-indigo-400 hover:-translate-y-1'
                            }`}
                        >
                            {/* Background pattern for completed */}
                            {isDone && (
                                <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent_50%)]"></div>
                            )}
                            
                            {/* Checkmark badge */}
                            {isDone && (
                                <div className="absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg z-10 animate-bounce">
                                    <span className="text-green-500 text-lg font-black">✓</span>
                                </div>
                            )}
                            
                            {/* Number */}
                            <span className={`text-4xl md:text-5xl font-black mb-1 transition-all duration-300 relative z-10 ${
                                isDone 
                                ? 'text-white drop-shadow-lg group-hover:scale-125' 
                                : 'text-slate-800 group-hover:scale-125 group-hover:text-indigo-600'
                            }`}>
                                {num}
                            </span>
                            
                            {/* Label */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider relative z-10 ${
                                isDone 
                                ? 'text-white/90' 
                                : 'text-gray-400 group-hover:text-indigo-500'
                            }`}>
                                {t.challenge_level}
                            </span>

                            {/* Hover effect overlay */}
                            {!isDone && (
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all duration-300"></div>
                            )}
                        </button>
                    );
                })}
                </div>
             </div>
        </div>
      ) : !isPlaying ? (
        // 2. LOBBY
        <div className="flex-1 flex items-center justify-center p-3 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 overflow-y-auto">
            <div className="w-full max-w-2xl my-4">
                {/* Header Section với Gradient */}
                <div className="relative mb-3">
                    <button 
                        onClick={() => setSelectedLesson(null)} 
                        className="group absolute -top-1 left-0 flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300"
                    >
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-xs font-bold text-gray-500 group-hover:text-black transition-colors">{t.challenge_quit}</span>
                    </button>

                    {/* Lesson Badge */}
                    <div className="flex flex-col items-center pt-6">
                        <div className="relative mb-2">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 transform hover:scale-105 transition-transform">
                                <span className="text-3xl font-black text-white">{selectedLesson}</span>
                            </div>
                            {completedLessons.includes(selectedLesson) && (
                                <div className="absolute -top-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                    <span className="text-sm">✓</span>
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-1 uppercase tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            {t.challenge_config_title}
                        </h2>
                        <p className="text-gray-500 font-medium text-sm">{t.challenge_lesson_prefix} {selectedLesson}</p>
                        {completedLessons.includes(selectedLesson) && (
                            <div className="mt-2 px-4 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full font-bold text-xs shadow-lg shadow-green-200 flex items-center gap-1">
                                <span>✨</span>
                                <span>Đã chinh phục!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Settings Cards */}
                <div className="space-y-3">
                    {/* Số câu hỏi */}
                    <div className="group bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                        <span className="text-lg">📝</span>
                                    </div>
                                    <div className="text-white font-bold uppercase tracking-wider text-xs">{t.challenge_question_count}</div>
                                </div>
                                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-lg">
                                    <input 
                                        type="number" 
                                        value={questionCount} 
                                        onChange={handleQuestionCountChange} 
                                        onBlur={handleQuestionCountBlur} 
                                        className="w-10 font-black text-right outline-none text-indigo-600 bg-transparent text-base" 
                                    />
                                    <span className="text-gray-400 font-bold text-xs">/ {maxAvailableQuestions}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-white/70">16</span>
                                <div className="flex-1 relative">
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{width: `${(questionCount / maxAvailableQuestions) * 100}%`}}></div>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="16" 
                                        max={maxAvailableQuestions} 
                                        value={questionCount} 
                                        onChange={handleQuestionCountChange} 
                                        className="absolute inset-0 w-full opacity-0 cursor-pointer" 
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-white/70">{maxAvailableQuestions}</span>
                            </div>
                        </div>
                    </div>

                    {/* Nội dung kiểm tra */}
                    <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-md">
                                <span className="text-base">🎯</span>
                            </div>
                            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">{t.challenge_content}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setSettings(s => ({...s, checkMeaning: !s.checkMeaning}))} 
                                className={`group relative py-3 px-3 rounded-xl font-bold border-2 transition-all duration-300 overflow-hidden text-sm ${
                                    settings.checkMeaning 
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-lg">📖</span>
                                    <span>{t.challenge_meaning}</span>
                                </div>
                                {settings.checkMeaning && (
                                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                                        <span className="text-[10px]">✓</span>
                                    </div>
                                )}
                            </button>
                            <button 
                                onClick={() => setSettings(s => ({...s, checkReading: !s.checkReading}))} 
                                className={`group relative py-3 px-3 rounded-xl font-bold border-2 transition-all duration-300 overflow-hidden text-sm ${
                                    settings.checkReading 
                                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200' 
                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="text-lg">🗣️</span>
                                    <span>{t.challenge_reading}</span>
                                </div>
                                {settings.checkReading && (
                                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                                        <span className="text-[10px]">✓</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Cài đặt nâng cao */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Chế độ gõ */}
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                    <span className="text-sm">⌨️</span>
                                </div>
                                <div className="font-bold text-slate-800 text-xs">{t.challenge_typing_mode}</div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${settings.enableWriting ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                    {settings.enableWriting ? 'BẬT' : 'TẮT'}
                                </span>
                                <div 
                                    onClick={() => setSettings(s => ({...s, enableWriting: !s.enableWriting}))} 
                                    className={`w-11 h-6 rounded-full p-0.5 cursor-pointer transition-all duration-300 ${
                                        settings.enableWriting ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-200' : 'bg-gray-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${settings.enableWriting ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Tốc độ */}
                        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                                    <span className="text-sm">⚡</span>
                                </div>
                                <div className="font-bold text-slate-800 text-xs">{t.challenge_speed}</div>
                            </div>
                            <div className="flex gap-1.5">
                                {[{id: 'relaxed', label: '🐢', color: 'blue'}, {id: 'normal', label: '⚖️', color: 'gray'}, {id: 'fast', label: '⚡', color: 'red'}].map(opt => (
                                    <button 
                                        key={opt.id} 
                                        onClick={() => setSettings(s => ({...s, timeMode: opt.id}))} 
                                        className={`flex-1 py-1.5 rounded-lg border-2 transition-all duration-300 text-base ${
                                            settings.timeMode === opt.id 
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-lg transform scale-105' 
                                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Start Button */}
                <button 
                    onClick={startGame} 
                    className="w-full mt-4 py-4 bg-gradient-to-r from-slate-800 via-slate-900 to-black text-white rounded-xl font-black text-lg uppercase tracking-widest hover:shadow-2xl hover:shadow-slate-400 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 border-4 border-white shadow-xl"
                >
                    <span className="text-2xl">⚔️</span>
                    <span>{t.challenge_start_btn}</span>
                    <span className="px-2 py-0.5 bg-white/20 rounded-lg text-xs">
                        {questionCount} Câu
                    </span>
                </button>
            </div>
        </div>

      ) : (
        // 3. GAMEPLAY
        <div className="flex-1 flex flex-col h-full w-full max-w-6xl mx-auto px-3 py-3">
          {/* Header Bar */}
          <div className="flex justify-between items-center mb-3 pb-3 border-b-2 border-gray-100/50 bg-gradient-to-r from-white/50 to-gray-50/50 backdrop-blur-sm rounded-xl px-4 py-2">
             <button 
                onClick={() => setSelectedLesson(null)} 
                className="group flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-gray-200 rounded-lg font-bold text-[10px] uppercase hover:bg-red-50 hover:border-red-300 text-gray-500 hover:text-red-600 transition-all shadow-sm active:scale-95"
             >
                <span className="text-sm">✕</span>
                <span>{t.challenge_quit}</span>
             </button>
             
             {!isFinished && (
               <div className="flex-1 mx-6 max-w-md">
                 <div className="flex justify-between text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wider">
                    <span>{t.challenge_time}</span>
                    <span className={timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-indigo-500"}>{timeLeft}s</span>
                 </div>
                 <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
                    <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`} style={{ width: `${(timeLeft / maxTime) * 100}%` }}></div>
                 </div>
               </div>
             )}
             
             <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-indigo-100 shadow-sm">
                <div className="text-right">
                   <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.challenge_score}</div>
                   <div className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{score}</div>
                </div>
             </div>
          </div>

          {!isFinished && questions.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center gap-4">
               {/* Question Display Card */}
               <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50/50 rounded-3xl shadow-2xl border-2 border-gray-100 relative p-4 overflow-hidden">
                  {/* Progress bar */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
                     <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all shadow-lg shadow-green-200" style={{ width: `${((currentQ)/questions.length)*100}%` }}></div>
                  </div>
                  
                  {/* Question counter badge */}
                  <div className="mb-3 px-4 py-1 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full shadow-inner">
                     <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{t.challenge_question_no} {currentQ + 1} / {questions.length}</span>
                  </div>
                  
                  {/* Kanji */}
                  <h1 className="text-[5.5rem] leading-none text-slate-800 mb-3 drop-shadow-lg transition-all select-none" style={{ fontFamily: "'DFKai-SB', serif" }}>
                     {questions[currentQ].question}
                  </h1>
                  
                  {/* Hint badge */}
                  <div className={`px-5 py-1.5 rounded-xl font-black text-sm uppercase tracking-widest border-2 shadow-md ${
                     questions[currentQ].type.includes('writing') 
                     ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 border-purple-200' 
                     : questions[currentQ].hint.includes('NGHĨA') 
                     ? 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-600 border-blue-200' 
                     : 'bg-gradient-to-r from-orange-50 to-yellow-50 text-orange-600 border-orange-200'
                  }`}>
                     {questions[currentQ].hint}
                  </div>
               </div>
               
               {/* Answer Section */}
               <div className="h-48">
                 {questions[currentQ].type.includes('writing') ? (
                   <form onSubmit={handleWritingSubmit} className="h-full flex flex-col gap-3 animate-fade-in-up max-w-3xl mx-auto w-full">
                      <input 
                          ref={inputRef} 
                          type="text" 
                          value={inputValue} 
                          onChange={(e) => setInputValue(e.target.value)} 
                          disabled={inputStatus !== null} 
                          placeholder={questions[currentQ].type === 'writing_reading' ? t.challenge_input_placeholder_reading : t.challenge_input_placeholder_meaning} 
                          className={`w-full flex-1 text-center text-3xl font-bold rounded-2xl border-4 outline-none transition-all placeholder:text-gray-300 placeholder:text-lg placeholder:font-normal leading-loose py-3 shadow-lg ${
                             inputStatus === 'correct' 
                             ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 text-green-700 shadow-green-200' 
                             : inputStatus === 'wrong' 
                             ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 text-red-700 animate-shake shadow-red-200' 
                             : 'border-gray-200 focus:border-indigo-500 text-slate-800 focus:bg-white hover:border-gray-300'
                          }`} 
                      />
                      {inputStatus === 'wrong' ? (
                          <div className="h-16 flex flex-col items-center justify-center bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border-2 border-red-200 text-red-600 font-bold animate-pulse px-4 shadow-lg">
                              <span className="text-[9px] uppercase opacity-70">{t.challenge_correct_answer}:</span>
                              <span className="text-lg font-black">{questions[currentQ].correctAnswers.join(' / ').toUpperCase()}</span>
                          </div>
                      ) : (
                          <button 
                             type="submit" 
                             disabled={!inputValue || inputStatus !== null} 
                             className="h-16 bg-gradient-to-r from-slate-800 via-slate-900 to-black text-white rounded-xl font-black text-lg uppercase tracking-widest hover:shadow-2xl hover:shadow-slate-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale shadow-xl transition-all active:scale-95 border-2 border-white/10"
                          >
                             {t.challenge_check_btn}
                          </button>
                      )}
                   </form>
                 ) : (
                   <div className="h-full grid grid-cols-2 md:grid-cols-4 gap-3">
                      {questions[currentQ].options.map((opt, idx) => {
                        let colorStyle = "bg-white text-slate-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 shadow-md hover:shadow-lg";
                        if (selectedAns !== null) {
                          if (opt.isCorrect) colorStyle = "bg-gradient-to-br from-green-400 to-emerald-500 text-white border-green-600 scale-[1.03] shadow-2xl shadow-green-300 z-10";
                          else if (idx === wrongIndex) colorStyle = "bg-gradient-to-br from-red-400 to-pink-500 text-white border-red-600 animate-shake shadow-2xl shadow-red-300 z-10";
                          else colorStyle = "opacity-30 grayscale cursor-not-allowed";
                        }
                        return (
                           <button 
                              key={idx} 
                              onClick={() => handleMCQAnswer(opt.isCorrect, idx)} 
                              disabled={selectedAns !== null} 
                              className={`h-full rounded-2xl font-bold text-base border-2 border-b-4 active:scale-95 transition-all flex items-center justify-center px-3 text-center leading-tight ${colorStyle}`}
                           >
                              {opt.text}
                           </button>
                        );
                      })}
                   </div>
                 )}
               </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center animate-fade-in-up p-4">
               <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-3xl shadow-2xl text-center w-full max-w-xl border-2 border-gray-100">
                  {/* Emoji with gradient background */}
                  <div className="mb-4 relative">
                     <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/50 via-purple-200/50 to-pink-200/50 blur-2xl rounded-full"></div>
                     <div className="relative text-[5rem]">{score >= (questions.length*10*0.8) ? '👑' : score >= (questions.length*10*0.5) ? '🔥' : '💀'}</div>
                  </div>
                  
                  <h2 className="text-3xl font-black mb-3 uppercase tracking-tight bg-gradient-to-r from-slate-800 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                     {t.challenge_finished_title}
                  </h2>
                  
                  <p className="text-lg text-gray-500 mb-6 font-medium">
                     {t.challenge_score_result} 
                     <span className="block mt-2">
                        <b className="text-4xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{score}</b>
                        <span className="text-gray-400 text-base"> / {questions.length * 10} điểm</span>
                     </span>
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                       onClick={() => setSelectedLesson(null)} 
                       className="py-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl font-black text-gray-600 uppercase tracking-wide text-sm border-2 border-gray-300 border-b-4 hover:bg-gray-200 shadow-md hover:shadow-lg active:scale-95 transition-all"
                    >
                       {t.challenge_menu_btn}
                    </button>
                    <button 
                       onClick={() => { setIsFinished(false); startGame(); }} 
                       className="py-3 bg-gradient-to-r from-slate-800 via-slate-900 to-black text-white rounded-xl font-black uppercase tracking-wide text-sm shadow-xl shadow-slate-300 border-2 border-white/10 border-b-4 border-b-slate-950 hover:shadow-2xl active:scale-95 transition-all"
                    >
                       {t.challenge_replay_btn} ↻
                    </button>
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