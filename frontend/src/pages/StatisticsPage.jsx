import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { translations } from '../utils/translations';
import { useStatistics, getMonthName } from '../hooks/useStatistics';
import StatisticsChart from '../components/StatisticsChart';

// --- MASCOT MESSAGES BY MOOD ---
const MASCOT_MESSAGES = {
    // Người mới bắt đầu (ít hơn 10 kanji)
    newbie: [
        { text: "Chào mừng bạn đến với thế giới Kanji! Hành trình vạn dặm bắt đầu từ bước đầu tiên! 🌱", mood: "welcome" },
        { text: "Bạn mới bắt đầu thôi à? Không sao, mình sẽ đồng hành cùng bạn! 🤝", mood: "care" },
        { text: "Mỗi chữ Hán là một câu chuyện, hãy khám phá từng chút một nhé! 📖", mood: "happy" },
    ],
    // Chăm chỉ (học nhiều ngày liên tiếp)
    hardworking: [
        { text: "Woa! Bạn học đều đặn quá! Kiến tha lâu đầy tổ là đây! 🐜✨", mood: "proud" },
        { text: "Nhìn biểu đồ mà mình thấy tự hào quá! Bạn giỏi lắm! 🌟", mood: "excited" },
        { text: "Nước chảy đá mòn, bạn chính là minh chứng cho câu này! 💪", mood: "cheer" },
        { text: "Cứ đà này, bạn sẽ thành cao thủ Kanji thôi! 🏆", mood: "proud" },
    ],
    // Tiến bộ tốt (rank points cao)
    progressing: [
        { text: "Điểm Rank của bạn cao quá! Có công mài sắt, có ngày nên kim! ⚡", mood: "excited" },
        { text: "Bạn đang tiến bộ rất nhanh đấy! Cứ tiếp tục nhé! 🚀", mood: "cheer" },
        { text: "Thống kê đẹp quá! Hôm nay gieo hạt, mai sau gặt vàng! 🌾", mood: "proud" },
    ],
    // Lâu không học (không có data gần đây)
    comeback: [
        { text: "Ơ bạn đi đâu mất rồi? Mình nhớ bạn quá à! 🥺", mood: "sad" },
        { text: "Lâu quá không thấy bạn... Học như thuyền ngược nước, không tiến ắt lùi đó! ⛵", mood: "worried" },
        { text: "Hôm nay bạn quay lại rồi! Mình vui quá! Cùng học tiếp nhé! 🎉", mood: "happy" },
        { text: "Đừng bỏ cuộc nha! Chậm mà chắc, như rùa thắng thỏ vậy! 🐢", mood: "care" },
    ],
    // Bình thường
    normal: [
        { text: "Ngày ngày chăm học chữ, mai sau thành đại thụ! 🌳", mood: "cheer" },
        { text: "Một chữ một ngày, năm tháng dài thêm trí tuệ! ✨", mood: "happy" },
        { text: "Chữ nghĩa như hoa, càng học càng nở rộ! 🌸", mood: "proud" },
        { text: "Mỗi Kanji là một viên ngọc, hãy góp nhặt từng ngày! 💎", mood: "happy" },
        { text: "Tri thức là ánh sáng, hãy thắp lên mỗi ngày! 💡", mood: "cheer" },
        { text: "Đọc sách vạn quyển, hạ bút như thần! 📚", mood: "proud" },
        { text: "Học hành là con đường hoa, gian nan nhưng đẹp! 🌷", mood: "happy" },
    ],
    // Thành tích cao (nhiều challenge score)
    champion: [
        { text: "Chiến công hiển hách! Bạn là chiến binh Kanji thực thụ! ⚔️", mood: "excited" },
        { text: "Điểm thử thách cao quá! Bạn quá xuất sắc rồi! 🏅", mood: "proud" },
        { text: "Cây cao bóng cả nhờ rễ sâu, bạn đã chứng minh điều đó! 🌲", mood: "cheer" },
    ],
};

// Phân tích thói quen học tập
const analyzeUserHabit = (userData, monthlyData) => {
    if (!userData) return 'normal';
    
    const { kanjiLearned, rankPoints, challengeScore } = userData;
    
    // Đếm số ngày có học trong tháng
    const daysWithData = monthlyData?.filter(d => 
        (d.kanjiLearned > 0 || d.rankPoints > 0 || d.challengeScore > 0)
    ).length || 0;
    
    // Kiểm tra ngày hôm nay có học không
    const today = monthlyData?.find(d => d.isToday);
    const learnedToday = today && (today.kanjiLearned > 0 || today.rankPoints > 0);
    
    // Người mới (ít hơn 10 kanji)
    if (kanjiLearned < 10) return 'newbie';
    
    // Thành tích cao (challenge score > 100)
    if (challengeScore > 100) return 'champion';
    
    // Chăm chỉ (học nhiều hơn 5 ngày trong tháng)
    if (daysWithData >= 5) return 'hardworking';
    
    // Tiến bộ tốt (rank points > 200)
    if (rankPoints > 200) return 'progressing';
    
    // Lâu không học (không có data và đã có ít nhất 1 kanji trước đó)
    if (daysWithData === 0 && kanjiLearned > 0 && !learnedToday) return 'comeback';
    
    return 'normal';
};

