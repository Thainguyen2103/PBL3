import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { translations } from '../utils/translations';
import { useStatistics, getMonthName } from '../hooks/useStatistics';
import StatisticsChart from '../components/StatisticsChart';

// --- MASCOT MOOD MAPPING ---
// Use translations for text, this object stores only the corresponding moods
// --- MASCOT MOOD MAPPING ---
// Use translations for text, this object stores only the corresponding moods
const MASCOT_MOODS = {
    newbie: ["welcome", "care", "happy"],
    hardworking: ["proud", "excited", "cheer", "love"],
    progressing: ["excited", "cheer", "proud", "love"],
    comeback: ["sad", "worried", "happy", "care"],
    normal: ["cheer", "happy", "proud", "love"],
    champion: ["excited", "proud", "cheer", "love"],
    // AI Predictive Moods
    predict_milestone: ["excited", "proud", "cheer", "love"],
    warn_dropping: ["worried", "sad", "care", "angry"],
    praise_peak: ["proud", "cheer", "happy", "excited", "love"]
};

// Fallback logic phân loại người dùng (logic tĩnh cũ)
const analyzeLegacyHabit = (userData, monthlyData, todayIdx) => {
    if (!userData) return 'normal';
    const totalKanji = userData.kanjiLearned || 0;
    const totalRankPoints = userData.rankPoints || 0;
    const totalChallengeScore = userData.challengeScore || 0;

    const daysWithData = monthlyData?.filter(d =>
        (d.kanjiLearned > 0 || d.rankPoints > 0 || d.challengeScore > 0)
    ).length || 0;

    const today = todayIdx >= 0 ? monthlyData[todayIdx] : null;
    const learnedToday = today && ((today.kanjiLearned > 0) || (today.rankPoints > 0));

    if (totalKanji < 10) return 'newbie';
    if (totalChallengeScore > 100) return 'champion';
    if (daysWithData >= 5) return 'hardworking';
    if (totalRankPoints > 200) return 'progressing';
    if (daysWithData === 0 && totalKanji > 0 && !learnedToday) return 'comeback';
    return 'normal';
};

