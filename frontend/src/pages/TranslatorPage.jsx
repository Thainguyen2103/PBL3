import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext';
import { flashcardData as dictionaryData } from "../utils/kanji-dictionary";
import { translations } from '../utils/translations'; // Import trực tiếp để đảm bảo

const TranslatorPage = () => {
    const navigate = useNavigate();
    const { user, language } = useAppContext(); 
    
    // ✅ Lấy đúng translation object
    const t = translations[language] || translations.vi;

    // --- CẤU HÌNH NGÔN NGỮ ĐỘNG ---
    const LANGUAGES = [
        { code: 'auto', label: t.lang_auto, flag: '✨' },
        { code: 'vi', label: t.lang_vi, flag: '🇻🇳' },
        { code: 'en', label: t.lang_en, flag: '🇬🇧' },
        { code: 'ja', label: t.lang_ja, flag: '🇯🇵' },
        { code: 'zh', label: t.lang_zh, flag: '🇨🇳' },
        { code: 'ko', label: t.lang_ko, flag: '🇰🇷' }
    ];

    const [inputText, setInputText] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [transliteration, setTransliteration] = useState(""); 
    const [isTranslating, setIsTranslating] = useState(false);
    
    const [sourceLang, setSourceLang] = useState('auto');
    const [targetLang, setTargetLang] = useState('ja');
    const [detectedLangDisplay, setDetectedLangDisplay] = useState(null);

    useEffect(() => {
        const map = { 'vi': 'vi', 'en': 'en', 'jp': 'ja', 'cn': 'zh', 'kr': 'ko' };
        if(user?.language === 'vi') setTargetLang('ja');
        else if(user?.language) setTargetLang(map[user.language] || 'vi');
    }, [user]);

    // Google API Translation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputText.trim()) handleTranslate();
            else { 
                setTranslatedText(""); 
                setTransliteration(""); 
                setDetectedLangDisplay(null); 
            }
        }, 800); 
        return () => clearTimeout(timer);
    }, [inputText, sourceLang, targetLang]);

    const handleTranslate = async () => {
        setIsTranslating(true);
        try {
            let actualSource = sourceLang;
            const apiSource = actualSource === 'zh' ? 'zh-CN' : actualSource;
            const apiTarget = targetLang === 'zh' ? 'zh-CN' : targetLang;

            if (apiSource === apiTarget && actualSource !== 'auto') {
                setTranslatedText(inputText);
                setTransliteration("");
                setIsTranslating(false);
                return;
            }

            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${apiSource}&tl=${apiTarget}&dt=t&dt=rm&q=${encodeURIComponent(inputText)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data[0]) {
                const translationParts = data[0].filter(item => item[0] && item[1] !== null && item[1] !== undefined); 
                const result = translationParts.map(item => item[0]).join("");
                setTranslatedText(result);

                const romajiPart = data[0][data[0].length - 1];
                if (romajiPart && (romajiPart[1] === null || romajiPart[1] === undefined || romajiPart[1] === "") && romajiPart[2]) {
                     setTransliteration(romajiPart[2] || romajiPart[3] || "");
                } else {
                    const foundRomaji = data[0].find(item => item[2] || item[3]);
                    if (foundRomaji) {
                         setTransliteration(foundRomaji[2] || foundRomaji[3] || "");
                    } else {
                        setTransliteration("");
                    }
                }

                if (sourceLang === 'auto' && data[2]) {
                    const detectedCode = data[2];
                    let appCode = detectedCode;
                    if (detectedCode.startsWith('zh')) appCode = 'zh';
                    const langObj = LANGUAGES.find(l => l.code === appCode) || { label: detectedCode.toUpperCase() };
                    setDetectedLangDisplay(langObj.label);
                }
            }
        } catch (err) {
            console.error(err);
            setTranslatedText("Error...");
            setTransliteration("");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSwap = () => {
        if (sourceLang === 'auto') return; 
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setInputText(translatedText); 
        setTranslatedText(inputText); 
        setTransliteration("");
    };

    const relatedKanji = dictionaryData.filter(item => (inputText + translatedText).includes(item.kanji));

    return (
        <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
            <Sidebar />
            
            <main className="flex-1 h-full flex flex-col bg-slate-50/50 p-6 md:p-8 overflow-hidden">
                
                <h1 className="text-3xl font-black text-slate-800 mb-6 tracking-tight shrink-0">{t.translator_title}</h1>

                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 flex flex-col md:flex-row relative z-10 flex-1 min-h-0 overflow-hidden">
                    
                    {/* INPUT SECTION */}
                    <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 relative min-h-0">
                        <div className="flex items-center justify-between p-4 border-b border-gray-50 bg-white z-20 shrink-0">
                            <CustomDropdown value={sourceLang} onChange={setSourceLang} options={LANGUAGES} />
                            {detectedLangDisplay && sourceLang === 'auto' && (
                                <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg animate-fade-in border border-green-100 uppercase tracking-wider">
                                    {t.translator_detect}: {detectedLangDisplay}
                                </span>
                            )}
                        </div>
                        
                        <textarea 
                            className="w-full flex-1 p-6 resize-none outline-none text-2xl font-medium text-slate-700 placeholder-gray-300 bg-transparent leading-relaxed custom-scrollbar"
                            placeholder={t.translator_placeholder}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            spellCheck="false"
                        />

                        {inputText && (
                            <button onClick={() => { setInputText(''); setTranslatedText(''); setTransliteration(''); }} className="absolute bottom-6 right-6 text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm border border-gray-100 z-30">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        )}
                    </div>

                    {/* SWAP BUTTON */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 hidden md:block">
                        <button 
                            onClick={handleSwap}
                            disabled={sourceLang === 'auto'}
                            className={`w-12 h-12 bg-white border border-gray-100 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${sourceLang === 'auto' ? 'opacity-50 cursor-not-allowed' : 'hover:text-blue-600 cursor-pointer text-slate-400'}`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        </button>
                    </div>

                    {/* OUTPUT SECTION */}
                    <div className="flex-1 flex flex-col bg-slate-50/30 min-h-0">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100/50 shrink-0">
                            <CustomDropdown value={targetLang} onChange={setTargetLang} options={LANGUAGES.filter(l => l.code !== 'auto')} />
                            <button onClick={() => navigator.clipboard.writeText(translatedText)} className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50" title="Sao chép">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col">
                            {isTranslating ? (
                                <div className="flex items-center gap-3 text-gray-400 animate-pulse mt-4">
                                    <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
                                    <span className="text-sm font-bold uppercase tracking-wider">{t.translator_translating}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1 flex flex-col gap-2"> 
                                        {/* PHẦN DỊCH CHÍNH (TO, ĐẬM) */}
                                        <div className="text-3xl md:text-4xl font-bold text-slate-800 leading-relaxed break-words">
                                            {translatedText || <span className="text-gray-300 select-none text-2xl font-normal">{t.translator_translation_placeholder}</span>}
                                        </div>
                                        
                                        {/* PHẦN PHIÊN ÂM */}
                                        {translatedText && transliteration && (
                                            <div className="text-lg md:text-xl text-slate-500 font-medium font-sans leading-relaxed break-words">
                                                {transliteration}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- KANJI FOUND --- */}
                {relatedKanji.length > 0 && (
                    <div className="mt-6 shrink-0 animate-fade-in-up pb-2">
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                                {t.translator_kanji_found} ({relatedKanji.length})
                            </span>
                            <div className="h-px bg-gray-200 flex-1"></div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {relatedKanji.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => navigate(`/kanji/${item.kanji}`)} 
                                    className="bg-white p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg cursor-pointer text-center group transition-all duration-300 relative overflow-hidden"
                                >
                                    <span className="text-3xl font-kai text-slate-800 group-hover:scale-110 block transition-transform mb-1">{item.kanji}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-600">{item.hanviet}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #cbd5e1; }
                .font-kai { font-family: 'Yuji Syuku', serif; font-weight: 400 !important; } 
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

// --- DROPDOWN COMPONENT (GIỮ NGUYÊN) ---
const CustomDropdown = ({ value, onChange, options, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.code === value) || options[0];

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-slate-600 hover:text-blue-600'}`}
            >
                <span className="text-lg">{selectedOption.flag}</span>
                <span>{selectedOption.label}</span>
                {!disabled && <span className="text-[10px] ml-1 opacity-50">▼</span>}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in-up">
                    {options.map((opt) => (
                        <div 
                            key={opt.code}
                            onClick={() => { onChange(opt.code); setIsOpen(false); }}
                            className={`px-4 py-3 cursor-pointer flex items-center gap-3 hover:bg-blue-50 transition-colors ${value === opt.code ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
                        >
                            <span className="text-xl">{opt.flag}</span>
                            <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                            {value === opt.code && <span className="ml-auto text-blue-600">✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TranslatorPage;