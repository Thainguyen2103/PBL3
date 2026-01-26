import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import * as wanakana from 'wanakana';
import kanjiBase from '../utils/kanji-base.json';
import jukugoData from '../utils/jukugo-data.json';

const TRACK_LENGTH = 10; 

export const useRaceGame = (matchId, initialOpponent, isHost, user) => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [gameState, setGameState] = useState('LOADING'); 
    const [questionList, setQuestionList] = useState([]); 
    const [myPos, setMyPos] = useState(0); 
    const [oppPos, setOppPos] = useState(0); 
    
    // Feedback & Logic
    const [consecutiveWrong, setConsecutiveWrong] = useState(0);
    const [answerReveal, setAnswerReveal] = useState(null); 
    const [feedback, setFeedback] = useState(null); // 'CORRECT', 'WRONG'
    const [stunCountdown, setStunCountdown] = useState(0); 

    const [gameResult, setGameResult] = useState(null); 
    const [resultMsg, setResultMsg] = useState("");

    const channelRef = useRef(null);
    const hasUpdatedPoints = useRef(false);
    const isProcessingRef = useRef(false);

    // 1. INIT
    useEffect(() => {
        if (!matchId) return;

        const list1 = (kanjiBase || []).map(i => ({ ...i, type: 'kanji' }));
        const list2 = (jukugoData || []).map(i => ({ ...i, type: 'jukugo' }));
        const combined = [...list1, ...list2];

        const channel = supabase.channel(matchId, { config: { presence: { key: user.id } } });

        channel
            .on('broadcast', { event: 'RACE_START' }, ({ payload }) => {
                setQuestionList(payload.questions);
                setGameState('RACING');
            })
            .on('broadcast', { event: 'UPDATE_POS' }, ({ payload }) => {
                if (payload.userId !== user.id) {
                    setOppPos(payload.position);
                    if (payload.position >= TRACK_LENGTH) {
                        handleGameOver(false, "Đối thủ đã về đích trước!");
                    }
                }
            })
            .on('broadcast', { event: 'PLAYER_LEFT' }, () => {
                handleGameOver(true, "Đối thủ đã bỏ cuộc. Bạn chiến thắng!");
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    if (isHost) {
                        const raceQuestions = generateRaceQuestions(combined, TRACK_LENGTH + 10); 
                        setQuestionList(raceQuestions);
                        setTimeout(() => {
                            channel.send({ type: 'broadcast', event: 'RACE_START', payload: { questions: raceQuestions } });
                            setGameState('RACING');
                        }, 1000);
                    }
                }
            });

        channelRef.current = channel;
        return () => { 
            if(channelRef.current) { 
                channelRef.current.send({ type: 'broadcast', event: 'PLAYER_LEFT' }); 
                supabase.removeChannel(channelRef.current); 
            } 
        };
    }, []);

    // Countdown Timer
    useEffect(() => {
        let timer;
        if (stunCountdown > 0) {
            timer = setTimeout(() => setStunCountdown(p => p - 1), 1000);
        } else if (stunCountdown === 0 && feedback === 'WRONG') {
            setFeedback(null);
            isProcessingRef.current = false;
        }
        return () => clearTimeout(timer);
    }, [stunCountdown, feedback]);

    // --- 🔥 HELPER: TẠO CÂU HỎI ĐẦY ĐỦ THÔNG TIN 🔥 ---
    const generateRaceQuestions = (data, count) => {
        const shuffled = [...data].sort(() => 0.5 - Math.random());
        const types = [
            { isMCQ: false, askMode: 'MEANING' },
            { isMCQ: false, askMode: 'READING' },
            { isMCQ: true, askMode: 'MEANING' },
            { isMCQ: true, askMode: 'READING' }
        ];

        return shuffled.slice(0, count).map((item, index) => {
            const typeConfig = types[index % 4];
            let q = { 
                id: Math.random().toString(36), 
                question: item.kanji || item.jukugo, 
                typeTag: item.type === 'kanji' ? 'HÁN TỰ' : 'TỪ VỰNG', 
                isMCQ: typeConfig.isMCQ, 
                askMode: typeConfig.askMode, 
                options: [], validAnswers: [], 
                revealText: "" // Text hiển thị khi sai
            };

            // 1. Xử lý Dữ liệu Đáp án (Reading)
            if (q.askMode === 'READING') {
                if (item.type === 'kanji') {
                    const clean = (str) => str ? str.split('(')[0].replace(/\./g, '').trim() : '';
                    const ons = item.onyomi ? item.onyomi.split(',').map(clean) : [];
                    const kuns = item.kunyomi ? item.kunyomi.split(',').map(clean) : [];
                    const onsHiragana = ons.map(s => wanakana.toHiragana(s));
                    
                    // Chấp nhận tất cả
                    q.validAnswers = [...new Set([...ons, ...onsHiragana, ...kuns])].filter(Boolean);
                    
                    // Text hiển thị (On / Kun)
                    const mainOn = onsHiragana[0] || (ons[0] ? wanakana.toHiragana(ons[0]) : "");
                    const mainKun = kuns[0] || "";
                    // 🔥 Format chuẩn: ON / KUN
                    q.displayCorrect = [mainOn, mainKun].filter(Boolean).join(' / ');
                    q.revealText = `On: ${ons.join(', ')} | Kun: ${kuns.join(', ')}`;
                } else {
                    q.validAnswers = [item.hiragana];
                    q.displayCorrect = item.hiragana;
                    q.revealText = item.hiragana;
                }
            } 
            // 2. Xử lý Dữ liệu Đáp án (Meaning)
            else {
                const cleanMean = (str) => str ? str.trim().toLowerCase() : '';
                const means = item.mean ? item.mean.split(/[,;]/).map(cleanMean) : [];
                const hv = item.hanviet ? [item.hanviet.toLowerCase()] : [];
                
                // Chấp nhận Hán Việt và Nghĩa
                q.validAnswers = [...means, ...hv].filter(Boolean);
                
                // Text hiển thị (HV / Nghĩa)
                const mainMean = item.mean ? item.mean.split(/[,;]/)[0] : "";
                // 🔥 Format chuẩn: HV / Nghĩa
                q.displayCorrect = item.hanviet ? `${item.hanviet} / ${mainMean}` : mainMean;
                q.revealText = item.hanviet ? `HV: ${item.hanviet} | Nghĩa: ${mainMean}` : `Nghĩa: ${mainMean}`;
            }

            // 3. Tạo Options Trắc Nghiệm (Format: On/Kun hoặc HV/Nghĩa)
            if (q.isMCQ) {
                const distractors = data.filter(k => (k.kanji||k.jukugo) !== q.question)
                    .sort(() => 0.5 - Math.random()).slice(0, 3)
                    .map(k => {
                        if (q.askMode === 'READING') {
                            if (k.type === 'kanji') {
                                const clean = (str) => str ? str.split('(')[0].replace(/\./g, '').trim() : '';
                                const on = k.onyomi ? wanakana.toHiragana(clean(k.onyomi.split(',')[0])) : "";
                                const kun = k.kunyomi ? clean(k.kunyomi.split(',')[0]) : "";
                                return [on, kun].filter(Boolean).join(' / ') || "xxx";
                            }
                            return k.hiragana || "xxx";
                        } else {
                            const mean = k.mean ? k.mean.split(/[,;]/)[0] : "xxx";
                            return k.hanviet ? `${k.hanviet} / ${mean}` : mean;
                        }
                    });
                
                // Option đúng cũng phải format đẹp
                q.options = [...distractors, q.displayCorrect].sort(() => 0.5 - Math.random());
            }
            return q;
        });
    };

    // --- CHECK ĐÁP ÁN ---
    const handleAnswer = (val) => {
        if (isProcessingRef.current || gameState !== 'RACING' || stunCountdown > 0 || answerReveal) return;
        isProcessingRef.current = true;

        const currentQ = questionList[myPos];
        if (!currentQ) { isProcessingRef.current = false; return; }

        const userVal = val.toLowerCase().trim();
        const userValKana = wanakana.toHiragana(userVal); 

        // Check logic: So sánh với danh sách validAnswers (chứa đủ On, Kun, HV, Nghĩa)
        let isCorrect = false;
        if (currentQ.isMCQ) {
            // So sánh chính xác text trên nút
            if (val === currentQ.displayCorrect) isCorrect = true;
        } else {
            // Tự luận: so sánh linh hoạt
            isCorrect = currentQ.validAnswers.some(ans => {
                const ansLower = ans.toLowerCase();
                return ansLower === userVal || ansLower === userValKana || userVal.includes(ansLower);
            });
        }

        if (isCorrect) {
            setFeedback('CORRECT');
            setConsecutiveWrong(0);
            setTimeout(() => {
                const newPos = myPos + 1;
                setMyPos(newPos);
                setFeedback(null);
                channelRef.current.send({ type: 'broadcast', event: 'UPDATE_POS', payload: { userId: user.id, position: newPos } });
                if (newPos >= TRACK_LENGTH) handleGameOver(true, "Xuất sắc! Bạn đã về đích!");
                isProcessingRef.current = false;
            }, 500);
        } else {
            const newWrongCount = consecutiveWrong + 1;
            setConsecutiveWrong(newWrongCount);
            if (newWrongCount >= 2) {
                // Sai 2 lần -> Hiện RevealText (đầy đủ)
                setAnswerReveal(currentQ.revealText); 
                setTimeout(() => {
                    const newPos = Math.max(0, myPos - 1); 
                    setMyPos(newPos);
                    setConsecutiveWrong(0);
                    setAnswerReveal(null); 
                    channelRef.current.send({ type: 'broadcast', event: 'UPDATE_POS', payload: { userId: user.id, position: newPos } });
                    isProcessingRef.current = false;
                }, 2500); 
            } else {
                setFeedback('WRONG'); 
                setStunCountdown(5); 
            }
        }
    };

    const handleGameOver = async (isWin, msg) => {
        if (gameState === 'FINISHED') return;
        setGameState('FINISHED');
        setGameResult(isWin ? 'WIN' : 'LOSE');
        setResultMsg(msg);
        if (!hasUpdatedPoints.current) {
            hasUpdatedPoints.current = true;
            const pointsChange = isWin ? 10 : -5;
            try {
                const { data } = await supabase.from('users').select('rank_points').eq('id', user.id).single();
                const current = data?.rank_points || 0;
                const next = Math.max(0, current + pointsChange);
                await supabase.from('users').update({ rank_points: next }).eq('id', user.id);
            } catch (err) { console.error(err); }
        }
    };

    const confirmQuit = async () => {
        if (channelRef.current) await channelRef.current.send({ type: 'broadcast', event: 'PLAYER_LEFT' });
        handleGameOver(false, "Bạn đã đầu hàng (-5 điểm)!");
    };

    return {
        gameState, questionList, myPos, oppPos, 
        currentQuestion: questionList[myPos], 
        feedback, answerReveal, stunCountdown, 
        resultMsg, gameResult, TRACK_LENGTH,
        handleAnswer, confirmQuit
    };
};