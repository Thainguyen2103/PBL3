import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext';
import { flashcardData } from "../utils/kanji-dictionary";
import { supabase } from '../supabaseClient'; 

// --- COMPONENT MODAL XÁC NHẬN (MỚI) ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center border border-gray-100">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    ↺
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm font-medium mb-8 leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
                        Hủy
                    </button>
                    <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200 transition-all">
                        Ôn tập ngay
                    </button>
                </div>
            </div>
        </div>
    );
};

const FlashcardPage = () => {
  const navigate = useNavigate();
  const { t, user } = useAppContext();
  const ITEMS_PER_LESSON = 16; 

  // --- STATE ---
  const [mode, setMode] = useState('menu'); 
  const [currentLesson, setCurrentLesson] = useState(null);
  const [queue, setQueue] = useState([]); 
  const [isFlipped, setIsFlipped] = useState(false);   
  const [finished, setFinished] = useState(false);     
  const [stats, setStats] = useState({ review: 0, mastered: 0 }); 
  const [sessionTotal, setSessionTotal] = useState(0); 
  
  // State cho Modal xác nhận
  const [lessonToReview, setLessonToReview] = useState(null);

  const [masteredKanjiList, setMasteredKanjiList] = useState([]);

  useEffect(() => {
      const localList = JSON.parse(localStorage.getItem('my_mastered_kanji') || '[]');
      setMasteredKanjiList(localList);
  }, []);

  const generatedLessons = useMemo(() => {
    const lessons = [];
    const sourceData = flashcardData || []; 
    if (sourceData.length === 0) return [];

    for (let i = 0; i < sourceData.length; i += ITEMS_PER_LESSON) {
        const chunk = sourceData.slice(i, i + ITEMS_PER_LESSON);
        const lessonNumber = Math.floor(i / ITEMS_PER_LESSON) + 1;
        const firstChar = chunk[0]?.kanji || "?";
        const lastChar = chunk[chunk.length - 1]?.kanji || "?";

        let lessonTitle = "";
        const label = t?.flashcard_lesson || "Bài";
        if (label.includes('~')) {
            lessonTitle = label.replace('~', lessonNumber);
        } else {
            lessonTitle = `${label} ${lessonNumber}`;
        }

        lessons.push({
            id: lessonNumber,
            title: lessonTitle,
            desc: { start: firstChar, end: lastChar }, 
            originalCards: chunk
        });
    }
    return lessons;
  }, [t]); 

  const [completedLessons, setCompletedLessons] = useState(() => {
      const saved = localStorage.getItem('kanji_progress');
      return saved ? JSON.parse(saved) : {};
  });

  const markLessonComplete = (lessonId) => {
      const newProgress = { ...completedLessons, [lessonId]: true };
      setCompletedLessons(newProgress);
      localStorage.setItem('kanji_progress', JSON.stringify(newProgress));
  };

  // --- LOGIC CẬP NHẬT ĐIỂM (CÓ CHECK) ---
  const incrementKanjiCount = async (kanjiChar, lessonId) => {
      if (!user || !user.id) return;
      
      // 🛑 CHẶN QUAN TRỌNG: Nếu bài này ĐÃ HOÀN THÀNH rồi -> Không cộng điểm nữa
      if (completedLessons[lessonId]) {
          console.log("⚠️ Đang ôn tập bài cũ, không tính điểm xếp hạng.");
          return;
      }

      const localMasteredList = JSON.parse(localStorage.getItem('my_mastered_kanji') || '[]');
      if (localMasteredList.includes(kanjiChar)) return; 

      try {
          const { data, error } = await supabase.from('users').select('kanji_learned').eq('id', user.id).single();
          if (error) throw error;
          const currentKanji = data?.kanji_learned || 0;
          await supabase.from('users').update({ kanji_learned: currentKanji + 1 }).eq('id', user.id);
          
          localMasteredList.push(kanjiChar);
          localStorage.setItem('my_mastered_kanji', JSON.stringify(localMasteredList));
          setMasteredKanjiList(localMasteredList);

      } catch (err) {
          console.error("Lỗi cộng Kanji:", err.message);
      }
  };

  const incrementLessonCount = async (lessonId) => {
      if (!user || !user.id) return;
      
      // 🛑 CHẶN QUAN TRỌNG: Bài cũ không cộng điểm bài
      if (completedLessons[lessonId]) return;

      try {
          const { data, error } = await supabase.from('users').select('lessons_completed').eq('id', user.id).single();
          if (error) throw error;
          const currentLessonCount = data?.lessons_completed || 0;
          await supabase.from('users').update({ lessons_completed: currentLessonCount + 1 }).eq('id', user.id);
      } catch (err) {
          console.error("Lỗi hoàn thành bài:", err.message);
      }
  };

  // --- 1. XỬ LÝ BẮT ĐẦU ÔN TẬP ---
  const startReview = () => {
      if (!lessonToReview) return;
      
      const lesson = lessonToReview;
      // Khi ôn tập: Lấy TOÀN BỘ thẻ của bài đó (không lọc thẻ đã thuộc)
      // Để người dùng được học lại từ A-Z
      const allCards = [...lesson.originalCards].sort(() => 0.5 - Math.random());

      setCurrentLesson(lesson);
      setStats({ review: 0, mastered: 0 });
      setFinished(false);
      setIsFlipped(false);
      setMode('game');
      setQueue(allCards);
      setSessionTotal(allCards.length); // Tổng số thẻ của bài
      setLessonToReview(null); // Đóng modal
  };

  // --- 2. XỬ LÝ BẮT ĐẦU HỌC MỚI (Logic cũ) ---
  const handleSelectLesson = (lesson) => {
    // Nếu bài đã hoàn thành -> Không vào thẳng mà hiện modal hỏi ôn tập
    if (completedLessons[lesson.id]) {
        return; // Click vào bài đã xong thì không làm gì (hoặc có thể mở modal ôn tập luôn nếu muốn)
        // Hiện tại ta chỉ cho bấm nút Reset để ôn tập
    }

    const localMastered = JSON.parse(localStorage.getItem('my_mastered_kanji') || '[]');
    const remainingCards = lesson.originalCards.filter(card => !localMastered.includes(card.kanji));

    setCurrentLesson(lesson);
    setStats({ review: 0, mastered: 0 });
    setFinished(false);
    setIsFlipped(false);
    setMode('game');
    setSessionTotal(remainingCards.length);

    if (remainingCards.length === 0) {
        setQueue([]);
        setFinished(true);
    } else {
        const shuffled = [...remainingCards].sort(() => 0.5 - Math.random());
        setQueue(shuffled);
    }
  };

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleRate = (level) => {
      const currentCard = { ...queue[0] };
      setIsFlipped(false);

      setTimeout(() => {
          let newQueue = queue.slice(1);

          if (level === 'master') {
              setStats(prev => ({ ...prev, mastered: prev.mastered + 1 }));
              // Truyền thêm ID bài học để check
              incrementKanjiCount(currentCard.kanji, currentLesson.id); 
          } 
          else {
              if (level === 'forgot' || level === 'hard') {
                  const insertIndex = Math.min(newQueue.length, 3);
                  newQueue.splice(insertIndex, 0, currentCard);
                  setStats(prev => ({ ...prev, review: prev.review + 1 }));
              }
              else { 
                  newQueue.push(currentCard);
              }
          }

          setQueue(newQueue);

          if (newQueue.length === 0) {
              setFinished(true);
              // Chỉ đánh dấu hoàn thành & cộng điểm bài nếu chưa từng xong
              if (currentLesson && !completedLessons[currentLesson.id]) {
                  incrementLessonCount(currentLesson.id);
                  markLessonComplete(currentLesson.id);
              }
          }
      }, 200); 
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setQueue([]);
  };

  const currentCard = queue.length > 0 ? queue[0] : null;
  const progressPercent = sessionTotal > 0 
        ? ((sessionTotal - queue.length) / sessionTotal) * 100 
        : 100;

  const getMeaning = (card) => {
      if (!card) return "";
      if (typeof card.mean === 'object') {
          return card.mean[user?.language] || card.mean.vi || card.mean.en;
      }
      return card.mean;
  };

  return (
    <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
      
      {/* MODAL XÁC NHẬN */}
      <ConfirmModal 
          isOpen={!!lessonToReview}
          title={`Ôn tập ${lessonToReview?.title}?`}
          message="Bạn sẽ học lại toàn bộ từ vựng trong bài này để củng cố kiến thức. Tiến độ hoàn thành cũ vẫn được giữ nguyên."
          onConfirm={startReview}
          onCancel={() => setLessonToReview(null)}
      />

      <div className="relative z-20 h-full shadow-xl">
        <Sidebar />
      </div>

      <main className="flex-1 h-full flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <div className="px-8 py-6 z-10 bg-[#Fdfdfd] flex justify-between items-center border-b border-gray-50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.02)] shrink-0">
            {mode === 'menu' ? (
                <div className="flex items-center gap-5 animate-fade-in-down">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl shadow-lg shadow-slate-200 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                        🎴
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-4xl text-slate-800 font-kai font-normal leading-none mb-1">
                            {t?.flashcard_title || "Luyện Tập"}
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className="h-[1px] w-6 bg-gray-300"></div>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                                {t?.flashcard_sub || "FLASH CARD"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <button onClick={handleBackToMenu} className="flex items-center gap-3 text-gray-400 hover:text-slate-900 font-bold transition-all text-base group px-4 py-2 rounded-xl hover:bg-gray-50">
                    <span className="text-2xl group-hover:-translate-x-1 transition-transform font-kai">←</span> 
                    <span>{t?.back || "Dừng lại"}</span>
                </button>
            )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 relative bg-gray-50/50 p-4 h-full overflow-hidden flex flex-col">
            
            {/* 1. MENU CHỌN BÀI */}
            {mode === 'menu' && (
                <div className="overflow-y-auto h-full pr-2 pb-20 no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {generatedLessons.map((lesson) => {
                            const isDone = completedLessons[lesson.id];
                            const totalWords = lesson.originalCards.length;
                            const masteredCount = lesson.originalCards.filter(c => masteredKanjiList.includes(c.kanji)).length;
                            const isFullyMastered = masteredCount === totalWords;

                            return (
                                <div 
                                    key={lesson.id}
                                    onClick={() => !isDone && handleSelectLesson(lesson)} // Nếu xong rồi thì chặn click vào body, chỉ cho bấm nút ôn tập
                                    className={`group p-5 rounded-[1.5rem] border transition-all cursor-pointer relative overflow-hidden ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:shadow-xl hover:-translate-y-1'}`}
                                >
                                    <div className="absolute -right-2 -top-2 text-[4rem] text-black/5 group-hover:text-black/10 transition-colors select-none font-kai font-normal">
                                        {lesson.id}
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${isDone ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>
                                                {lesson.title}
                                            </span>
                                            
                                            {/* NÚT ÔN TẬP (Chỉ hiện khi đã học xong) */}
                                            <div className="flex gap-2">
                                                {isDone && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLessonToReview(lesson); // Mở Modal
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-white/80 hover:bg-blue-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-colors shadow-sm"
                                                        title="Ôn tập lại"
                                                    >
                                                        ↺
                                                    </button>
                                                )}
                                                {isDone && <span className="text-xl">✅</span>}
                                            </div>
                                        </div>
                                        
                                        <h3 className="text-sm font-bold text-gray-600 mb-2 truncate flex items-center gap-1">
                                            {t?.flashcard_from || "Từ"} <span className="font-kai text-lg font-normal mx-1">{lesson.desc.start}</span> 
                                            ➝ <span className="font-kai text-lg font-normal mx-1">{lesson.desc.end}</span>
                                        </h3>

                                        <div className="mb-3">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                                                <span>TIẾN ĐỘ</span>
                                                <span>{isDone ? totalWords : masteredCount}/{totalWords}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${isDone ? 100 : (masteredCount / totalWords) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1 opacity-60 grayscale group-hover:grayscale-0 transition-all">
                                            {lesson.originalCards.slice(0, 5).map((k, i) => (
                                                <span key={i} className={`w-8 h-8 flex items-center justify-center rounded font-kai text-slate-700 text-xl border shadow-sm font-normal pb-1 ${masteredKanjiList.includes(k.kanji) ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white/50 border-gray-100'}`}>
                                                    {k.kanji}
                                                </span>
                                            ))}
                                            <span className="text-xs text-gray-500 self-end font-bold ml-1 mb-1">+{lesson.originalCards.length - 5}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 2. MÀN HÌNH GAME (GIỮ NGUYÊN) */}
            {mode === 'game' && !finished && currentCard && (
                <div className="h-full w-full flex flex-col items-center justify-center">
                    <div className="w-full max-w-[300px] mb-4 shrink-0">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                            <span>CÒN LẠI: {queue.length}</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>

                    <div className="relative h-[60vh] w-auto aspect-[3/4] perspective-1000 group cursor-pointer mb-6" onClick={handleFlip}>
                        {/* (Phần Card giữ nguyên) */}
                        <div className={`w-full h-full duration-500 transform-style-3d card-inner relative ${isFlipped ? 'rotate-y-180' : ''}`}>
                            <div className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl border border-gray-100 flex flex-col items-center justify-center backface-hidden z-20">
                                <span className="text-xs font-bold text-gray-300 uppercase tracking-[0.2em] absolute top-6">{t?.flashcard_flip_hint || "CHẠM ĐỂ LẬT"}</span>
                                <h1 className="text-[10rem] md:text-[12rem] text-slate-800 font-kai font-normal leading-none mb-2 select-none">{currentCard.kanji}</h1>
                                <p className="text-gray-500 text-xs font-bold bg-gray-100 px-3 py-1 rounded-full absolute bottom-8">{currentLesson.title}</p>
                            </div>
                            <div className="absolute inset-0 bg-[#1a1a1a] text-white rounded-[2rem] shadow-2xl flex flex-col backface-hidden rotate-y-180 z-20 overflow-hidden">
                                <div className="w-full h-full overflow-y-auto no-scrollbar p-6 flex flex-col">
                                    <div className="text-center border-b border-white/10 pb-4 mb-4 shrink-0">
                                        <h2 className="text-8xl font-kai font-normal mb-2 text-white leading-none select-none">{currentCard.kanji}</h2>
                                        <span className="inline-block bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest border border-yellow-400/20 mb-3">{currentCard.hanviet}</span>
                                        <p className="text-xl font-bold text-white leading-tight">{getMeaning(currentCard)}</p>
                                    </div>
                                    <div className="flex flex-col gap-3 pb-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5"><p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Kunyomi</p><p className="text-green-400 font-bold text-base break-words leading-snug">{currentCard.kunyomi || "-"}</p></div>
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5"><p className="text-gray-400 text-[10px] font-bold uppercase mb-1">Onyomi</p><p className="text-blue-400 font-bold text-base break-words leading-snug">{currentCard.onyomi || "-"}</p></div>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><p className="text-gray-400 text-[10px] font-bold uppercase mb-1">{t?.flashcard_mnemonic || "GHI NHỚ"}</p><p className="text-gray-200 text-sm leading-relaxed italic">"{currentCard.detail}"</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`grid grid-cols-5 gap-3 w-full max-w-[320px] shrink-0 transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                        <button onClick={() => handleRate('forgot')} className="flex flex-col items-center gap-1 group"><div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center text-xl shadow-sm border border-red-200 group-hover:scale-110 transition-transform">😭</div><span className="text-[10px] font-bold text-gray-500">{t?.btn_rate_forgot || "Quên"}</span></button>
                        <button onClick={() => handleRate('hard')} className="flex flex-col items-center gap-1 group"><div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center text-xl shadow-sm border border-orange-200 group-hover:scale-110 transition-transform">😓</div><span className="text-[10px] font-bold text-gray-500">{t?.btn_rate_hard || "Khó"}</span></button>
                        <button onClick={() => handleRate('good')} className="flex flex-col items-center gap-1 group"><div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center text-xl shadow-sm border border-yellow-200 group-hover:scale-110 transition-transform">😐</div><span className="text-[10px] font-bold text-gray-500">{t?.btn_rate_good || "Tạm"}</span></button>
                        <button onClick={() => handleRate('easy')} className="flex flex-col items-center gap-1 group"><div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center text-xl shadow-sm border border-blue-200 group-hover:scale-110 transition-transform">😊</div><span className="text-[10px] font-bold text-gray-500">{t?.btn_rate_easy || "Dễ"}</span></button>
                        <button onClick={() => handleRate('master')} className="flex flex-col items-center gap-1 group"><div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-xl shadow-sm border border-green-200 group-hover:scale-110 transition-transform ring-2 ring-green-100">😎</div><span className="text-[10px] font-bold text-green-600">{t?.btn_rate_master || "Thuộc"}</span></button>
                    </div>
                </div>
            )}

            {/* 3. HOÀN THÀNH (GIỮ NGUYÊN) */}
            {mode === 'game' && finished && (
                <div className="h-full flex items-center justify-center">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center border border-gray-100 max-w-sm w-full animate-fade-in">
                        <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-green-200 shadow-lg"><span className="font-kai font-normal">完</span></div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">{t?.flashcard_finish_title || "Tuyệt vời!"}</h2>
                        <div className="bg-gray-50 p-6 rounded-2xl mb-8 flex justify-between px-8">
                            <div className="text-center"><div className="text-3xl font-black text-slate-800">{currentLesson?.originalCards.length}</div><div className="text-xs uppercase font-bold text-gray-500 mt-1">{t?.flashcard_stat_total || "Tổng từ"}</div></div>
                            <div className="w-[1px] bg-gray-200"></div>
                            <div className="text-center"><div className="text-3xl font-black text-orange-500">{stats.review}</div><div className="text-xs uppercase font-bold text-gray-500 mt-1">{t?.flashcard_stat_review || "Lặp lại"}</div></div>
                        </div>
                        <button onClick={handleBackToMenu} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-base shadow-lg">{t?.flashcard_btn_back || "Về danh sách bài học"}</button>
                    </div>
                </div>
            )}
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .font-kai { font-family: 'Yuji Syuku', serif; font-weight: 400 !important; } 
      `}</style>
    </div>
  );
};

export default FlashcardPage;