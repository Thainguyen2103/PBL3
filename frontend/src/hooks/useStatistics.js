import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

// Helper
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Format date to YYYY-MM-DD
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Lưu tổng tích lũy của hôm nay vào database (chỉ update hôm nay, không đụng ngày trước)
const saveDailySnapshot = async (userId, data) => {
    if (!userId || !data) return;
    
    const today = formatDate(new Date());
    
    try {
        // Kiểm tra xem đã có record cho ngày hôm nay chưa
        const { data: existing } = await supabase
            .from('daily_stats')
            .select('id')
            .eq('user_id', userId)
            .eq('stat_date', today)
            .single();
        
        if (existing) {
            // Đã có record hôm nay → UPDATE tổng tích lũy mới nhất
            const { error } = await supabase
                .from('daily_stats')
                .update({
                    rank_points_earned: data.rankPoints,
                    kanji_learned: data.kanjiLearned,
                    challenge_score: data.challengeScore,
                    flashcards_learned: data.totalFlashcards || 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            
            if (error) console.error('Update error:', error);
            else console.log('Today stats updated:', data.kanjiLearned);
        } else {
            // Chưa có record hôm nay → INSERT mới
            const { error } = await supabase
                .from('daily_stats')
                .insert({
                    user_id: userId,
                    stat_date: today,
                    rank_points_earned: data.rankPoints,
                    kanji_learned: data.kanjiLearned,
                    challenge_score: data.challengeScore,
                    flashcards_learned: data.totalFlashcards || 0
                });
            
            if (error) console.error('Insert error:', error);
            else console.log('Today stats created:', data.kanjiLearned);
        }
    } catch (error) {
        console.error('Error saving daily stats:', error);
    }
};

// Lấy stats của 1 tháng từ database
const fetchMonthlySnapshots = async (userId, year, month) => {
    if (!userId) return {};
    
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)}`;
    
    try {
        const { data, error } = await supabase
            .from('daily_stats')
            .select('stat_date, rank_points_earned, kanji_learned, challenge_score')
            .eq('user_id', userId)
            .gte('stat_date', startDate)
            .lte('stat_date', endDate);
        
        if (error) throw error;
        
        // Convert array to object keyed by date
        const snapshots = {};
        data?.forEach(item => {
            snapshots[item.stat_date] = {
                rankPoints: item.rank_points_earned || 0,
                kanjiLearned: item.kanji_learned || 0,
                challengeScore: item.challenge_score || 0
            };
        });
        return snapshots;
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        return {};
    }
};

export const useStatistics = (userId) => {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [dailySnapshots, setDailySnapshots] = useState({});
    
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // Navigation
    const goToPrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const goToNextMonth = () => {
        const now = new Date();
        if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())) {
            if (selectedMonth === 11) {
                setSelectedMonth(0);
                setSelectedYear(selectedYear + 1);
            } else {
                setSelectedMonth(selectedMonth + 1);
            }
        }
    };

    const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

    // Fetch user totals và lưu snapshot hôm nay
    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const { data: userInfo } = await supabase
                    .from('users')
                    .select('kanji_learned, rank_points, mastered_kanji, mastered_jukugo, lessons_completed')
                    .eq('id', userId)
                    .single();

                const { data: challengeScores } = await supabase
                    .from('challenge_progress')
                    .select('score')
                    .eq('user_id', userId);

                let totalChallengeScore = 0;
                if (challengeScores) {
                    challengeScores.forEach(item => {
                        totalChallengeScore += item.score || 0;
                    });
                }

                const totalFlashcards = (userInfo?.mastered_kanji?.length || 0) + (userInfo?.mastered_jukugo?.length || 0);

                const currentData = {
                    kanjiLearned: userInfo?.kanji_learned || 0,
                    rankPoints: userInfo?.rank_points || 0,
                    challengeScore: totalChallengeScore,
                    totalFlashcards: totalFlashcards,
                    lessonsCompleted: userInfo?.lessons_completed || 0
                };

                setUserData(currentData);
                
                // Lưu snapshot cho ngày hôm nay vào database
                await saveDailySnapshot(userId, currentData);
                
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
            setLoading(false);
        };
        fetchData();
    }, [userId]);

    // Fetch monthly snapshots khi thay đổi tháng/năm
    useEffect(() => {
        const loadMonthlyData = async () => {
            if (!userId) return;
            const snapshots = await fetchMonthlySnapshots(userId, selectedYear, selectedMonth);
            setDailySnapshots(snapshots);
        };
        loadMonthlyData();
    }, [userId, selectedMonth, selectedYear]);

    // Generate monthly chart data từ database snapshots
    const monthlyData = useMemo(() => {
        const now = new Date();
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const data = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth, day);
            const dateKey = formatDate(date);
            const isToday = date.toDateString() === now.toDateString();
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Lấy snapshot của ngày đó từ database (nếu có)
            const snapshot = dailySnapshots[dateKey];
            
            // Nếu là hôm nay, dùng dữ liệu realtime; ngày khác dùng snapshot từ DB
            const dayData = isToday && userData 
                ? userData 
                : snapshot;

            data.push({
                day,
                month: selectedMonth + 1,
                dayName: dayNames[dayOfWeek],
                isToday,
                isWeekend,
                rankPoints: dayData?.rankPoints || 0,
                kanjiLearned: dayData?.kanjiLearned || 0,
                challengeScore: dayData?.challengeScore || 0
            });
        }
        return data;
    }, [userData, dailySnapshots, selectedMonth, selectedYear]);

    // Monthly totals
    const monthlyTotals = useMemo(() => ({
        rankPoints: monthlyData.reduce((sum, d) => sum + (d.rankPoints || 0), 0),
        kanjiLearned: monthlyData.reduce((sum, d) => sum + (d.kanjiLearned || 0), 0),
        challengeScore: monthlyData.reduce((sum, d) => sum + (d.challengeScore || 0), 0)
    }), [monthlyData]);

    return {
        loading,
        userData,
        monthlyData,
        monthlyTotals,
        selectedMonth,
        selectedYear,
        isCurrentMonth,
        goToPrevMonth,
        goToNextMonth
    };
};

export const getMonthName = (month, year, language) => {
    if (language === 'vi') return `Tháng ${month + 1}/${year}`;
    if (language === 'jp') return `${year}年${month + 1}月`;
    return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};