// Phân tích dữ liệu biểu đồ để dự đoán bằng Toán học (Data Science / AI)
const analyzeDataAndPredict = (userData, monthlyData, monthlyTotals, prevMonthlyTotals, language = 'vi') => {
    if (!userData || !monthlyData || monthlyData.length === 0) {
        return { type: 'normal', dynamicText: null };
    }

    // Tìm index của hôm nay. Nếu đang xem tháng cũ (không có hôm nay), mặc định phân tích tới ngày cuối cùng của tháng đó.
    let todayIdx = monthlyData.findIndex(d => d.isToday);
    const isCurrentMonth = todayIdx !== -1;
    if (!isCurrentMonth) {
        todayIdx = monthlyData.length - 1;
    }

    const pastAndToday = monthlyData.slice(0, todayIdx + 1);
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const t = translations[language]?.mascot_ai_messages || translations['en'].mascot_ai_messages;
    const formatMsg = (key, params = {}) => {
        const template = pickRandom(t[key] || translations['en'].mascot_ai_messages[key] || [""]);
        return template.replace(/{(\w+)}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
    };
    
    // Tính toán số liệu tổng quát
    const currentTotalPoints = (monthlyTotals.kanjiLearned || 0) + (monthlyTotals.rankPoints || 0) + (monthlyTotals.challengeScore || 0);
    const activeDays = monthlyData.filter(d => (d.kanjiLearned || 0) + (d.rankPoints || 0) + (d.challengeScore || 0) > 0).length;
    const totalDaysInMonth = monthlyData.length;
    const dayProgressNum = isCurrentMonth ? new Date().getDate() : 30; // Cột mốc thời gian

    // ----------------------------------------------------
    // GUARD: Đầu tháng mới chưa có dữ liệu — không phán xét vội
    // ----------------------------------------------------
    const EARLY_MONTH_DAYS = 7;
    if (isCurrentMonth && dayProgressNum <= EARLY_MONTH_DAYS && currentTotalPoints === 0) {
        return { type: 'normal', dynamicText: formatMsg('earlyMonthNoData') };
    }
    if (isCurrentMonth && dayProgressNum <= EARLY_MONTH_DAYS && currentTotalPoints > 0) {
        return { type: 'predict_milestone', dynamicText: formatMsg('earlyMonthGood', { points: currentTotalPoints }) };
    }

    // ----------------------------------------------------
    // KỊCH BẢN 1: SPACED REPETITION VS CRAMMING
    // ----------------------------------------------------
    if ((dayProgressNum >= 20 || !isCurrentMonth) && currentTotalPoints > 20 && activeDays <= 4 && totalDaysInMonth >= 28) {
        return { type: 'warn_dropping', dynamicText: formatMsg('crammingWarn', { points: currentTotalPoints, missedDays: dayProgressNum - activeDays }) };
    }

    if ((dayProgressNum >= 25 || !isCurrentMonth) && activeDays >= 15) {
        return { type: 'champion', dynamicText: formatMsg('spacingChampion', { activeDays, dayProgressNum }) };
    }

    // ----------------------------------------------------
    // KỊCH BẢN 2: CROSS-MONTH ANALYTICS (So sánh chéo liên tháng)
    // ----------------------------------------------------
    if (prevMonthlyTotals && monthlyTotals) {
        const prevTotalPoints = (prevMonthlyTotals.kanjiLearned || 0) + (prevMonthlyTotals.rankPoints || 0) + (prevMonthlyTotals.challengeScore || 0);

        if (prevTotalPoints > 10) {
            if (currentTotalPoints > prevTotalPoints * 1.5 && activeDays > 4) {
                const pct = Math.round((currentTotalPoints/prevTotalPoints)*100 - 100);
                return { type: 'predict_milestone', dynamicText: formatMsg('crossMonthSpike', { pct }) };
            }

            if (dayProgressNum > 15 && currentTotalPoints < prevTotalPoints * 0.4) {
                return { type: 'warn_dropping', dynamicText: formatMsg('crossMonthLag') };
            }

            if (dayProgressNum > 25 && Math.abs(currentTotalPoints - prevTotalPoints) < prevTotalPoints * 0.2 && currentTotalPoints > 50 && activeDays > 4) {
                return { type: 'praise_peak', dynamicText: formatMsg('crossMonthSteady') };
            }
        }
    }

    // ----------------------------------------------------
    // NẾU ĐANG XEM THÁNG CŨ BỊ CHỐT SỔ -> Chỉ tổng kết, không dự báo tương lai
    // ----------------------------------------------------
    if (!isCurrentMonth) {
        if (currentTotalPoints === 0) {
            return { type: 'comeback', dynamicText: formatMsg('eomZero') };
        }

        // Phần thưởng chung (trường hợp bình thường)
        if (currentTotalPoints > 100) {
            return { type: 'champion', dynamicText: formatMsg('eomGood', { points: currentTotalPoints }) };
        }

        return { type: analyzeLegacyHabit(userData, monthlyData, todayIdx), dynamicText: null };
    }

    // ----------------------------------------------------
    // KỊCH BẢN 3: CẢNH BÁO LƯỜI BIẾNG (FLATLINE THEO NGÀY GẦN NHẤT)
    // ----------------------------------------------------
    let missedDays = 0;
    for (let i = pastAndToday.length - 1; i >= 0; i--) {
        const d = pastAndToday[i];
        const activityScore = (d.kanjiLearned || 0) + (d.rankPoints || 0) + (d.challengeScore || 0);
        if (activityScore === 0) missedDays++;
        else break;
    }

    if (missedDays >= 3) {
        return { type: 'warn_dropping', dynamicText: formatMsg('flatlineWarn', { missedDays }) };
    }

    // ----------------------------------------------------
    // PHÂN TÍCH SÂU MỨC ĐỘ THAO TÁC NGÀY (DEEP DAILY)
    // ----------------------------------------------------
    const last7Days = pastAndToday.slice(Math.max(pastAndToday.length - 7, 0));
    const sumKanji7Days = last7Days.reduce((sum, d) => sum + (d.kanjiLearned || 0), 0);
    const avgKanjiPerDay = sumKanji7Days / last7Days.length;

    if (last7Days.length >= 3) {
        const today = last7Days[last7Days.length - 1];
        const yesterday = last7Days[last7Days.length - 2];
        const prevYesterday = last7Days[last7Days.length - 3];
        
        const score0 = (today.kanjiLearned || 0) + (today.rankPoints || 0) + (today.challengeScore || 0);
        const score1 = (yesterday.kanjiLearned || 0) + (yesterday.rankPoints || 0) + (yesterday.challengeScore || 0);
        const score2 = (prevYesterday.kanjiLearned || 0) + (prevYesterday.rankPoints || 0) + (prevYesterday.challengeScore || 0);

        // A. Cú hat-trick gia tốc (Xu hướng tăng 3 ngày liên tiếp)
        if (score0 > score1 && score1 > score2 && score2 > 0) {
            return { type: 'praise_peak', dynamicText: formatMsg('hatTrick') };
        }

        // B. Cú lội ngược dòng sau ngày nghỉ (Comeback)
        if (score1 === 0 && score0 > avgKanjiPerDay * 1.5 && avgKanjiPerDay > 0 && score0 > 5) {
            return { type: 'predict_milestone', dynamicText: formatMsg('comebackGood') };
        }
    }

    // C. Mẫu hình Chiến Thần Cuối Tuần
    if (last7Days.length > 0) {
        const today = last7Days[last7Days.length - 1];
        const scoreToday = (today.kanjiLearned || 0) + (today.rankPoints || 0) + (today.challengeScore || 0);
        if (today.isWeekend && scoreToday > 15) {
            return { type: 'champion', dynamicText: formatMsg('weekendWarrior', { scoreToday }) };
        }
    }

    // D. Khen ngợi tịnh tiến (Peak after flat)
    if (last7Days.length >= 2) {
        const yesterday = last7Days[last7Days.length - 2];
        const today = last7Days[last7Days.length - 1];
        const yesterdayScore = (yesterday.kanjiLearned || 0) + (yesterday.rankPoints || 0);
        const todayScore = (today.kanjiLearned || 0) + (today.rankPoints || 0);
        
        if (yesterdayScore > 15 && todayScore === 0) {
            return { type: 'warn_dropping', dynamicText: formatMsg('peakDrop', { yesterdayScore }) };
        }
    }

    // ----------------------------------------------------
    // KỊCH BẢN 3: DỰ ĐOÁN MỤC TIÊU TƯƠNG LAI (PREDICTIVE AI)
    // ----------------------------------------------------
    if (avgKanjiPerDay >= 1.5) {
        const totalKanji = userData.kanjiLearned || 0;
        const milestones = [50, 100, 200, 300, 500, 1000, 2000, 5000];
        const nextMilestone = milestones.find(m => m > totalKanji);
        
        if (nextMilestone) {
            const kanjiNeeded = nextMilestone - totalKanji;
            const daysNeeded = Math.ceil(kanjiNeeded / avgKanjiPerDay);
            
            if (daysNeeded > 0 && daysNeeded <= 14) {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + daysNeeded);
                const dayOfWeekList = {
                    vi: ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"],
                    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    jp: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
                    cn: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
                    kr: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
                };
                const dayOfWeek = (dayOfWeekList[language] || dayOfWeekList['en'])[futureDate.getDay()];
                const pace = Math.round(avgKanjiPerDay * 10) / 10;

                return { type: 'predict_milestone', dynamicText: formatMsg('predictMilestone', { pace, dayOfWeek, nextMilestone }) };
            }
        }
    }

    return { type: analyzeLegacyHabit(userData, monthlyData, todayIdx), dynamicText: null };
};