// --- MASCOT COMPONENT ---
const Mascot = ({ userData, monthlyData }) => {
    const [message, setMessage] = useState(null);
    const [isVisible, setIsVisible] = useState(true);
    
    const habitType = useMemo(() => analyzeUserHabit(userData, monthlyData), [userData, monthlyData]);
    
    useEffect(() => {
        // Lấy messages theo loại thói quen
        const messages = MASCOT_MESSAGES[habitType] || MASCOT_MESSAGES.normal;
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        setMessage(randomMsg);
    }, [habitType]);

    if (!isVisible || !message) return null;

    // Biểu cảm khuôn mặt theo mood
    const getEyeExpression = () => {
        switch (message.mood) {
            case 'sad':
            case 'worried':
                return { eyeRy: 3, eyeY: 27 }; // Mắt buồn
            case 'excited':
                return { eyeRy: 5, eyeY: 25 }; // Mắt to tròn
            default:
                return { eyeRy: 4, eyeY: 26 }; // Bình thường
        }
    };
    
    const getMouthExpression = () => {
        switch (message.mood) {
            case 'sad':
            case 'worried':
                return "M28 39 Q32 35 36 39"; // Miệng buồn
            case 'excited':
            case 'proud':
                return "M26 36 Q32 44 38 36"; // Cười to
            default:
                return "M28 37 Q32 42 36 37"; // Cười nhẹ
        }
    };
    
    const { eyeRy, eyeY } = getEyeExpression();
    const mouthPath = getMouthExpression();

    return (
        <div className="fixed bottom-8 right-8 z-50 flex items-end gap-3 animate-bounce-in">
            {/* Speech Bubble */}
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[280px]">
                <p className="text-base text-slate-700 font-medium leading-relaxed">{message.text}</p>
                {/* Bubble tail */}
                <div className="absolute -right-2 bottom-6 w-5 h-5 bg-white border-r border-b border-gray-100 transform rotate-[-45deg]"></div>
                {/* Close button */}
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-sm transition-colors"
                >
                    ✕
                </button>
            </div>
            
            {/* Mascot Character - Cute Shiba */}
            <div className="w-24 h-24 relative">
                <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
                    {/* Body */}
                    <ellipse cx="32" cy="48" rx="18" ry="12" fill="#F4A460"/>
                    {/* Head */}
                    <circle cx="32" cy="28" r="20" fill="#F4A460"/>
                    {/* Face (cream color) */}
                    <ellipse cx="32" cy="32" rx="14" ry="12" fill="#FFF8DC"/>
                    {/* Left Ear */}
                    <path d="M12 18 Q8 4 20 12 Q16 18 12 18Z" fill="#F4A460"/>
                    <path d="M14 16 Q12 8 20 13" fill="#FFB6C1" opacity="0.6"/>
                    {/* Right Ear */}
                    <path d="M52 18 Q56 4 44 12 Q48 18 52 18Z" fill="#F4A460"/>
                    <path d="M50 16 Q52 8 44 13" fill="#FFB6C1" opacity="0.6"/>
                    {/* Eyes - Dynamic based on mood */}
                    <ellipse cx="24" cy={eyeY} rx="3" ry={eyeRy} fill="#2D2D2D"/>
                    <ellipse cx="40" cy={eyeY} rx="3" ry={eyeRy} fill="#2D2D2D"/>
                    <circle cx="25" cy={eyeY - 1} r="1" fill="white"/>
                    <circle cx="41" cy={eyeY - 1} r="1" fill="white"/>
                    {/* Sparkle eyes for excited mood */}
                    {message.mood === 'excited' && (
                        <>
                            <path d="M22 22 L24 20 L26 22 L24 24 Z" fill="#FFD700"/>
                            <path d="M38 22 L40 20 L42 22 L40 24 Z" fill="#FFD700"/>
                        </>
                    )}
                    {/* Tears for sad mood */}
                    {(message.mood === 'sad' || message.mood === 'worried') && (
                        <>
                            <ellipse cx="20" cy="30" rx="2" ry="3" fill="#87CEEB" opacity="0.7"/>
                            <ellipse cx="44" cy="30" rx="2" ry="3" fill="#87CEEB" opacity="0.7"/>
                        </>
                    )}
                    {/* Nose */}
                    <ellipse cx="32" cy="33" rx="3" ry="2" fill="#2D2D2D"/>
                    {/* Mouth - Dynamic based on mood */}
                    <path d={mouthPath} stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    {/* Blush */}
                    <ellipse cx="18" cy="32" rx="4" ry="2" fill="#FFB6C1" opacity="0.5"/>
                    <ellipse cx="46" cy="32" rx="4" ry="2" fill="#FFB6C1" opacity="0.5"/>
                    {/* Tail - wagging for happy moods */}
                    <path d="M50 48 Q62 40 56 50 Q54 54 50 52" fill="#F4A460" className={message.mood === 'excited' ? 'animate-wag' : ''}/>
                </svg>
            </div>
        </div>
    );
};

