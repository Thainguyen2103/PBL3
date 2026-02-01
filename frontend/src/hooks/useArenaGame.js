import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import * as wanakana from 'wanakana';
import kanjiBase from '../utils/kanji-base.json';
import jukugoData from '../utils/jukugo-data.json';

const ITEMS_PER_LESSON = 16;
const WINNING_SCORE = 20;

/**
 * Hook quản lý Arena Game - Cơ chế "Ai đúng trước thắng"
 * - Host generate câu hỏi và broadcast cho tất cả
 * - Tất cả cùng thấy 1 câu hỏi
 * - Ai trả lời đúng TRƯỚC được điểm
 * - Hiển thị đáp án đúng cho tất cả khi có người trả lời đúng
 * - Người đầu tiên đạt 10 điểm thắng
 */
export const useArenaGame = (matchId, players, user, config) => {
    // === GAME STATE ===
    const [gamePhase, setGamePhase] = useState('LOADING'); // LOADING | COUNTDOWN | PLAYING | FINISHED
    const [countdown, setCountdown] = useState(3);
    
    // === QUESTION STATE ===
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    
    // === SCORES ===
    const [scores, setScores] = useState({});
    
    // === ANSWER STATE ===
    const [inputValue, setInputValue] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [roundWinner, setRoundWinner] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [myAnswerStatus, setMyAnswerStatus] = useState(null);
    
    // === RESULT ===
    const [gameResult, setGameResult] = useState(null);
    const [winner, setWinner] = useState(null);
    
    // === FORFEIT ===
    const [forfeitedPlayers, setForfeitedPlayers] = useState([]); // IDs of players who forfeited
    
    // === SKIP VOTE ===
    const [skipVotes, setSkipVotes] = useState([]); // IDs of players who voted to skip
    
    // === MCQ WRONG TRACKING ===
    const [mcqWrongPlayers, setMcqWrongPlayers] = useState([]); // IDs of players who answered wrong in MCQ
    const [myWrongAnswer, setMyWrongAnswer] = useState(null); // The wrong option I selected

    // === REFS ===
    const channelRef = useRef(null);
    const forfeitedPlayersRef = useRef([]);
    const skipVotesRef = useRef([]);
    const mcqWrongPlayersRef = useRef([]);
    const hasFinishedRef = useRef(false);
    const questionsRef = useRef([]);
    const currentQRef = useRef(0);
    const scoresRef = useRef({});
    const isLockedRef = useRef(false);
    const isHostRef = useRef(false);
    const hasReceivedQuestionsRef = useRef(false);
    const gamePhaseRef = useRef('LOADING');
    const countdownIntervalRef = useRef(null); // To clear countdown when game ends

    // === DETERMINE HOST ===
    const getHostId = useCallback(() => {
        if (!players || players.length === 0) return null;
        const sorted = [...players].sort((a, b) => String(a.id).localeCompare(String(b.id)));
        return sorted[0]?.id;
    }, [players]);

    // === HELPER: Parse readings ===
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

    // === HELPER: Parse readings with labels ===
    const parseReadingsWithLabels = (item) => {
        let parts = [];
        if (item.kunyomi && item.kunyomi !== "-") {
            const kuns = item.kunyomi.split(',').map(s => s.split('(')[0].replace(/\./g, '').trim());
            if (kuns.length > 0 && kuns[0]) {
                parts.push(`Kun: ${kuns.join(', ')}`);
            }
        }
        if (item.onyomi && item.onyomi !== "-") {
            const ons = item.onyomi.split(',').map(s => {
                const clean = s.split('(')[0].replace(/\./g, '').trim();
                return wanakana.toHiragana(clean);
            });
            if (ons.length > 0 && ons[0]) {
                parts.push(`On: ${ons.join(', ')}`);
            }
        }
        return parts.join(' | ');
    };

    // === HELPER: Generate MCQ options với format đầy đủ và cùng độ dài ===
    const generateMCQOptions = useCallback((item, isMeaning, isSingle, sourceArray) => {
        // Lấy độ dài kanji của item chính
        const targetLength = item.kanji?.length || 1;
        
        // Lọc các distractor có cùng độ dài kanji trước
        let sameLengthItems = sourceArray.filter(k => 
            k.kanji !== item.kanji && 
            k.kanji?.length === targetLength
        );
        
        // Nếu không đủ 3 distractor cùng độ dài, lấy thêm từ độ dài gần nhất
        if (sameLengthItems.length < 3) {
            const nearbyLengthItems = sourceArray.filter(k => 
                k.kanji !== item.kanji && 
                Math.abs((k.kanji?.length || 1) - targetLength) <= 1
            );
            sameLengthItems = [...sameLengthItems, ...nearbyLengthItems];
        }
        
        // Shuffle và chọn 3 distractor
        const distractors = sameLengthItems
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(d => {
                if (isMeaning) {
                    // Format: "Hán Việt - Nghĩa" cho cả kanji lẻ và jukugo
                    const hanviet = d.hanviet || '';
                    const mean = d.mean || '';
                    return { 
                        text: hanviet ? `${hanviet} - ${mean}` : mean, 
                        isCorrect: false 
                    };
                } else {
                    // Format cách đọc với Kun/On labels cho kanji, hiragana cho jukugo
                    if (isSingle) {
                        const readingsText = parseReadingsWithLabels(d);
                        return { text: readingsText || '-', isCorrect: false };
                    } else {
                        return { text: d.hiragana || '-', isCorrect: false };
                    }
                }
            });
        
        let correctText;
        if (isMeaning) {
            // Format: "Hán Việt - Nghĩa"
            const hanviet = item.hanviet || '';
            const mean = item.mean || '';
            correctText = hanviet ? `${hanviet} - ${mean}` : mean;
        } else {
            if (isSingle) {
                // Hiển thị với Kun/On labels
                correctText = parseReadingsWithLabels(item);
            } else {
                correctText = item.hiragana;
            }
        }
        
        const options = [...distractors, { text: correctText, isCorrect: true }]
            .sort(() => 0.5 - Math.random());
        
        return options;
    }, []);

    // === GENERATE QUESTIONS (only host does this) ===
    const generateQuestions = useCallback(() => {
        const lessonId = config?.lesson || 1;
        
        const startIndex = (lessonId - 1) * ITEMS_PER_LESSON;
        const endIndex = startIndex + ITEMS_PER_LESSON;
        const singleData = kanjiBase.slice(startIndex, endIndex);
        const compoundData = jukugoData.filter(j => j.lesson === lessonId);

        let allQuestions = [];

        singleData.forEach((item, idx) => {
            // 50% MCQ, 50% Writing
            const isMCQ_meaning = Math.random() > 0.5;
            const isMCQ_reading = Math.random() > 0.5;
            
            // Hỏi nghĩa
            const meaningQ = {
                id: `k_m_${idx}`,
                question: item.kanji,
                type: 'kanji',
                mode: isMCQ_meaning ? 'mcq' : 'writing',
                askMeaning: true,
                hint: isMCQ_meaning ? 'CHỌN NGHĨA' : 'NHẬP NGHĨA',
                correctAnswers: [
                    item.hanviet.toLowerCase(),
                    ...item.mean.split(/[,;]/).map(s => s.trim().toLowerCase())
                ],
                displayAnswer: `${item.hanviet} - ${item.mean}`,
                options: isMCQ_meaning ? generateMCQOptions(item, true, true, kanjiBase) : []
            };
            allQuestions.push(meaningQ);
            
            // Hỏi đọc
            const readings = parseReadings(item);
            if (readings.length > 0) {
                const readingQ = {
                    id: `k_r_${idx}`,
                    question: item.kanji,
                    type: 'kanji',
                    mode: isMCQ_reading ? 'mcq' : 'writing',
                    askMeaning: false,
                    hint: isMCQ_reading ? 'CHỌN CÁCH ĐỌC' : 'NHẬP CÁCH ĐỌC',
                    correctAnswers: readings,
                    displayAnswer: readings.join(' / '),
                    options: isMCQ_reading ? generateMCQOptions(item, false, true, kanjiBase) : []
                };
                allQuestions.push(readingQ);
            }
        });

        compoundData.forEach((item, idx) => {
            const isMCQ_meaning = Math.random() > 0.5;
            const isMCQ_reading = Math.random() > 0.5;
            
            // Hỏi nghĩa
            const meaningQ = {
                id: `j_m_${idx}`,
                question: item.kanji,
                type: 'jukugo',
                mode: isMCQ_meaning ? 'mcq' : 'writing',
                askMeaning: true,
                hint: isMCQ_meaning ? 'CHỌN NGHĨA' : 'NHẬP NGHĨA',
                correctAnswers: [
                    item.hanviet?.toLowerCase(),
                    item.mean?.toLowerCase()
                ].filter(Boolean),
                displayAnswer: `${item.hanviet || ''} - ${item.mean}`,
                options: isMCQ_meaning ? generateMCQOptions(item, true, false, jukugoData) : []
            };
            allQuestions.push(meaningQ);
            
            // Hỏi đọc
            if (item.hiragana) {
                const readingQ = {
                    id: `j_r_${idx}`,
                    question: item.kanji,
                    type: 'jukugo',
                    mode: isMCQ_reading ? 'mcq' : 'writing',
                    askMeaning: false,
                    hint: isMCQ_reading ? 'CHỌN CÁCH ĐỌC' : 'NHẬP CÁCH ĐỌC',
                    correctAnswers: [item.hiragana],
                    displayAnswer: item.hiragana,
                    options: isMCQ_reading ? generateMCQOptions(item, false, false, jukugoData) : []
                };
                allQuestions.push(readingQ);
            }
        });

        // Shuffle ngẫu nhiên tốt hơn với Fisher-Yates algorithm
        const shuffleArray = (arr, seed) => {
            const result = [...arr];
            let currentSeed = seed;
            
            // Simple seeded random
            const seededRandom = () => {
                currentSeed = (currentSeed * 9301 + 49297) % 233280;
                return currentSeed / 233280;
            };
            
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        };
        
        const seed = matchId?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || Date.now();
        let shuffled = shuffleArray(allQuestions, seed);
        
        // Đảm bảo không có 2 câu liên tiếp cùng 1 kanji (question)
        const reorderToAvoidDuplicates = (questions) => {
            const result = [];
            const remaining = [...questions];
            
            while (remaining.length > 0) {
                // Tìm câu hỏi không trùng kanji với câu trước
                const lastKanji = result.length > 0 ? result[result.length - 1].question : null;
                
                let foundIdx = remaining.findIndex(q => q.question !== lastKanji);
                
                // Nếu không tìm được, chấp nhận câu đầu tiên
                if (foundIdx === -1) foundIdx = 0;
                
                result.push(remaining[foundIdx]);
                remaining.splice(foundIdx, 1);
            }
            
            return result;
        };
        
        shuffled = reorderToAvoidDuplicates(shuffled);
        
        return shuffled.slice(0, 50);
    }, [config, matchId, generateMCQOptions]);

    // === CHECK ANSWER ===
    const checkAnswer = (answer, question) => {
        if (!question) return false;
        
        // MCQ mode: kiểm tra xem option được chọn có isCorrect không
        if (question.mode === 'mcq' && question.options) {
            const selectedOption = question.options.find(opt => opt.text === answer);
            return selectedOption?.isCorrect === true;
        }
        
        // Writing mode: so sánh với correctAnswers
        const userVal = answer.toLowerCase().trim();
        const userValKana = wanakana.toHiragana(userVal);

        return question.correctAnswers.some(ans => {
            if (!ans) return false;
            const ansLower = ans.toLowerCase();
            return ansLower === userVal ||
                   ansLower === userValKana ||
                   userVal.includes(ansLower) ||
                   ansLower.includes(userVal);
        });
    };

    // === END GAME ===
    const endGame = useCallback(async (winnerPlayer) => {
        if (hasFinishedRef.current) return;
        hasFinishedRef.current = true;
        
        // Clear countdown interval immediately to prevent phase override
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        console.log('🏁 EndGame called for winner:', winnerPlayer?.full_name);
        
        gamePhaseRef.current = 'FINISHED';
        setGamePhase('FINISHED');
        setWinner(winnerPlayer);

        const isWin = String(winnerPlayer?.id) === String(user?.id);
        setGameResult(isWin ? 'WIN' : 'LOSE');

        // Update rank points
        try {
            const { data: currentData } = await supabase
                .from('users')
                .select('rank_points')
                .eq('id', user.id)
                .single();

            const currentPoints = currentData?.rank_points || 0;
            const delta = isWin ? 15 : -5;
            const newPoints = Math.max(0, currentPoints + delta);

            await supabase
                .from('users')
                .update({ rank_points: newPoints })
                .eq('id', user.id);

            console.log(`✅ Updated rank points: ${currentPoints} -> ${newPoints}`);

            // 📊 Cập nhật daily_stats - tracking rank points trong ngày
            if (delta > 0) {
                const now = new Date();
                const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                const { data: existingStat } = await supabase
                    .from('daily_stats')
                    .select('id, rank_points_earned')
                    .eq('user_id', user.id)
                    .eq('stat_date', today)
                    .maybeSingle();
                
                if (existingStat) {
                    await supabase.from('daily_stats').update({
                        rank_points_earned: (existingStat.rank_points_earned || 0) + delta
                    }).eq('id', existingStat.id);
                } else {
                    await supabase.from('daily_stats').insert({
                        user_id: user.id,
                        stat_date: today,
                        rank_points_earned: delta
                    });
                }
                console.log(`✅ Updated daily rank points: +${delta}`);
            }
        } catch (error) {
            console.error('Error updating rank points:', error);
        }
    }, [user]);

    // === INIT GAME ===
    useEffect(() => {
        if (!matchId || !players || !user) return;

        const hostId = getHostId();
        const amIHost = String(user.id) === String(hostId);
        isHostRef.current = amIHost;
        console.log(`🎮 Game init - Am I host: ${amIHost}, Host ID: ${hostId}`);

        // Initialize scores
        const initialScores = {};
        players.forEach(p => {
            initialScores[p.id] = 0;
        });
        setScores(initialScores);
        scoresRef.current = initialScores;

        // Setup realtime channel with Presence
        const channel = supabase.channel(`arena_game_${matchId}`, {
            config: { presence: { key: user.id } }
        });
        
        // Helper function to check if player is forfeited
        const isPlayerForfeited = (playerId, forfeitedList) => {
            return forfeitedList.some(fId => String(fId) === String(playerId));
        };

        channel
            // === DETECT PLAYER LEAVE VIA PRESENCE ===
            .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                console.log('👋 Presence leave event:', leftPresences);
                
                if (hasFinishedRef.current) {
                    console.log('⏭️ Game already finished, ignoring leave');
                    return;
                }
                
                // CHỈ xử lý khi game đang PLAYING hoặc COUNTDOWN
                // Không xử lý khi LOADING vì presence có thể chưa stable
                const currentPhase = gamePhaseRef.current;
                if (currentPhase === 'LOADING') {
                    console.log('⏭️ Still in LOADING phase, ignoring presence leave');
                    return;
                }
                
                leftPresences.forEach(presence => {
                    // Presence object có thể có user_id trong data hoặc key là id
                    const leftPlayerId = presence.user_id || presence.presence_ref;
                    console.log('👋 Player left via presence:', leftPlayerId, 'Presence data:', presence);
                    
                    if (!leftPlayerId) {
                        console.log('⚠️ No user_id in presence data');
                        return;
                    }
                    
                    // Kiểm tra xem player này có trong danh sách players không
                    const isValidPlayer = players?.some(p => String(p.id) === String(leftPlayerId));
                    if (!isValidPlayer) {
                        console.log('⚠️ Left player not in players list, ignoring');
                        return;
                    }
                    
                    // Không đánh dấu chính mình là forfeited qua presence
                    if (String(leftPlayerId) === String(user.id)) {
                        console.log('⚠️ Cannot forfeit self via presence');
                        return;
                    }
                    
                    // Thêm vào danh sách đầu hàng
                    const newForfeited = [...forfeitedPlayersRef.current];
                    if (!isPlayerForfeited(leftPlayerId, newForfeited)) {
                        newForfeited.push(String(leftPlayerId));
                        forfeitedPlayersRef.current = newForfeited;
                        setForfeitedPlayers([...newForfeited]);
                        
                        // Kiểm tra còn bao nhiêu người chơi active
                        const activePlayers = players?.filter(p => !isPlayerForfeited(p.id, newForfeited));
                        
                        console.log('👥 Active players remaining:', activePlayers?.length, 'Forfeited:', newForfeited);
                        
                        // Nếu chỉ còn 1 người → người đó thắng
                        if (activePlayers?.length === 1 && !hasFinishedRef.current) {
                            console.log('🏆 Last player standing:', activePlayers[0].full_name);
                            endGame(activePlayers[0]);
                        }
                    }
                });
            })
            // === NHẬN CÂU HỎI TỪ HOST ===
            .on('broadcast', { event: 'QUESTIONS_SYNC' }, ({ payload }) => {
                console.log('📥 Received questions from host:', payload.questions?.length);
                if (!hasReceivedQuestionsRef.current && payload.questions) {
                    hasReceivedQuestionsRef.current = true;
                    questionsRef.current = payload.questions;
                    setQuestions(payload.questions);
                    if (payload.questions.length > 0) {
                        setCurrentQuestion(payload.questions[0]);
                    }
                }
            })
            // === CÓ NGƯỜI TRẢ LỜI ĐÚNG (nhận từ người khác) ===
            .on('broadcast', { event: 'CORRECT_ANSWER' }, ({ payload }) => {
                console.log('🎯 Received CORRECT_ANSWER from:', payload.odlName);
                
                // Bỏ qua nếu đây là message của chính mình (đã xử lý local rồi)
                if (String(payload.odlId) === String(user.id)) {
                    console.log('⏭️ Skipping - this is my own broadcast');
                    return;
                }
                
                // Lock ngay lập tức
                setIsLocked(true);
                isLockedRef.current = true;
                
                // Cập nhật điểm
                const newScores = { ...scoresRef.current };
                newScores[payload.odlId] = (newScores[payload.odlId] || 0) + 1;
                scoresRef.current = newScores;
                setScores({...newScores});
                
                // Hiển thị người thắng và đáp án đúng
                setRoundWinner({
                    odlId: payload.odlId,
                    odlName: payload.odlName,
                    answer: payload.correctAnswer
                });
                setShowAnswer(true);
                
                // Kiểm tra thắng game
                if (newScores[payload.odlId] >= WINNING_SCORE) {
                    const winnerPlayer = players.find(p => String(p.id) === String(payload.odlId));
                    setTimeout(() => endGame(winnerPlayer), 2000);
                } else {
                    // HOST gửi lệnh chuyển câu sau 2.5 giây
                    if (isHostRef.current) {
                        setTimeout(() => {
                            const nextIndex = currentQRef.current + 1;
                            console.log('📤 Host sending NEXT_QUESTION:', nextIndex);
                            channel.send({
                                type: 'broadcast',
                                event: 'NEXT_QUESTION',
                                payload: { questionIndex: nextIndex }
                            });
                            // Host cũng tự chuyển câu (vì không nhận lại broadcast của mình)
                            if (nextIndex < questionsRef.current.length) {
                                currentQRef.current = nextIndex;
                                setCurrentQ(nextIndex);
                                setCurrentQuestion(questionsRef.current[nextIndex]);
                                setIsLocked(false);
                                isLockedRef.current = false;
                                setRoundWinner(null);
                                setShowAnswer(false);
                                setInputValue('');
                                setMyAnswerStatus(null);
                            }
                        }, 2500);
                    }
                }
            })
            // === CHUYỂN CÂU TIẾP THEO ===
            .on('broadcast', { event: 'NEXT_QUESTION' }, ({ payload }) => {
                console.log('➡️ Next question:', payload.questionIndex);
                const nextIndex = payload.questionIndex;
                
                if (nextIndex < questionsRef.current.length) {
                    currentQRef.current = nextIndex;
                    setCurrentQ(nextIndex);
                    setCurrentQuestion(questionsRef.current[nextIndex]);
                    setIsLocked(false);
                    isLockedRef.current = false;
                    setRoundWinner(null);
                    setShowAnswer(false);
                    setInputValue('');
                    setMyAnswerStatus(null);
                    // Reset skip votes cho câu mới
                    skipVotesRef.current = [];
                    setSkipVotes([]);
                    // Reset MCQ wrong players cho câu mới
                    mcqWrongPlayersRef.current = [];
                    setMcqWrongPlayers([]);
                    setMyWrongAnswer(null);
                } else {
                    // Hết câu hỏi - người có điểm cao nhất thắng
                    const maxScore = Math.max(...Object.values(scoresRef.current));
                    const winnerId = Object.keys(scoresRef.current).find(id => scoresRef.current[id] === maxScore);
                    const winnerPlayer = players?.find(p => String(p.id) === String(winnerId));
                    endGame(winnerPlayer);
                }
            })
            // === VOTE BỎ QUA CÂU HỎI ===
            .on('broadcast', { event: 'VOTE_SKIP' }, ({ payload }) => {
                console.log('🗳️ Vote skip received from:', payload.playerName);
                
                if (hasFinishedRef.current || isLockedRef.current) {
                    console.log('⏭️ Already locked or finished, ignoring vote');
                    return;
                }
                
                // Thêm vote
                const newVotes = [...skipVotesRef.current];
                if (!newVotes.includes(String(payload.playerId))) {
                    newVotes.push(String(payload.playerId));
                    skipVotesRef.current = newVotes;
                    setSkipVotes([...newVotes]);
                    
                    // Đếm số người chơi active (không forfeited)
                    const activePlayers = players?.filter(p => !isPlayerForfeited(p.id, forfeitedPlayersRef.current)) || [];
                    console.log('🗳️ Votes:', newVotes.length, '/', activePlayers.length);
                    
                    // Nếu tất cả đều vote → skip
                    if (newVotes.length >= activePlayers.length && activePlayers.length > 0) {
                        console.log('✅ All players voted to skip!');
                        
                        // Lock để không ai submit được
                        setIsLocked(true);
                        isLockedRef.current = true;
                        
                        // Hiển thị đáp án đúng (không ai được điểm)
                        const currentQ = questionsRef.current[currentQRef.current];
                        setRoundWinner({
                            odlId: null,
                            odlName: 'Tất cả đồng ý bỏ qua',
                            answer: currentQ?.displayAnswer || 'N/A'
                        });
                        setShowAnswer(true);
                        
                        // HOST gửi lệnh chuyển câu sau 2.5 giây
                        if (isHostRef.current) {
                            setTimeout(() => {
                                const nextIndex = currentQRef.current + 1;
                                console.log('📤 Host sending NEXT_QUESTION after vote skip:', nextIndex);
                                channel.send({
                                    type: 'broadcast',
                                    event: 'NEXT_QUESTION',
                                    payload: { questionIndex: nextIndex }
                                });
                                // Host cũng tự chuyển câu
                                if (nextIndex < questionsRef.current.length) {
                                    currentQRef.current = nextIndex;
                                    setCurrentQ(nextIndex);
                                    setCurrentQuestion(questionsRef.current[nextIndex]);
                                    setIsLocked(false);
                                    isLockedRef.current = false;
                                    setRoundWinner(null);
                                    setShowAnswer(false);
                                    setInputValue('');
                                    setMyAnswerStatus(null);
                                    // Reset skip votes cho câu mới
                                    skipVotesRef.current = [];
                                    setSkipVotes([]);
                                }
                            }, 2500);
                        }
                    }
                }
            })
            // === NGƯỜI CHƠI ĐẦU HÀNG ===
            .on('broadcast', { event: 'PLAYER_FORFEIT' }, ({ payload }) => {
                console.log('🏳️ Player forfeited:', payload.playerName, 'ID:', payload.playerId);
                
                if (hasFinishedRef.current) {
                    console.log('⏭️ Game already finished, ignoring forfeit');
                    return;
                }
                
                // Thêm vào danh sách đầu hàng
                const newForfeited = [...forfeitedPlayersRef.current];
                if (!isPlayerForfeited(payload.playerId, newForfeited)) {
                    newForfeited.push(String(payload.playerId));
                    forfeitedPlayersRef.current = newForfeited;
                    setForfeitedPlayers([...newForfeited]);
                    
                    // Kiểm tra còn bao nhiêu người chơi active
                    const activePlayers = players?.filter(p => !isPlayerForfeited(p.id, newForfeited));
                    
                    console.log('👥 Active players remaining:', activePlayers?.length, 'Forfeited:', newForfeited, 'All players:', players?.map(p => p.id));
                    
                    // Nếu chỉ còn 1 người → người đó thắng
                    if (activePlayers?.length === 1 && !hasFinishedRef.current) {
                        console.log('🏆 Last player standing:', activePlayers[0].full_name);
                        endGame(activePlayers[0]);
                    }
                }
            })
            // === MCQ TRẢ LỜI SAI ===
            .on('broadcast', { event: 'MCQ_WRONG_ANSWER' }, ({ payload }) => {
                console.log('❌ MCQ wrong answer from:', payload.playerName);
                
                if (hasFinishedRef.current || isLockedRef.current) {
                    return;
                }
                
                // Bỏ qua nếu đây là message của chính mình (đã xử lý local rồi)
                if (String(payload.playerId) === String(user.id)) {
                    return;
                }
                
                // Thêm vào danh sách đã trả lời sai
                const newWrongPlayers = [...mcqWrongPlayersRef.current];
                if (!newWrongPlayers.includes(String(payload.playerId))) {
                    newWrongPlayers.push(String(payload.playerId));
                    mcqWrongPlayersRef.current = newWrongPlayers;
                    setMcqWrongPlayers([...newWrongPlayers]);
                    
                    // Kiểm tra xem tất cả active players đều đã sai chưa
                    const activePlayers = players?.filter(p => !isPlayerForfeited(p.id, forfeitedPlayersRef.current)) || [];
                    const allWrong = activePlayers.every(p => newWrongPlayers.includes(String(p.id)));
                    
                    console.log('👥 Wrong players:', newWrongPlayers.length, '/', activePlayers.length, 'All wrong:', allWrong);
                    
                    if (allWrong && activePlayers.length > 0) {
                        console.log('❌ All players answered wrong! Showing answer...');
                        
                        // Lock và hiển thị đáp án
                        setIsLocked(true);
                        isLockedRef.current = true;
                        
                        const currentQ = questionsRef.current[currentQRef.current];
                        setRoundWinner({
                            odlId: null,
                            odlName: 'Không ai trả lời đúng',
                            answer: currentQ?.displayAnswer || 'N/A'
                        });
                        setShowAnswer(true);
                        
                        // HOST gửi lệnh chuyển câu sau 2.5 giây
                        if (isHostRef.current) {
                            setTimeout(() => {
                                const nextIndex = currentQRef.current + 1;
                                channel.send({
                                    type: 'broadcast',
                                    event: 'NEXT_QUESTION',
                                    payload: { questionIndex: nextIndex }
                                });
                                // Host cũng tự chuyển câu
                                if (nextIndex < questionsRef.current.length) {
                                    currentQRef.current = nextIndex;
                                    setCurrentQ(nextIndex);
                                    setCurrentQuestion(questionsRef.current[nextIndex]);
                                    setIsLocked(false);
                                    isLockedRef.current = false;
                                    setRoundWinner(null);
                                    setShowAnswer(false);
                                    setInputValue('');
                                    setMyAnswerStatus(null);
                                    mcqWrongPlayersRef.current = [];
                                    setMcqWrongPlayers([]);
                                    setMyWrongAnswer(null);
                                    skipVotesRef.current = [];
                                    setSkipVotes([]);
                                }
                            }, 2500);
                        }
                    }
                }
            })
            // === BẮT ĐẦU COUNTDOWN ===
            .on('broadcast', { event: 'START_COUNTDOWN' }, () => {
                if (hasFinishedRef.current) return; // Don't start if game already ended
                
                console.log('⏱️ Starting countdown');
                gamePhaseRef.current = 'COUNTDOWN';
                setGamePhase('COUNTDOWN');
                let count = 3;
                setCountdown(count);
                
                // Clear any existing countdown
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
                
                countdownIntervalRef.current = setInterval(() => {
                    // Check if game ended during countdown
                    if (hasFinishedRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                        return;
                    }
                    
                    count--;
                    setCountdown(count);
                    if (count <= 0) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                        
                        if (!hasFinishedRef.current) {
                            gamePhaseRef.current = 'PLAYING';
                            setGamePhase('PLAYING');
                            console.log('🎮 Game phase is now PLAYING');
                        }
                    }
                }, 1000);
            })
            // === YÊU CẦU QUESTIONS (client gửi khi đã subscribe) ===
            .on('broadcast', { event: 'REQUEST_QUESTIONS' }, ({ payload }) => {
                console.log('📨 Received request for questions from:', payload.requesterId);
                // Chỉ host mới respond
                if (amIHost && questionsRef.current.length > 0) {
                    console.log('📤 Re-sending questions to requester');
                    channel.send({
                        type: 'broadcast',
                        event: 'QUESTIONS_SYNC',
                        payload: { questions: questionsRef.current }
                    });
                }
            })
            .subscribe(async (status) => {
                console.log('📡 Game channel status:', status);
                if (status === 'SUBSCRIBED') {
                    // Track presence để detect khi ai đó rời game
                    await channel.track({ 
                        user_id: user.id,
                        user_name: user.full_name,
                        online_at: new Date().toISOString()
                    });
                    
                    // Nếu là host, generate và broadcast câu hỏi
                    if (amIHost) {
                        const generatedQuestions = generateQuestions();
                        questionsRef.current = generatedQuestions;
                        hasReceivedQuestionsRef.current = true;
                        setQuestions(generatedQuestions);
                        if (generatedQuestions.length > 0) {
                            setCurrentQuestion(generatedQuestions[0]);
                        }

                        console.log('📤 Host generated questions:', generatedQuestions.length);
                        
                        // Broadcast nhiều lần để đảm bảo client nhận được
                        const broadcastQuestions = () => {
                            channel.send({
                                type: 'broadcast',
                                event: 'QUESTIONS_SYNC',
                                payload: { questions: generatedQuestions }
                            });
                        };
                        
                        // Gửi 3 lần cách nhau 500ms
                        setTimeout(broadcastQuestions, 500);
                        setTimeout(broadcastQuestions, 1000);
                        setTimeout(broadcastQuestions, 1500);
                        
                        // Sau 2 giây, bắt đầu countdown
                        setTimeout(() => {
                            if (hasFinishedRef.current) return; // Don't start if game ended
                            
                            channel.send({
                                type: 'broadcast',
                                event: 'START_COUNTDOWN',
                                payload: {}
                            });
                            // Host cũng trigger countdown cho chính mình
                            gamePhaseRef.current = 'COUNTDOWN';
                            setGamePhase('COUNTDOWN');
                            let count = 3;
                            setCountdown(count);
                            
                            // Clear any existing countdown
                            if (countdownIntervalRef.current) {
                                clearInterval(countdownIntervalRef.current);
                            }
                            
                            countdownIntervalRef.current = setInterval(() => {
                                // Check if game ended during countdown
                                if (hasFinishedRef.current) {
                                    clearInterval(countdownIntervalRef.current);
                                    countdownIntervalRef.current = null;
                                    return;
                                }
                                
                                count--;
                                setCountdown(count);
                                if (count <= 0) {
                                    clearInterval(countdownIntervalRef.current);
                                    countdownIntervalRef.current = null;
                                    
                                    if (!hasFinishedRef.current) {
                                        gamePhaseRef.current = 'PLAYING';
                                        setGamePhase('PLAYING');
                                        console.log('🎮 Host: Game phase is now PLAYING');
                                    }
                                }
                            }, 1000);
                        }, 2000);
                    } else {
                        // Client: yêu cầu questions nếu chưa có
                        setTimeout(() => {
                            if (!hasReceivedQuestionsRef.current) {
                                console.log('📨 Requesting questions from host...');
                                channel.send({
                                    type: 'broadcast',
                                    event: 'REQUEST_QUESTIONS',
                                    payload: { requesterId: user.id }
                                });
                            }
                        }, 800);
                    }
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [matchId, players, user, generateQuestions, endGame, getHostId]);

    // === SUBMIT ANSWER ===
    const submitAnswer = useCallback((answer) => {
        console.log('📝 Submit attempt:', { answer, phase: gamePhaseRef.current, locked: isLockedRef.current });
        
        if (isLockedRef.current) {
            console.log('❌ Cannot submit - question is locked');
            return;
        }
        
        if (gamePhaseRef.current !== 'PLAYING') {
            console.log('❌ Cannot submit - game phase is:', gamePhaseRef.current);
            return;
        }
        
        if (!questionsRef.current[currentQRef.current]) {
            console.log('❌ Cannot submit - no current question');
            return;
        }

        const currentQuestion = questionsRef.current[currentQRef.current];
        const isCorrect = checkAnswer(answer, currentQuestion);

        if (isCorrect) {
            console.log('✅ Correct answer! Broadcasting...');
            
            // Lock ngay để không ai khác có thể submit
            setIsLocked(true);
            isLockedRef.current = true;
            setMyAnswerStatus('correct');
            
            const payload = {
                odlId: user.id,
                odlName: user.full_name,
                questionId: currentQuestion.id,
                correctAnswer: currentQuestion.displayAnswer
            };
            
            // Broadcast to everyone
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'CORRECT_ANSWER',
                    payload
                });
            }
            
            // === XỬ LÝ LOCAL (vì sender không nhận lại broadcast của chính mình) ===
            // Cập nhật điểm
            const newScores = { ...scoresRef.current };
            newScores[user.id] = (newScores[user.id] || 0) + 1;
            scoresRef.current = newScores;
            setScores({...newScores});
            
            // Hiển thị đáp án
            setRoundWinner({
                odlId: user.id,
                odlName: user.full_name,
                answer: currentQuestion.displayAnswer
            });
            setShowAnswer(true);
            
            // Kiểm tra thắng game
            if (newScores[user.id] >= WINNING_SCORE) {
                const winnerPlayer = players?.find(p => String(p.id) === String(user.id));
                setTimeout(() => endGame(winnerPlayer), 2000);
            } else {
                // Nếu là HOST, gửi lệnh chuyển câu sau 2.5 giây
                if (isHostRef.current && channelRef.current) {
                    setTimeout(() => {
                        const nextIndex = currentQRef.current + 1;
                        console.log('📤 Host sending NEXT_QUESTION:', nextIndex);
                        channelRef.current.send({
                            type: 'broadcast',
                            event: 'NEXT_QUESTION',
                            payload: { questionIndex: nextIndex }
                        });
                        // Host cũng tự chuyển câu
                        if (nextIndex < questionsRef.current.length) {
                            currentQRef.current = nextIndex;
                            setCurrentQ(nextIndex);
                            setCurrentQuestion(questionsRef.current[nextIndex]);
                            setIsLocked(false);
                            isLockedRef.current = false;
                            setRoundWinner(null);
                            setShowAnswer(false);
                            setInputValue('');
                            setMyAnswerStatus(null);
                        }
                    }, 2500);
                }
            }
        } else {
            console.log('❌ Wrong answer');
            
            const currentQuestion = questionsRef.current[currentQRef.current];
            
            // MCQ mode: khóa luôn không cho chọn nữa
            if (currentQuestion?.mode === 'mcq') {
                setMyAnswerStatus('wrong');
                setMyWrongAnswer(answer); // Lưu đáp án sai đã chọn
                
                // Broadcast cho người khác biết mình đã sai
                if (channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'MCQ_WRONG_ANSWER',
                        payload: { 
                            playerId: user.id, 
                            playerName: user.full_name,
                            wrongAnswer: answer
                        }
                    });
                }
                
                // === XỬ LÝ LOCAL ===
                const newWrongPlayers = [...mcqWrongPlayersRef.current, String(user.id)];
                mcqWrongPlayersRef.current = newWrongPlayers;
                setMcqWrongPlayers([...newWrongPlayers]);
                
                // Kiểm tra xem tất cả đều đã sai chưa
                const activePlayers = players?.filter(p => !checkPlayerForfeited(p.id, forfeitedPlayersRef.current)) || [];
                const allWrong = activePlayers.every(p => newWrongPlayers.includes(String(p.id)));
                
                console.log('👥 After my wrong - Wrong players:', newWrongPlayers.length, '/', activePlayers.length, 'All wrong:', allWrong);
                
                if (allWrong && activePlayers.length > 0) {
                    console.log('❌ All players answered wrong! Showing answer...');
                    
                    // Lock và hiển thị đáp án
                    setIsLocked(true);
                    isLockedRef.current = true;
                    
                    setRoundWinner({
                        odlId: null,
                        odlName: 'Không ai trả lời đúng',
                        answer: currentQuestion?.displayAnswer || 'N/A'
                    });
                    setShowAnswer(true);
                    
                    // HOST gửi lệnh chuyển câu sau 2.5 giây
                    if (isHostRef.current && channelRef.current) {
                        setTimeout(() => {
                            const nextIndex = currentQRef.current + 1;
                            channelRef.current.send({
                                type: 'broadcast',
                                event: 'NEXT_QUESTION',
                                payload: { questionIndex: nextIndex }
                            });
                            // Host cũng tự chuyển câu
                            if (nextIndex < questionsRef.current.length) {
                                currentQRef.current = nextIndex;
                                setCurrentQ(nextIndex);
                                setCurrentQuestion(questionsRef.current[nextIndex]);
                                setIsLocked(false);
                                isLockedRef.current = false;
                                setRoundWinner(null);
                                setShowAnswer(false);
                                setInputValue('');
                                setMyAnswerStatus(null);
                                mcqWrongPlayersRef.current = [];
                                setMcqWrongPlayers([]);
                                setMyWrongAnswer(null);
                                skipVotesRef.current = [];
                                setSkipVotes([]);
                            }
                        }, 2500);
                    }
                }
            } else {
                // Writing mode: cho thử lại
                setMyAnswerStatus('wrong');
                setInputValue('');
                
                // Reset sau 0.5 giây để thử lại
                setTimeout(() => {
                    if (!isLockedRef.current) {
                        setMyAnswerStatus(null);
                    }
                }, 500);
            }
        }
    }, [user, players]); // Added players dependency

    // Helper to check if player forfeited (for use outside channel scope)
    const checkPlayerForfeited = (playerId, forfeitedList) => {
        return forfeitedList.some(fId => String(fId) === String(playerId));
    };

    // === FORFEIT ===
    const forfeit = useCallback(() => {
        if (hasFinishedRef.current) return;
        
        console.log('🏳️ Player forfeiting:', user?.full_name, 'ID:', user?.id);
        
        // Broadcast forfeit to all players
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'PLAYER_FORFEIT',
                payload: { playerId: user.id, playerName: user.full_name }
            });
        }
        
        // Update local state
        const newForfeited = [...forfeitedPlayersRef.current, String(user.id)];
        forfeitedPlayersRef.current = newForfeited;
        setForfeitedPlayers([...newForfeited]);
        
        // Check if only one player remaining
        const activePlayers = players?.filter(p => !checkPlayerForfeited(p.id, newForfeited));
        console.log('👥 After my forfeit - Active players:', activePlayers?.length);
        
        if (activePlayers?.length === 1) {
            endGame(activePlayers[0]);
        } else if (activePlayers?.length === 0) {
            // Everyone forfeited - no winner
            hasFinishedRef.current = true;
            gamePhaseRef.current = 'FINISHED';
            setGamePhase('FINISHED');
            setGameResult('LOSE');
        }
    }, [players, user, endGame]);
    
    // === VOTE SKIP (khi không ai biết đáp án) ===
    const voteSkip = useCallback(() => {
        if (hasFinishedRef.current || isLockedRef.current) return;
        if (gamePhaseRef.current !== 'PLAYING') return;
        
        // Kiểm tra đã vote chưa
        if (skipVotesRef.current.includes(String(user.id))) {
            console.log('⏭️ Already voted to skip');
            return;
        }
        
        console.log('🗳️ Voting to skip by:', user?.full_name);
        
        // Broadcast vote to all players
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'VOTE_SKIP',
                payload: { playerId: user.id, playerName: user.full_name }
            });
        }
        
        // === XỬ LÝ LOCAL (vì sender không nhận lại broadcast của chính mình) ===
        const newVotes = [...skipVotesRef.current, String(user.id)];
        skipVotesRef.current = newVotes;
        setSkipVotes([...newVotes]);
        
        // Đếm số người chơi active
        const activePlayers = players?.filter(p => !checkPlayerForfeited(p.id, forfeitedPlayersRef.current)) || [];
        console.log('🗳️ My vote added. Total votes:', newVotes.length, '/', activePlayers.length);
        
        // Nếu tất cả đều vote → skip
        if (newVotes.length >= activePlayers.length && activePlayers.length > 0) {
            console.log('✅ All players voted to skip!');
            
            setIsLocked(true);
            isLockedRef.current = true;
            
            const currentQ = questionsRef.current[currentQRef.current];
            setRoundWinner({
                odlId: null,
                odlName: 'Tất cả đồng ý bỏ qua',
                answer: currentQ?.displayAnswer || 'N/A'
            });
            setShowAnswer(true);
            
            // Nếu là HOST, gửi lệnh chuyển câu sau 2.5 giây
            if (isHostRef.current && channelRef.current) {
                setTimeout(() => {
                    const nextIndex = currentQRef.current + 1;
                    console.log('📤 Host sending NEXT_QUESTION after vote skip:', nextIndex);
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'NEXT_QUESTION',
                        payload: { questionIndex: nextIndex }
                    });
                    // Host cũng tự chuyển câu
                    if (nextIndex < questionsRef.current.length) {
                        currentQRef.current = nextIndex;
                        setCurrentQ(nextIndex);
                        setCurrentQuestion(questionsRef.current[nextIndex]);
                        setIsLocked(false);
                        isLockedRef.current = false;
                        setRoundWinner(null);
                        setShowAnswer(false);
                        setInputValue('');
                        setMyAnswerStatus(null);
                        skipVotesRef.current = [];
                        setSkipVotes([]);
                    }
                }, 2500);
            }
        }
    }, [user, players]);
    
    // === HANDLE PAGE UNLOAD (back, reload, close) ===
    useEffect(() => {
        if (!matchId || !user) return;
        
        const handleBeforeUnload = (e) => {
            // Broadcast forfeit before leaving (only if game is still active)
            if (channelRef.current && !hasFinishedRef.current && gamePhaseRef.current === 'PLAYING') {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'PLAYER_FORFEIT',
                    payload: { playerId: user.id, playerName: user.full_name }
                });
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // NOTE: Don't forfeit on unmount - React StrictMode double-mounts
            // Forfeit is handled by beforeunload for real page leaves
        };
    }, [matchId, user]);

    return {
        gamePhase,
        countdown,
        winningScore: WINNING_SCORE,
        currentQuestion,
        currentQ,
        totalQuestions: questions.length,
        scores,
        myScore: scores[user?.id] || 0,
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
        players,
        // MCQ wrong tracking
        mcqWrongPlayers,
        myWrongAnswer
    };
};