const FULL_ANALYSIS_LOCALE = {
    vi: {
        rank: '⚔️ Rank Đấu', kanji: '📖 Sức mạnh Kanji', chal: '🏅 Chiến công',
        noRank: 'Chưa tham chiến tháng này', up: 'Tăng {pct}% so với tháng trước 🔥',
        down: 'Giảm {pct}% so với tháng trước ⚠️', same: 'Tương đương tháng trước',
        noPrior: '{pts} pts – chưa có dữ liệu tháng trước',
        noKanji: 'Chưa học Kanji nào tháng này',
        kanjiOnlyActive: 'Chỉ học {active}/{total} ngày – học dàn đều sẽ nhớ lâu hơn!',
        kanjiUp: '+{pct}% so với tháng trước, tốc độ {avg} chữ/ngày 🚀',
        kanjiDown: 'Giảm {pct}%, tốc độ {avg} chữ/ngày ⚠️',
        kanjiStable: 'Ổn định, tốc độ {avg} chữ/ngày',
        kanjiNoPrior: '{cur} chữ – tốc độ {avg} chữ/ngày',
        noChal: 'Chưa hoàn thành thử thách nào', chalUp: 'Tăng {pct}% thành tích chiến công 🏆',
        chalDown: 'Giảm {pct}% so với tháng trước', chalSame: 'Duy trì ổn định',
        chalNoPrior: '{pts} điểm – chưa có dữ liệu tháng trước',
        oBad: '⚡ Cần cải thiện nhiều hơn tháng này!', oGreat: '🌟 Tháng xuất sắc trên nhiều phương diện!',
        oWarn: '📊 Kết quả ổn, nhưng hãy chú ý điểm yếu bên trên.', oOk: '✅ Kết quả cân bằng và ổn định!'
    },
    en: {
        rank: '⚔️ Ranked', kanji: '📖 Kanji Power', chal: '🏅 Achievements',
        noRank: 'No ranked battles this month', up: 'Up {pct}% vs last month 🔥',
        down: 'Down {pct}% vs last month ⚠️', same: 'Similar to last month',
        noPrior: '{pts} pts – no prior month data',
        noKanji: 'No kanji studied this month',
        kanjiOnlyActive: 'Only {active}/{total} days active – spread it out for better retention!',
        kanjiUp: '+{pct}% vs last month, {avg} kanji/day 🚀',
        kanjiDown: 'Down {pct}%, {avg} kanji/day ⚠️',
        kanjiStable: 'Stable, {avg} kanji/day',
        kanjiNoPrior: '{cur} kanji – {avg}/day',
        noChal: 'No challenges completed', chalUp: 'Up {pct}% in challenge score 🏆',
        chalDown: 'Down {pct}% vs last month', chalSame: 'Maintained',
        chalNoPrior: '{pts} pts – no prior month data',
        oBad: '⚡ Needs significant improvement!', oGreat: '🌟 Outstanding month across the board!',
        oWarn: '📊 Decent results, work on the weak point above.', oOk: '✅ Balanced and stable performance!'
    },
    jp: {
        rank: '⚔️ ランク戦', kanji: '📖 漢字の力', chal: '🏅 実績',
        noRank: '今月はランク戦未参加', up: '先月比 {pct}% アップ 🔥', down: '先月比 {pct}% ダウン ⚠️', same: '先月と同等', noPrior: '{pts} pts – 先月のデータなし',
        noKanji: '今月は漢字を学習していません', kanjiOnlyActive: '{active}/{total} 日のみ学習 – 分散学習がおすすめ！', kanjiUp: '先月比 +{pct}%、ペース {avg} 字/日 🚀',
        kanjiDown: '{pct}% 減、ペース {avg} 字/日 ⚠️', kanjiStable: '安定、ペース {avg} 字/日', kanjiNoPrior: '{cur} 字 – ペース {avg} 字/日',
        noChal: 'チャレンジ未完了', chalUp: '実績スコア {pct}% アップ 🏆', chalDown: '先月比 {pct}% ダウン', chalSame: '安定を維持', chalNoPrior: '{pts} pts – 先月のデータなし',
        oBad: '⚡ 今月はもっと努力が必要です！', oGreat: '🌟 全体的に素晴らしい月です！', oWarn: '📊 まぁまぁの結果ですが、弱点に注意してください。', oOk: '✅ バランス良く安定した結果です！'
    },
    cn: {
        rank: '⚔️ 竞技排名', kanji: '📖 汉字实力', chal: '🏅 战功',
        noRank: '本月未参加排名战', up: '比上个月增加 {pct}% 🔥', down: '比上个月减少 {pct}% ⚠️', same: '与上个月持平', noPrior: '{pts} pts – 无上个月数据',
        noKanji: '本月未学习汉字', kanjiOnlyActive: '仅学习了 {active}/{total} 天 – 分散学习记忆更久！', kanjiUp: '比上月增加 {pct}%，速度 {avg} 字/天 🚀',
        kanjiDown: '减少 {pct}%，速度 {avg} 字/天 ⚠️', kanjiStable: '稳定，速度 {avg} 字/天', kanjiNoPrior: '{cur} 字 – 速度 {avg} 字/天',
        noChal: '未完成任何挑战', chalUp: '战功成绩提升 {pct}% 🏆', chalDown: '比上月减少 {pct}%', chalSame: '保持稳定', chalNoPrior: '{pts} pts – 无上个月数据',
        oBad: '⚡ 本月还需要更多改进！', oGreat: '🌟 各方面都非常出色的一个月！', oWarn: '📊 结果不错，但请注意上面的弱点。', oOk: '✅ 结果平衡且稳定！'
    },
    kr: {
        rank: '⚔️ 랭크전', kanji: '📖 한자 실력', chal: '🏅 업적',
        noRank: '이번 달 랭크전 미참여', up: '지난달 대비 {pct}% 증가 🔥', down: '지난달 대비 {pct}% 감소 ⚠️', same: '지난달과 비슷함', noPrior: '{pts} pts – 이전 데이터 없음',
        noKanji: '이번 달 한자 학습 안 함', kanjiOnlyActive: '{active}/{total}일만 학습 – 나누어 학습하면 더 오래 기억해요!', kanjiUp: '지난달 대비 +{pct}%, 속도 {avg}자/일 🚀',
        kanjiDown: '{pct}% 감소, 속도 {avg}자/일 ⚠️', kanjiStable: '안정적, 속도 {avg}자/일', kanjiNoPrior: '{cur}자 – 속도 {avg}자/일',
        noChal: '완료된 도전 과제 없음', chalUp: '업적 점수 {pct}% 상승 🏆', chalDown: '지난달 대비 {pct}% 감소', chalSame: '안정 유지', chalNoPrior: '{pts} pts – 이전 데이터 없음',
        oBad: '⚡ 이번 달은 더 많은 개선이 필요합니다!', oGreat: '🌟 다방면에서 뛰어난 한 달입니다!', oWarn: '📊 괜찮은 결과지만 위의 약점에 주의하세요.', oOk: '✅ 균형 잡히고 안정적인 결과입니다!'
    }
};