// --- ICONS ---
const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
        </svg>
    ),
    // Gamepad icon - Rank Đấu
    Gamepad: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>
        </svg>
    ),
    // Swords icon - Chiến công
    Swords: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/>
        </svg>
    ),
    // Kanji icon - Sức mạnh (Hán tự học được)
    Kanji: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <text x="4" y="18" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">字</text>
        </svg>
    )
};

// --- STAT CARD ---
const StatCard = ({ icon, title, value, subtitle, color, bgColor }) => (
    <div className={`${bgColor} rounded-xl p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300`}>
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${color} bg-white/80 flex items-center justify-center shadow-sm shrink-0`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-2xl font-black text-slate-800">{value.toLocaleString()}</div>
                <div className="text-xs text-slate-500 font-medium truncate">{title} • {subtitle}</div>
            </div>
        </div>
    </div>
);

// --- MAIN PAGE ---
const StatisticsPage = () => {
    const navigate = useNavigate();
    const { user, language } = useAppContext();
    const t = translations[language] || translations.vi;

    const {
        loading,
        userData,
        monthlyData,
        monthlyTotals,
        selectedMonth,
        selectedYear,
        isCurrentMonth,
        goToPrevMonth,
        goToNextMonth
    } = useStatistics(user?.id);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">{t.loading || 'Đang tải...'}</p>
                </div>
            </div>
        );
    }

    const totalStats = userData || { totalFlashcards: 0, challengeScore: 0, rankPoints: 0, kanjiLearned: 0 };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors font-bold text-sm"
                    >
                        <Icons.Back />
                        <span>{t.back || 'Quay lại'}</span>
                    </button>
                    <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="3" width="22" height="18" rx="3" fill="url(#statsGradHeader)" />
                            <rect x="4" y="12" width="3" height="6" rx="1" fill="white" opacity="0.9"/>
                            <rect x="8.5" y="8" width="3" height="10" rx="1" fill="white" opacity="0.95"/>
                            <rect x="13" y="10" width="3" height="8" rx="1" fill="white" opacity="0.9"/>
                            <rect x="17.5" y="6" width="3" height="12" rx="1" fill="white"/>
                            <path d="M5.5 11 L10 7 L14.5 9 L19 5" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="19" cy="5" r="1.5" fill="#FCD34D"/>
                            <defs>
                                <linearGradient id="statsGradHeader" x1="1" y1="3" x2="23" y2="21" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#06B6D4"/>
                                    <stop offset="1" stopColor="#0891B2"/>
                                </linearGradient>
                            </defs>
                        </svg>
                        {t.stats_title || 'Thống kê học tập'}
                    </h1>
                    <div className="w-20" />
                </div>
            </header>

            <main className="px-6 py-4 space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard
                        icon={<Icons.Gamepad />}
                        title={t.rank_battle || 'Rank Đấu'}
                        value={totalStats.rankPoints}
                        subtitle={t.pts || 'pts'}
                        color="text-orange-600"
                        bgColor="bg-gradient-to-br from-orange-50 to-orange-100/50"
                    />
                    <StatCard
                        icon={<Icons.Kanji />}
                        title={t.power || 'Sức mạnh'}
                        value={totalStats.kanjiLearned}
                        subtitle={t.kanji_unit || 'Hán tự'}
                        color="text-cyan-600"
                        bgColor="bg-gradient-to-br from-cyan-50 to-cyan-100/50"
                    />
                    <StatCard
                        icon={<Icons.Swords />}
                        title={t.achievements || 'Chiến công'}
                        value={totalStats.challengeScore}
                        subtitle={t.points || 'điểm'}
                        color="text-purple-600"
                        bgColor="bg-gradient-to-br from-purple-50 to-purple-100/50"
                    />
                </div>

                {/* Chart */}
                <StatisticsChart
                    data={monthlyData}
                    monthlyTotals={monthlyTotals}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    isCurrentMonth={isCurrentMonth}
                    onPrevMonth={goToPrevMonth}
                    onNextMonth={goToNextMonth}
                    getMonthName={getMonthName}
                    language={language}
                />

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 py-2">
                    {t.stats_footer || 'Dữ liệu được cập nhật khi bạn học Flashcard hoặc làm Thử thách'}
                </div>
            </main>

            {/* Mascot */}
            <Mascot userData={userData} monthlyData={monthlyData} />
        </div>
    );
};

export default StatisticsPage;
