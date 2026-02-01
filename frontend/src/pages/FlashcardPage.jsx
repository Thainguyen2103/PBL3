import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient'; 
import kanjiBase from '../utils/kanji-base.json';
import jukugoBase from '../utils/jukugo-data.json';
import { translations } from '../utils/translations'; // Import trực tiếp

// --- BỘ ICON SVG GỌN ĐẸP ---
const Icons = {
    back: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>,
    reload: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    forgot: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
    hard: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    good: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>,
    easy: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    master: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    card: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, t }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in text-center">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-up border border-gray-100">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">{Icons.reload}</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3.5 rounded-2xl font-black text-gray-400 hover:bg-gray-50 transition-all uppercase text-xs tracking-widest">{t.modal_btn_cancel}</button>
                    <button onClick={onConfirm} className="flex-1 py-3.5 rounded-2xl font-black bg-slate-900 text-white hover:bg-slate-800 shadow-lg transition-all uppercase text-xs tracking-widest">{t.modal_btn_confirm}</button>
                </div>
            </div>
        </div>
    );
};

const FlashcardPage = () => {
  const navigate = useNavigate();
  const { user, language } = useAppContext();
  // ✅ Lấy đúng translation object
  const t = translations[language] || translations.vi;

  const ITEMS_PER_LESSON = 16; 

  const [mode, setMode] = useState('menu'); 
  const [deckType, setDeckType] = useState('single'); 
  const [currentLesson, setCurrentLesson] = useState(null);
  const [queue, setQueue] = useState([]); 
  const [isFlipped, setIsFlipped] = useState(false);   
  const [finished, setFinished] = useState(false);     
  const [stats, setStats] = useState({ review: 0, mastered: 0 }); 
  const [sessionTotal, setSessionTotal] = useState(0); 
  const [lessonToReview, setLessonToReview] = useState(null);
  const [masteredList, setMasteredList] = useState([]);
  const [completedLessons, setCompletedLessons] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.id) return;
      setLoadingProgress(true);
      const { data } = await supabase.from('users').select('mastered_kanji, mastered_jukugo, completed_kanji_lessons, completed_jukugo_lessons').eq('id', user.id).single();
      if (data) {
        if (deckType === 'single') {
          setMasteredList(data.mastered_kanji || []);
          const map = {}; (data.completed_kanji_lessons || []).forEach(id => map[id] = true);
          setCompletedLessons(map);
        } else {
          setMasteredList(data.mastered_jukugo || []);
          const map = {}; (data.completed_jukugo_lessons || []).forEach(id => map[id] = true);
          setCompletedLessons(map);
        }
      }
      setLoadingProgress(false);
    };
    fetchProgress();
  }, [user, deckType]);

  const generatedLessons = useMemo(() => {
    let lessons = [];
    if (deckType === 'single') {
        for (let i = 0; i < kanjiBase.length; i += ITEMS_PER_LESSON) {
            const chunk = kanjiBase.slice(i, i + ITEMS_PER_LESSON);
            const num = Math.floor(i / ITEMS_PER_LESSON) + 1;
            lessons.push({ id: num, title: `${t.flashcard_lesson} ${num}`, desc: { start: chunk[0]?.kanji, end: chunk[chunk.length - 1]?.kanji }, originalCards: chunk });
        }
    } else {
        const grouped = {};
        jukugoBase.forEach(item => {
            if (!grouped[item.lesson]) grouped[item.lesson] = [];
            grouped[item.lesson].push(item);
        });
        Object.keys(grouped).sort((a,b) => a - b).forEach(id => {
            lessons.push({ id: parseInt(id), title: `${t.flashcard_lesson} ${id}`, desc: { start: grouped[id][0]?.kanji, end: grouped[id][grouped[id].length - 1]?.kanji }, originalCards: grouped[id] });
        });
    }
    return lessons;
  }, [deckType, t.flashcard_lesson]);

  const prepareGame = (lesson, isReview) => {
      const cards = isReview ? lesson.originalCards : lesson.originalCards.filter(card => !masteredList.includes(card.kanji));
      setCurrentLesson(lesson);
      setStats({ review: 0, mastered: 0 });
      setFinished(false);
      setIsFlipped(false);
      setMode('game');
      setSessionTotal(cards.length);
      setQueue(cards.length === 0 ? [] : [...cards].sort(() => 0.5 - Math.random()));
      if (cards.length === 0) setFinished(true);
      setLessonToReview(null);
  };

  const handleRate = (level) => {
      const currentCard = queue[0];
      setIsFlipped(false);
      setTimeout(async () => {
          let newQueue = queue.slice(1);
          if (level === 'master') {
              setStats(p => ({ ...p, mastered: p.mastered + 1 }));
              if (!masteredList.includes(currentCard.kanji)) {
                  const newList = [...masteredList, currentCard.kanji];
                  setMasteredList(newList);
                  const col = deckType === 'single' ? 'mastered_kanji' : 'mastered_jukugo';
                  await supabase.from('users').update({ [col]: newList }).eq('id', user.id);
                  
                  // 📊 Cập nhật daily_stats - ghi nhận số học TRONG NGÀY
                  // Mỗi khi master 1 kanji → +1 vào record ngày hôm nay
                  const now = new Date();
                  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  
                  const { data: existingStat } = await supabase
                      .from('daily_stats')
                      .select('id, kanji_learned')
                      .eq('user_id', user.id)
                      .eq('stat_date', today)
                      .maybeSingle();
                  
                  if (existingStat) {
                      // Đã có record hôm nay → +1
                      await supabase.from('daily_stats').update({
                          kanji_learned: deckType === 'single' ? (existingStat.kanji_learned || 0) + 1 : existingStat.kanji_learned
                      }).eq('id', existingStat.id);
                  } else {
                      // Chưa có → tạo mới với giá trị 1
                      await supabase.from('daily_stats').insert({
                          user_id: user.id,
                          stat_date: today,
                          kanji_learned: deckType === 'single' ? 1 : 0
                      });
                  }
                  
                  // Update tổng tích lũy trong bảng users
                  if (deckType === 'single') {
                      const { data } = await supabase.from('users').select('kanji_learned').eq('id', user.id).single();
                      await supabase.from('users').update({ kanji_learned: (data?.kanji_learned || 0) + 1 }).eq('id', user.id);
                  }
              }
          } else {
              newQueue.splice((level === 'forgot' || level === 'hard') ? Math.min(newQueue.length, 3) : newQueue.length, 0, currentCard);
              if (level === 'forgot' || level === 'hard') setStats(prev => ({ ...prev, review: prev.review + 1 }));
          }
          setQueue(newQueue);
          if (newQueue.length === 0) {
              setFinished(true);
              const progress = { ...completedLessons, [currentLesson.id]: true };
              setCompletedLessons(progress);
              const colLesson = deckType === 'single' ? 'completed_kanji_lessons' : 'completed_jukugo_lessons';
              await supabase.from('users').update({ [colLesson]: Object.keys(progress).map(id => parseInt(id)) }).eq('id', user.id);
              if (deckType === 'single') {
                  const { data } = await supabase.from('users').select('lessons_completed').eq('id', user.id).single();
                  await supabase.from('users').update({ lessons_completed: (data?.lessons_completed || 0) + 1 }).eq('id', user.id);
              }
          }
      }, 200);
  };

  const getDynamicFontSize = (text) => {
      if (!text) return 'text-8xl';
      const len = text.length;
      if (len === 1) return 'text-[11rem] md:text-[13rem]'; 
      if (len === 2) return 'text-[8.5rem] md:text-[10.5rem]';
      if (len === 3) return 'text-[6.5rem] md:text-[8rem]';
      return 'text-[4.5rem] md:text-[6rem]'; 
  };

  const getMenuFontSize = (text) => {
      if (text.length <= 1) return 'text-4xl';
      if (text.length <= 2) return 'text-3xl';
      if (text.length === 3) return 'text-2xl';
      return 'text-xl'; 
  };

  const progressPercent = sessionTotal > 0 ? ((sessionTotal - queue.length) / sessionTotal) * 100 : 100;

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden select-none">
      <ConfirmModal 
        isOpen={!!lessonToReview} 
        title={`${t.modal_review_title} ${lessonToReview?.title}?`} 
        message={t.modal_review_msg} 
        onConfirm={() => prepareGame(lessonToReview, true)} 
        onCancel={() => setLessonToReview(null)}
        t={t}
      />
      <Sidebar />
      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        <div className="px-8 py-4 bg-[#Fdfdfd] flex justify-between items-center border-b border-gray-100 shrink-0 h-20 shadow-sm z-50">
            {mode === 'menu' ? (
                <div className="flex flex-row items-center gap-8 w-full">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">{Icons.card}</div>
                        <div><h1 className="text-xl font-black text-slate-800 leading-none">{t.flashcard_practice_title}</h1><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t.flashcard_sub_title}</p></div>
                    </div>
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 ml-auto">
                        <button onClick={() => setDeckType('single')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${deckType === 'single' ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-gray-400 hover:text-slate-600'}`}>{t.flashcard_kanji_single}</button>
                        <button onClick={() => setDeckType('jukugo')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${deckType === 'jukugo' ? 'bg-white text-indigo-600 shadow-sm scale-105' : 'text-gray-400 hover:text-indigo-600'}`}>{t.flashcard_jukugo}</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setMode('menu')} className="flex items-center gap-3 text-gray-400 hover:text-slate-900 font-black transition-all text-sm group px-6 py-2.5 rounded-2xl hover:bg-gray-100"><span className="group-hover:-translate-x-1 transition-transform">{Icons.back}</span><span>{t.flashcard_stop}</span></button>
            )}
        </div>

        <div className="flex-1 bg-gray-50/50 overflow-hidden flex flex-col">
            {mode === 'menu' && (
                <div className="overflow-y-auto h-full p-8 pr-4 custom-scrollbar pb-24">
                    {loadingProgress ? (
                        <div className="flex justify-center items-center h-64 text-gray-400 font-bold animate-pulse">{t.flashcard_loading}</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {generatedLessons.map((lesson) => {
                                const isDone = completedLessons[lesson.id];
                                const mastered = lesson.originalCards.filter(c => masteredList.includes(c.kanji)).length;
                                return (
                                    <div key={lesson.id} onClick={() => isDone ? setLessonToReview(lesson) : prepareGame(lesson, false)} className={`group p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden h-56 flex flex-col justify-between ${isDone ? 'bg-green-50/40 border-green-200' : 'bg-white border-gray-100 hover:border-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}>
                                        <div className="absolute -right-4 -top-6 text-[8rem] text-black/[0.02] font-black">{lesson.id}</div>
                                        <div className="relative z-10 flex justify-between items-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-widest ${isDone ? 'bg-green-600 text-white shadow-sm' : 'bg-slate-900 text-white'}`}>{lesson.title}</span>
                                            {isDone && <button onClick={(e) => { e.stopPropagation(); setLessonToReview(lesson); }} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm hover:scale-110 transition-transform">{Icons.reload}</button>}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 relative z-10 w-full overflow-hidden">
                                            <span className={`font-kai text-slate-900 whitespace-nowrap shrink transition-all ${getMenuFontSize(lesson.desc.start)}`}>{lesson.desc.start}</span>
                                            <span className="text-gray-300 text-sm shrink-0">➜</span>
                                            <span className={`font-kai text-slate-900 whitespace-nowrap shrink transition-all ${getMenuFontSize(lesson.desc.end)}`}>{lesson.desc.end}</span>
                                        </div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between text-[11px] font-black text-gray-400 mb-2 uppercase tracking-tighter"><span>{t.flashcard_progress}</span><span>{mastered}/{lesson.originalCards.length}</span></div>
                                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div className={`h-full transition-all duration-700 ${isDone ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${(mastered / lesson.originalCards.length) * 100}%` }}></div></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {mode === 'game' && !finished && queue[0] && (
                <div className="h-full w-full flex items-center justify-center p-6 gap-8 lg:px-20 overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center h-full max-w-[550px] shrink-0 my-auto">
                        <div className="w-full mb-6 shrink-0"><div className="flex justify-between text-[12px] font-black text-gray-400 mb-2 uppercase px-2"><span>{t.flashcard_remaining}: {queue.length}</span><span>{Math.round(progressPercent)}%</span></div><div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-slate-900 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div></div></div>
                        <div className="relative w-full h-[75vh] max-h-[650px] perspective-2000 group cursor-pointer shadow-2xl rounded-[3.5rem]" onClick={() => setIsFlipped(!isFlipped)}>
                            <div className={`w-full h-full duration-500 transform-style-3d relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                                <div className="absolute inset-0 bg-white rounded-[3.5rem] border border-gray-100 flex flex-col items-center justify-center backface-hidden z-20 p-12 text-center overflow-hidden">
                                    <span className="text-[12px] font-black text-gray-300 uppercase absolute top-10 animate-pulse tracking-widest">{t.flashcard_tap_to_flip}</span>
                                    <h1 className={`font-kai leading-none select-none text-slate-800 whitespace-nowrap px-6 drop-shadow-sm ${getDynamicFontSize(queue[0].kanji)}`}>{queue[0].kanji}</h1>
                                    <p className="text-gray-400 text-xs font-black bg-gray-50 px-6 py-2 rounded-2xl absolute bottom-12 uppercase tracking-widest border border-gray-100">{currentLesson?.title}</p>
                                </div>
                                <div className="absolute inset-0 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl flex flex-col backface-hidden rotate-y-180 z-20 border-[6px] border-slate-800 overflow-hidden text-center">
                                    <div className="flex-1 flex flex-col p-10 justify-between min-h-0">
                                            <div className="flex flex-col items-center">
                                                <h2 className={`font-kai text-white opacity-20 whitespace-nowrap mb-2 ${queue[0].kanji.length > 2 ? 'text-3xl' : 'text-5xl'}`}>{queue[0].kanji}</h2>
                                                <div className="inline-block bg-yellow-500 text-slate-950 px-5 py-1 rounded-xl text-[11px] font-black uppercase mb-4 shadow-lg">{queue[0].hanviet || "HÁN VIỆT"}</div>
                                                <p className="text-3xl md:text-4xl font-black text-white leading-tight uppercase tracking-tight">
                                                    {/* Hiển thị nghĩa theo ngôn ngữ đã chọn */}
                                                    {typeof queue[0].mean === 'object' ? (queue[0].mean[language] || queue[0].mean.vi) : queue[0].mean}
                                                </p>
                                            </div>
                                            <div className="bg-white/5 py-6 rounded-[2rem] border border-white/10 flex flex-col items-center justify-center my-4 shrink-0">
                                                {deckType === 'single' ? (
                                                    <div className="w-full px-8 space-y-3">
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">{t.flashcard_kun}</span><span className="text-xl font-bold text-green-400 whitespace-nowrap">{queue[0].kunyomi || "-"}</span></div>
                                                        <div className="w-full h-[1px] bg-white/10"></div>
                                                        <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">{t.flashcard_ony}</span><span className="text-xl font-bold text-blue-400 whitespace-nowrap">{queue[0].onyomi || "-"}</span></div>
                                                    </div>
                                                ) : (
                                                    <div className="px-4"><p className="text-[10px] font-black text-gray-500 tracking-[0.4em] mb-2 uppercase">{t.flashcard_reading}</p><p className="text-3xl md:text-4xl font-black text-pink-400 tracking-wider leading-none uppercase whitespace-nowrap">{queue[0].hiragana}</p></div>
                                                )}
                                            </div>
                                            {queue[0].detail && <div className="px-2"><p className="text-gray-300 italic font-medium text-sm md:text-base opacity-90 line-clamp-4">"{queue[0].detail}"</p></div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`flex flex-col gap-3 w-48 shrink-0 transition-all duration-500 ${isFlipped ? 'opacity-100 translate-x-0' : 'opacity-10 translate-x-12 pointer-events-none filter grayscale'} my-auto pb-10`}>
                        <button onClick={() => handleRate('forgot')} className="group flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-red-100 shadow-sm transition-all active:scale-90"><div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">{Icons.forgot}</div><span className="text-[12px] font-black text-gray-400 group-hover:text-red-600 uppercase tracking-widest">{t.flashcard_btn_forgot}</span></button>
                        <button onClick={() => handleRate('hard')} className="group flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-orange-100 shadow-sm transition-all active:scale-90"><div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-600 group-hover:text-white transition-colors">{Icons.hard}</div><span className="text-[12px] font-black text-gray-400 group-hover:text-orange-600 uppercase tracking-widest">{t.flashcard_btn_hard}</span></button>
                        <button onClick={() => handleRate('good')} className="group flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-yellow-100 shadow-sm transition-all active:scale-90"><div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0 group-hover:bg-yellow-600 group-hover:text-white transition-colors">{Icons.good}</div><span className="text-[12px] font-black text-gray-400 group-hover:text-yellow-600 uppercase tracking-widest">{t.flashcard_btn_good}</span></button>
                        <button onClick={() => handleRate('easy')} className="group flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-blue-100 shadow-sm transition-all active:scale-90"><div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">{Icons.easy}</div><span className="text-[12px] font-black text-gray-400 group-hover:text-blue-600 uppercase tracking-widest">{t.flashcard_btn_easy}</span></button>
                        <button onClick={() => handleRate('master')} className="group flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-400 shadow-xl transition-all active:scale-95 mt-4 group"><div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg group-hover:bg-white group-hover:text-emerald-500 transition-colors">{Icons.master}</div><span className="text-sm font-black text-emerald-700 group-hover:text-white uppercase tracking-widest">{t.flashcard_btn_master}</span></button>
                    </div>
                </div>
            )}

            {mode === 'game' && finished && (
                <div className="h-full flex items-center justify-center bg-white z-[100] animate-fade-in">
                  <div className="text-center max-w-md p-12">
                    <div className="w-32 h-32 bg-emerald-500 text-white rounded-[3rem] flex items-center justify-center text-6xl mx-auto mb-8 shadow-2xl shadow-emerald-200">完</div>
                    <h2 className="text-4xl font-black text-slate-800 mb-4 uppercase">{t.flashcard_finish_awesome}</h2>
                    <div className="grid grid-cols-2 gap-4 mb-10 bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner">
                        <div className="text-center border-r border-gray-200"><div className="text-3xl font-black text-slate-800">{currentLesson?.originalCards.length}</div><div className="text-[11px] uppercase font-black text-gray-400 mt-1 tracking-widest">{t.flashcard_total_words}</div></div>
                        <div className="text-center"><div className="text-3xl font-black text-orange-500">{stats.review}</div><div className="text-[11px] uppercase font-black text-gray-400 mt-1 tracking-widest">{t.flashcard_review_count}</div></div>
                    </div>
                    <button onClick={() => setMode('menu')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl uppercase tracking-widest active:scale-95">{t.flashcard_back_list}</button>
                  </div>
                </div>
            )}
        </div>
      </main>

      {/* 🔥 CSS TÙY CHỈNH THANH CUỘN CHO FLASHCARD */}
      <style>{`
        .font-kai { font-family: 'Yuji Syuku', serif; font-weight: 400 !important; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        
        /* THANH CUỘN ĐẸP */
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default FlashcardPage;