// Phân tích chi tiết 3 chiều: Rank, Kanji, Chiến công
const generateFullAnalysis = (monthlyData, monthlyTotals, prevMonthlyTotals, language = 'vi') => {
    if (!monthlyTotals) return null;

    const loc = FULL_ANALYSIS_LOCALE[language] || FULL_ANALYSIS_LOCALE['en'];
    const rT = (k, p = {}) => loc[k].replace(/{(\w+)}/g, (_, v) => p[v]);

    const activeDays = monthlyData.filter(d => (d.kanjiLearned || 0) + (d.rankPoints || 0) + (d.challengeScore || 0) > 0).length;
    const totalDays = monthlyData.length;
    const todayIsInMonth = monthlyData.some(d => d.isToday);
    const dayProgressNum = todayIsInMonth ? new Date().getDate() : 30;
    const totalPoints = (monthlyTotals.kanjiLearned || 0) + (monthlyTotals.rankPoints || 0) + (monthlyTotals.challengeScore || 0);

    // GUARD: Đầu tháng chưa đủ dữ liệu — không hiển thị phân tích tiêu cực
    if (todayIsInMonth && dayProgressNum <= 7 && totalPoints === 0) return null;

    const prev = prevMonthlyTotals || {};
    const results = [];

    // ---- 1. RANK ĐẤU ----
    const rankCur = monthlyTotals.rankPoints || 0;
    const rankPrev = prev.rankPoints || 0;
    let rankStatus = 'neutral', rankText;
    if (rankCur === 0) {
        rankStatus = 'bad'; rankText = loc.noRank;
    } else if (rankPrev > 0) {
        const pct = Math.round((rankCur - rankPrev) / rankPrev * 100);
        if (pct >= 20) { rankStatus = 'great'; rankText = rT('up', { pct }); }
        else if (pct <= -20) { rankStatus = 'bad'; rankText = rT('down', { pct: Math.abs(pct) }); }
        else { rankStatus = 'ok'; rankText = `${loc.same} (${pct > 0 ? '+' : ''}${pct}%)`; }
    } else {
        rankStatus = 'ok'; rankText = rT('noPrior', { pts: rankCur });
    }
    results.push({ label: loc.rank, value: `${rankCur} pts`, status: rankStatus, note: rankText });

    // ---- 2. SỨC MẠNH KANJI ----
    const kanjiCur = monthlyTotals.kanjiLearned || 0;
    const avgKanji = activeDays > 0 ? (kanjiCur / activeDays).toFixed(1) : 0;
    let kanjiStatus = 'neutral', kanjiText;
    const kanjiPrev = prev.kanjiLearned || 0;
    if (kanjiCur === 0) {
        kanjiStatus = 'bad'; kanjiText = loc.noKanji;
    } else if (activeDays <= 4 && totalDays >= 20) {
        kanjiStatus = 'bad'; kanjiText = rT('kanjiOnlyActive', { active: activeDays, total: totalDays });
    } else if (kanjiPrev > 0) {
        const pct = Math.round((kanjiCur - kanjiPrev) / kanjiPrev * 100);
        if (pct >= 30) { kanjiStatus = 'great'; kanjiText = rT('kanjiUp', { pct, avg: avgKanji }); }
        else if (pct <= -30) { kanjiStatus = 'bad'; kanjiText = rT('kanjiDown', { pct: Math.abs(pct), avg: avgKanji }); }
        else { kanjiStatus = 'ok'; kanjiText = rT('kanjiStable', { avg: avgKanji }); }
    } else {
        kanjiStatus = 'ok'; kanjiText = rT('kanjiNoPrior', { cur: kanjiCur, avg: avgKanji });
    }
    results.push({ label: loc.kanji, value: `${kanjiCur}`, status: kanjiStatus, note: kanjiText });

    // ---- 3. CHIẾN CÔNG ----
    const chalCur = monthlyTotals.challengeScore || 0;
    const chalPrev = prev.challengeScore || 0;
    let chalStatus = 'neutral', chalText;
    if (chalCur === 0) {
        chalStatus = 'bad'; chalText = loc.noChal;
    } else if (chalPrev > 0) {
        const pct = Math.round((chalCur - chalPrev) / chalPrev * 100);
        if (pct >= 20) { chalStatus = 'great'; chalText = rT('chalUp', { pct }); }
        else if (pct <= -20) { chalStatus = 'bad'; chalText = rT('chalDown', { pct: Math.abs(pct) }); }
        else { chalStatus = 'ok'; chalText = `${loc.chalSame} (${pct > 0 ? '+' : ''}${pct}%)`; }
    } else {
        chalStatus = 'ok'; chalText = rT('chalNoPrior', { pts: chalCur });
    }
    results.push({ label: loc.chal, value: `${chalCur} pts`, status: chalStatus, note: chalText });

    // ---- 4. KẾT LUẬN TỔNG THỂ ----
    const badCount = results.filter(r => r.status === 'bad').length;
    const greatCount = results.filter(r => r.status === 'great').length;
    let overallText;
    if (badCount >= 2) overallText = loc.oBad;
    else if (greatCount >= 2) overallText = loc.oGreat;
    else if (badCount === 1 && greatCount === 0) overallText = loc.oWarn;
    else overallText = loc.oOk;

    return { items: results, overall: overallText };
};

