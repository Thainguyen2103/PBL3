import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BACKEND_URL = "https://pbl3-sofd.onrender.com"; 

// Component trang trí (Giữ nguyên)
const FullLandscapeDecor = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-[#fdfbf7]">
    <svg className="absolute bottom-0 left-0 w-full h-[40%] opacity-[0.08] text-slate-800" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="currentColor"><path d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,250.7C960,235,1056,181,1152,165.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
    <svg className="absolute -top-10 -left-20 w-[600px] h-[600px] opacity-[0.12]" viewBox="0 0 400 400" fill="none"><path d="M-50,50 Q50,50 100,150 T250,200" stroke="#5D4037" strokeWidth="5" strokeLinecap="round" /><g fill="#F48FB1" opacity="0.9"><circle cx="250" cy="200" r="8" /><circle cx="180" cy="80" r="6" /></g></svg>
    <svg className="absolute bottom-0 right-0 w-[400px] h-[600px] opacity-[0.15] text-green-900" viewBox="0 0 200 400" fill="currentColor" preserveAspectRatio="none"><path d="M180,400 L170,0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /><path d="M140,400 L150,50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
  </div>
);

const OldMasterIcon = () => (
  <div className="w-12 h-12 shrink-0 bg-white border border-slate-200 rounded-full flex items-center justify-center overflow-hidden shadow-sm relative z-10">
    <svg viewBox="0 0 100 100" className="w-10 h-10 grayscale opacity-80" style={{ transform: 'translateY(4px)' }}>
      <path d="M10 40 L50 10 L90 40 Z" fill="white" stroke="black" strokeWidth="3" />
      <path d="M35 40 Q50 40 65 40 L65 55 Q50 65 35 55 Z" fill="white" stroke="black" strokeWidth="3"/>
      <path d="M40 50 L48 48" stroke="black" strokeWidth="2" />
      <path d="M52 48 L60 50" stroke="black" strokeWidth="2" />
      <path d="M35 55 Q50 100 65 55" fill="white" stroke="black" strokeWidth="3"/>
    </svg>
  </div>
);

const AiChatPage = () => {
  const navigate = useNavigate();
  // ✅ 1. LẤY t VÀ language TỪ CONTEXT
  const { user, t, language } = useAppContext();
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // ✅ 2. KHỞI TẠO TIN NHẮN VỚI NGÔN NGỮ HIỆN TẠI
  // Dùng useEffect để reset tin nhắn khi ngôn ngữ thay đổi (Optional, nếu muốn reset chat khi đổi ngữ)
  const [messages, setMessages] = useState([]);

  // Khi mới vào hoặc đổi ngôn ngữ, random 1 câu chào mới bằng tiếng đó
  useEffect(() => {
      if (t?.chat_greetings) {
          const randomGreeting = t.chat_greetings[Math.floor(Math.random() * t.chat_greetings.length)];
          setMessages([{ id: 1, role: 'model', text: randomGreeting }]);
      }
  }, [t]); // Chạy lại khi 't' thay đổi (tức là khi đổi ngôn ngữ)

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  
  useEffect(() => { 
      if (textareaRef.current) { 
          textareaRef.current.style.height = 'auto'; 
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; 
      } 
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    
    // Cập nhật giao diện ngay lập tức
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userText }]);
    setInputValue('');
    setIsTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      // ✅ 3. TẠO SYSTEM PROMPT ĐỂ ÉP AI NÓI ĐÚNG NGÔN NGỮ
      // Chúng ta sẽ lén chèn thêm ngữ cảnh vào history gửi đi (nhưng không hiện lên UI)
      const langInstruction = `(System Note: The user is using the app in ${language} language. Please reply in that language only, but keep the persona of a grumpy, wise old master.)`;
      
      const apiHistory = [
          // Chèn chỉ thị hệ thống vào đầu
          { role: 'user', parts: [{ text: langInstruction }] }, 
          // Sau đó là lịch sử chat thực tế
          ...messages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }))
      ];

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: userText, 
            history: apiHistory 
        })
      });

      const data = await response.json();
      if (data.reply) {
          setMessages(prev => [...prev, { id: Date.now() + 1, role: 'model', text: data.reply }]);
      } else {
          throw new Error("No response");
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'model', text: 'Mạng mẽo không thông, lão phu không nghe rõ!' }]);
    } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#fdfbf7] text-slate-900 relative overflow-hidden font-sans">
      <FullLandscapeDecor />

      {/* HEADER */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-6 sticky top-0 z-20 shadow-sm shrink-0">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full mr-4 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        {/* ✅ Dùng t.chat_header */}
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
            {t?.chat_header || "LÃO VÔ DANH"}
        </h1>
      </header>

      {/* CHAT AREA */}
      <main className="flex-1 overflow-y-auto scroll-smooth z-10 relative">
        <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end animate-fade-in`}>
                {!isUser ? <OldMasterIcon /> : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm relative z-10">{user?.name?.charAt(0) || 'U'}</div>
                )}
                <div className={`max-w-[85%] px-5 py-3 rounded-2xl shadow-sm border relative overflow-hidden backdrop-blur-sm ${isUser ? 'bg-slate-900/95 text-white border-slate-800 rounded-br-none' : 'bg-white/90 text-slate-800 border-slate-200 rounded-bl-none italic' }`}>
                  <div className="prose prose-slate max-w-none break-words leading-relaxed relative z-10">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ p: ({node, ...props}) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />, code: ({node, inline, ...props}) => ( inline ? <code className="bg-black/10 px-1 rounded font-mono text-sm not-italic" {...props} /> : <code className="block bg-black/5 p-3 rounded-lg font-mono text-sm overflow-x-auto my-2 not-italic" {...props} /> ) }}>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && (
              <div className="flex gap-4 items-center">
                  <OldMasterIcon />
                  <div className="text-slate-400 text-xs italic animate-pulse font-bold tracking-widest bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 relative z-10">
                      {/* ✅ Dùng t.chat_typing */}
                      {t?.chat_typing || "Đang mài mực..."}
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* INPUT AREA */}
      <footer className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shrink-0 z-20 relative">
        <div className="max-w-3xl mx-auto flex gap-3 items-end bg-slate-100/80 p-2 rounded-2xl border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-200 transition-all">
          <textarea 
            ref={textareaRef} 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
            // ✅ Dùng t.chat_placeholder
            placeholder={t?.chat_placeholder || "..."} 
            className="flex-1 bg-transparent border-none outline-none p-3 text-slate-800 resize-none max-h-40 min-h-[48px] placeholder:text-slate-400 font-medium" 
            rows={1} 
            disabled={isTyping} 
          />
          <button onClick={handleSend} disabled={!inputValue.trim() || isTyping} className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shrink-0 shadow-md disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
        </div>
      </footer>
    </div>
  );
};

export default AiChatPage;