// --- MASCOT COMPONENT ---
const Mascot = ({ userData, monthlyData, monthlyTotals, prevMonthlyTotals }) => {
    const { language } = useAppContext();
    const t = translations[language] || translations.vi;
    const [message, setMessage] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    const habitData = useMemo(() => analyzeDataAndPredict(userData, monthlyData, monthlyTotals, prevMonthlyTotals, language), [userData, monthlyData, monthlyTotals, prevMonthlyTotals, language]);
    const fullAnalysis = useMemo(() => generateFullAnalysis(monthlyData, monthlyTotals, prevMonthlyTotals, language), [monthlyData, monthlyTotals, prevMonthlyTotals, language]);

    useEffect(() => { setIsVisible(true); }, [monthlyData]);

    // useEffect chỉ để set câu thoại mặc định từ AI analysis (khi load lần đầu hoặc đổi tháng)
    useEffect(() => {
        const habitType = habitData.type;
        const moods = MASCOT_MOODS[habitType] || MASCOT_MOODS.normal;
        if (habitData.dynamicText) {
            const mood = moods[Math.floor(Math.random() * moods.length)] || "happy";
            setMessage({ text: habitData.dynamicText, mood });
        } else {
            const tMessages = t.mascot_messages?.[habitType] || t.mascot_messages?.normal || [];
            if (tMessages.length > 0) {
                const randomIndex = Math.floor(Math.random() * tMessages.length);
                const mood = moods[randomIndex % moods.length] || "happy";
                setMessage({ text: tMessages[randomIndex], mood });
            }
        }
    }, [habitData, t]);

    if (!isVisible || !message) return null;

    // Biểu cảm
    const getEyeExpression = () => {
        switch (message.mood) {
            case 'sad': case 'worried': return { eyeRy: 3, eyeY: 27 };
            case 'excited': return { eyeRy: 5, eyeY: 25 };
            case 'angry': return { eyeRy: 2, eyeY: 27 };
            case 'love': return { eyeRy: 5, eyeY: 26 };
            default: return { eyeRy: 4, eyeY: 26 };
        }
    };
    const getMouthExpression = () => {
        switch (message.mood) {
            case 'sad': case 'worried': return "M28 39 Q32 35 36 39";
            case 'excited': return "M26 36 Q32 44 38 36";
            case 'proud': case 'love': return "M27 37 Q32 42 37 37";
            case 'angry': return "M28 38 Q32 35 36 38";
            default: return "M28 37 Q32 40 36 37";
        }
    };

    const { eyeRy, eyeY } = getEyeExpression();
    const mouthPath = getMouthExpression();

    return (
        <div className="fixed bottom-8 right-8 z-50 flex items-end gap-3 animate-bounce-in">
            {/* Speech Bubble */}
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[300px]">
                <button onClick={() => setIsVisible(false)} className="absolute -top-2 -right-2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-500 text-sm transition-colors">✕</button>
                {/* Câu thoại AI chính */}
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3">{message.text}</p>
                {/* Phân tích 3 chiều ngắn gọn */}
                {fullAnalysis && (
                    <div className="border-t border-slate-100 pt-2 space-y-1">
                        {fullAnalysis.items.map((item, i) => {
                            const dot = item.status === 'great' ? '🟢' : item.status === 'bad' ? '🔴' : '🟡';
                            return (
                                <p key={i} className="text-[11px] text-slate-600 leading-snug">
                                    {dot} <span className="font-semibold">{item.label}:</span> {item.note}
                                </p>
                            );
                        })}
                    </div>
                )}
                <div className="absolute -right-2 bottom-6 w-5 h-5 bg-white border-r border-b border-gray-100 transform rotate-[-45deg]"></div>
            </div>

            {/* Mascot Character - Cute Shiba */}
            <div className="w-24 h-24 relative">
                <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
                    {/* Body */}
                    <ellipse cx="32" cy="48" rx="18" ry="12" fill="#F4A460" />
                    {/* Head */}
                    <circle cx="32" cy="28" r="20" fill="#F4A460" />
                    {/* Face (cream color) */}
                    <ellipse cx="32" cy="32" rx="14" ry="12" fill="#FFF8DC" />
                    {/* Left Ear */}
                    <path d="M12 18 Q8 4 20 12 Q16 18 12 18Z" fill="#F4A460" />
                    <path d="M14 16 Q12 8 20 13" fill="#FFB6C1" opacity="0.6" />
                    {/* Right Ear */}
                    <path d="M52 18 Q56 4 44 12 Q48 18 52 18Z" fill="#F4A460" />
                    <path d="M50 16 Q52 8 44 13" fill="#FFB6C1" opacity="0.6" />
                    {/* Lông mày tức giận hoặc quyết tâm */}
                    {(message.mood === 'angry' || message.mood === 'determined') && (
                        <>
                            <path d="M18 25 L26 27" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
                            <path d="M46 25 L38 27" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
                        </>
                    )}

                    {/* Mồ hôi hột khi lo lắng */}
                    {message.mood === 'worried' && (
                        <path d="M16 18 Q16 22 18 22 Q20 22 20 18 Q20 16 18 14 Q16 16 16 18 Z" fill="#87CEFA" opacity="0.8" />
                    )}

                    {/* Eyes - Dynamic based on mood */}
                    {message.mood === 'love' ? (
                        <>
                            {/* Mắt trái tim */}
                            <path d="M21 24 Q24 21 27 24 Q30 21 33 24 L27 30 Z" fill="#FF1493" transform="scale(0.6) translate(14, 18)" />
                            <path d="M21 24 Q24 21 27 24 Q30 21 33 24 L27 30 Z" fill="#FF1493" transform="scale(0.6) translate(40, 18)" />
                        </>
                    ) : (
                        <>
                            <ellipse cx="24" cy={eyeY} rx="3" ry={eyeRy} fill="#2D2D2D" />
                            <ellipse cx="40" cy={eyeY} rx="3" ry={eyeRy} fill="#2D2D2D" />
                            {(message.mood !== 'angry' && message.mood !== 'sad') && (
                                <>
                                    <circle cx="25" cy={eyeY - 1} r="1" fill="white" />
                                    <circle cx="41" cy={eyeY - 1} r="1" fill="white" />
                                </>
                            )}
                        </>
                    )}

                    {/* Sparkle eyes for excited mood */}
                    {message.mood === 'excited' && (
                        <>
                            <path d="M22 22 L24 20 L26 22 L24 24 Z" fill="#FFD700" />
                            <path d="M38 22 L40 20 L42 22 L40 24 Z" fill="#FFD700" />
                        </>
                    )}
                    {/* Tears for sad mood */}
                    {message.mood === 'sad' && (
                        <>
                            <ellipse cx="20" cy="30" rx="2" ry="3" fill="#87CEEB" opacity="0.7" />
                            <ellipse cx="44" cy="30" rx="2" ry="3" fill="#87CEEB" opacity="0.7" />
                        </>
                    )}
                    
                    {/* Hơi thở tức giận */}
                    {message.mood === 'angry' && (
                        <>
                            <path d="M26 31 Q22 28 24 26" stroke="#E6E6FA" strokeWidth="1.5" fill="none" opacity="0.8" />
                            <path d="M38 31 Q42 28 40 26" stroke="#E6E6FA" strokeWidth="1.5" fill="none" opacity="0.8" />
                        </>
                    )}
                    {/* Nose */}
                    <ellipse cx="32" cy="33" rx="3" ry="2" fill="#2D2D2D" />
                    {/* Mouth - Dynamic based on mood */}
                    <path d={mouthPath} stroke="#2D2D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    {/* Blush */}
                    <ellipse cx="18" cy="32" rx="4" ry="2" fill="#FFB6C1" opacity="0.5" />
                    <ellipse cx="46" cy="32" rx="4" ry="2" fill="#FFB6C1" opacity="0.5" />
                    {/* Tail - wagging for happy moods */}
                    <path d="M50 48 Q62 40 56 50 Q54 54 50 52" fill="#F4A460" className={message.mood === 'excited' ? 'animate-wag' : ''} />
                </svg>
            </div>
        </div>
    );
};

// --- ICONS ---
const Icons = {
    Back: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
    ),
    // Gamepad icon - Rank Đấu
    Gamepad: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" /><rect x="2" y="6" width="20" height="12" rx="2" />
        </svg>
    ),
    // Swords icon - Chiến công
    Swords: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" /><line x1="13" y1="19" x2="19" y2="13" /><line x1="16" y1="16" x2="20" y2="20" /><line x1="19" y1="21" x2="21" y2="19" /><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" /><line x1="5" y1="14" x2="9" y2="18" /><line x1="7" y1="17" x2="4" y2="20" /><line x1="3" y1="19" x2="5" y2="21" />
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
const StatCard = ({ icon, title, value, monthlyValue, prevMonthlyValue, subtitle, color, bgColor }) => {
    let trendElement = null;
    if (prevMonthlyValue !== undefined && monthlyValue !== undefined) {
        let percent = 0;
        if (prevMonthlyValue > 0) {
            percent = Math.round(((monthlyValue - prevMonthlyValue) / prevMonthlyValue) * 100);
        } else if (monthlyValue > 0) {
            percent = 100;
        }
        if (percent > 0) {
            trendElement = <span className="text-[10px] font-bold text-green-700 bg-green-200/70 px-1.5 py-0.5 rounded ml-2">▲ {percent}%</span>;
        } else if (percent < 0) {
            trendElement = <span className="text-[10px] font-bold text-red-700 bg-red-200/70 px-1.5 py-0.5 rounded ml-2">▼ {Math.abs(percent)}%</span>;
        } else {
            trendElement = <span className="text-[10px] font-bold text-gray-600 bg-gray-200/70 px-1.5 py-0.5 rounded ml-2">▬ 0%</span>;
        }
    }
    return (
        <div className={`${bgColor} rounded-xl p-3 border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
                <div className={`w-10 h-10 rounded-lg ${color} bg-white/80 flex items-center justify-center shadow-sm shrink-0`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="text-2xl font-black text-slate-800">{value.toLocaleString()}</div>
                    <div className="text-xs text-slate-600 font-medium truncate flex items-center">
                        {title} • {monthlyValue > 0 ? `+${monthlyValue} ` : ''}{subtitle} {trendElement}
                    </div>
                </div>
            </div>
        </div>
    );
};

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
        prevMonthlyTotals,
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
                            <rect x="4" y="12" width="3" height="6" rx="1" fill="white" opacity="0.9" />
                            <rect x="8.5" y="8" width="3" height="10" rx="1" fill="white" opacity="0.95" />
                            <rect x="13" y="10" width="3" height="8" rx="1" fill="white" opacity="0.9" />
                            <rect x="17.5" y="6" width="3" height="12" rx="1" fill="white" />
                            <path d="M5.5 11 L10 7 L14.5 9 L19 5" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="19" cy="5" r="1.5" fill="#FCD34D" />
                            <defs>
                                <linearGradient id="statsGradHeader" x1="1" y1="3" x2="23" y2="21" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#06B6D4" />
                                    <stop offset="1" stopColor="#0891B2" />
                                </linearGradient>
                            </defs>
                        </svg>
                        {t.stats_title || 'Thống kê học tập'}
                    </h1>
                    <div className="w-20" />
                </div>
            </header>

            <main className="px-6 py-4 space-y-4">
                {/* Stats Cards with MoM Data Science Comparisons */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={<Icons.Gamepad />} title={t.stats_rank_battle || 'Rank Đấu'} value={totalStats.rankPoints} monthlyValue={monthlyTotals?.rankPoints || 0} prevMonthlyValue={prevMonthlyTotals?.rankPoints || 0} subtitle={t.stats_pts || 'pts'} color="text-orange-600" bgColor="bg-gradient-to-br from-orange-50 to-orange-100/50" />
                    <StatCard icon={<Icons.Kanji />} title={t.stats_power || 'Sức mạnh'} value={totalStats.kanjiLearned} monthlyValue={monthlyTotals?.kanjiLearned || 0} prevMonthlyValue={prevMonthlyTotals?.kanjiLearned || 0} subtitle={t.stats_kanji_unit || 'Hán tự'} color="text-cyan-600" bgColor="bg-gradient-to-br from-cyan-50 to-cyan-100/50" />
                    <StatCard icon={<Icons.Swords />} title={t.stats_achievements_label || 'Chiến công'} value={totalStats.challengeScore} monthlyValue={monthlyTotals?.challengeScore || 0} prevMonthlyValue={prevMonthlyTotals?.challengeScore || 0} subtitle={t.stats_score_unit || 'điểm'} color="text-purple-600" bgColor="bg-gradient-to-br from-purple-50 to-purple-100/50" />
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
            <Mascot userData={userData} monthlyData={monthlyData} monthlyTotals={monthlyTotals} prevMonthlyTotals={prevMonthlyTotals} />
        </div>
    );
};

export default StatisticsPage;
