import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import EmojiPicker from 'emoji-picker-react';
import { useAppContext } from '../context/AppContext'; // ✅ Import Context
import { translations } from '../utils/translations'; // ✅ Import Translations

const REACTIONS = ['❤️', '😆', '😮', '😢', '😠', '👍'];

const MessageSystem = ({ user }) => {
    const { language } = useAppContext(); // ✅ Lấy language từ Context
    const t = translations[language] || translations.vi; // ✅ Lấy bộ từ điển ngôn ngữ tương ứng

    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    
    // UI States
    const [showEmoji, setShowEmoji] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); 
    const [activeMenuId, setActiveMenuId] = useState(null); 
    const [editingMessage, setEditingMessage] = useState(null); 
    
    // ✅ NÂNG CẤP: Dùng mảng để chứa nhiều ảnh
    const [selectedFiles, setSelectedFiles] = useState([]); 
    const [previewUrls, setPreviewUrls] = useState([]);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    // 1. PRESENCE (ONLINE)
    useEffect(() => {
        if (!user) return;
        const presenceChannel = supabase.channel('global_presence')
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const onlineIds = new Set();
                for (const id in newState) {
                    if (newState[id][0]?.user_id) onlineIds.add(newState[id][0].user_id);
                }
                setOnlineUsers(onlineIds);
            })
            .subscribe(status => {
                if (status === 'SUBSCRIBED') presenceChannel.track({ user_id: user.id });
            });
        return () => { supabase.removeChannel(presenceChannel); };
    }, [user]);

    // 2. FETCH FRIENDS
    const fetchFriends = async () => {
        if (!user) return;
        const { data: rels } = await supabase.from('friendships').select('*')
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`).eq('status', 'accepted');
        
        if (rels?.length > 0) {
            const friendIds = rels.map(r => r.requester_id === user.id ? r.receiver_id : r.requester_id);
            const { data: usersData } = await supabase.from('users').select('*').in('id', friendIds);
            const { data: unreadData } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id).eq('is_read', false);

            const friendsWithUnread = usersData.map(f => ({
                ...f,
                unread: unreadData.some(m => m.sender_id === f.id)
            }));
            setFriends(friendsWithUnread || []);
        }
    };

    useEffect(() => { fetchFriends(); }, [user]);

    // 3. CHAT LOGIC
    useEffect(() => {
        if (!user) return;
        if (selectedFriend) {
            const fetchMessages = async () => {
                await supabase.from('messages').update({ is_read: true }).eq('sender_id', selectedFriend.id).eq('receiver_id', user.id);
                setFriends(prev => prev.map(f => f.id === selectedFriend.id ? { ...f, unread: false } : f));
                const { data } = await supabase.from('messages').select('*, reply_to:reply_to_id(content, type)')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${user.id})`)
                    .order('created_at', { ascending: true });
                setMessages(data || []);
                scrollToBottom();
            };
            fetchMessages();
        }

        const chatChannel = supabase.channel(`chat_system`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
                const newMsg = payload.new;
                if (payload.eventType === 'INSERT') {
                    if (selectedFriend && ((newMsg.sender_id === user.id && newMsg.receiver_id === selectedFriend.id) || (newMsg.sender_id === selectedFriend.id && newMsg.receiver_id === user.id))) {
                        const { data } = await supabase.from('messages').select('*, reply_to:reply_to_id(content, type)').eq('id', newMsg.id).single();
                        if (data) { setMessages(prev => [...prev, data]); scrollToBottom(); }
                    } 
                    if (newMsg.receiver_id === user.id && (!selectedFriend || selectedFriend.id !== newMsg.sender_id)) {
                        setFriends(prev => prev.map(f => f.id === newMsg.sender_id ? { ...f, unread: true } : f));
                    }
                }
                if (payload.eventType === 'UPDATE') {
                    setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, reactions: newMsg.reactions, is_deleted: newMsg.is_deleted, is_edited: newMsg.is_edited, content: newMsg.content } : m));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(chatChannel); };
    }, [selectedFriend, user]);

    const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    // ✅ XỬ LÝ CHỌN NHIỀU ẢNH
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            // Thêm file mới vào danh sách hiện tại
            setSelectedFiles(prev => [...prev, ...files]);
            
            // Tạo URL preview
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviews]);
        }
        e.target.value = null; // Reset để chọn tiếp được
    };

    // ✅ XÓA ẢNH ĐANG CHỌN
    const removeImage = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    // --- GỬI TIN NHẮN ---
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        
        if (editingMessage) { handleSaveEdit(); return; }

        if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedFriend) return;

        const msgContent = newMessage.trim();
        const filesToSend = [...selectedFiles]; // Copy danh sách file để gửi
        
        // Reset UI ngay lập tức cho mượt
        setNewMessage('');
        setSelectedFiles([]);
        setPreviewUrls([]);
        setShowEmoji(false);
        setReplyingTo(null);
        if (textareaRef.current) textareaRef.current.style.height = '40px';
        
        const currentReplyId = replyingTo ? replyingTo.id : null;

        try {
            // 1. Gửi TẤT CẢ ảnh (nếu có)
            if (filesToSend.length > 0) {
                setIsUploading(true);
                
                // Dùng Promise.all để gửi song song cho nhanh
                const uploadPromises = filesToSend.map(async (file) => {
                    const fileName = `${Date.now()}_${Math.random()}_${file.name.replace(/\s/g, '')}`;
                    const { error } = await supabase.storage.from('chat-images').upload(fileName, file);
                    if (error) throw error;
                    
                    const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
                    
                    // Tạo tin nhắn ảnh
                    return supabase.from('messages').insert([{
                        sender_id: user.id, 
                        receiver_id: selectedFriend.id, 
                        content: data.publicUrl, 
                        type: 'image', 
                        reply_to_id: currentReplyId
                    }]);
                });

                await Promise.all(uploadPromises);
                setIsUploading(false);
            }

            // 2. Gửi text (nếu có)
            if (msgContent) {
                await supabase.from('messages').insert([{
                    sender_id: user.id, receiver_id: selectedFriend.id, content: msgContent, type: 'text', reply_to_id: currentReplyId
                }]);
            }
        } catch (error) {
            console.error("Lỗi gửi tin:", error);
            alert("Có lỗi xảy ra khi gửi tin nhắn.");
            setIsUploading(false);
        }
    };

    const handleStartEdit = (msg) => { setEditingMessage(msg); setNewMessage(msg.content); setActiveMenuId(null); textareaRef.current?.focus(); };
    const handleSaveEdit = async () => { if (!newMessage.trim() || !editingMessage) return; await supabase.from('messages').update({ content: newMessage.trim(), is_edited: true }).eq('id', editingMessage.id); setEditingMessage(null); setNewMessage(''); };
    const handleUnsend = async (msgId) => { await supabase.from('messages').update({ is_deleted: true }).eq('id', msgId); setActiveMenuId(null); };
    const handleReaction = async (msgId, emoji, currentReactions) => { const updatedReactions = { ...currentReactions, [user.id]: emoji }; if (currentReactions && currentReactions[user.id] === emoji) delete updatedReactions[user.id]; await supabase.from('messages').update({ reactions: updatedReactions }).eq('id', msgId); };
    
    const isUserOnline = (id) => { const idToCheck = String(id); for (let onlineId of onlineUsers) if (String(onlineId) === idToCheck) return true; return false; };

    useEffect(() => {
        const handleClickOutside = (event) => { if (!event.target.closest('.msg-menu-btn') && !event.target.closest('.msg-menu-dropdown')) setActiveMenuId(null); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'; } }, [newMessage]);

    return (
        <div className="h-[600px] bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex font-sans">
            {/* LIST BẠN BÈ */}
            <div className="w-1/3 border-r border-gray-100 bg-gray-50/50 flex flex-col">
                {/* ✅ Cập nhật: t.msg_chat_title */}
                <div className="p-4 border-b border-gray-100"><h3 className="font-black text-slate-800 text-lg">{t.msg_chat_title}</h3></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {friends.map(f => (
                        <div key={f.id} onClick={() => setSelectedFriend(f)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedFriend?.id === f.id ? 'bg-white shadow-md' : 'hover:bg-gray-100'}`}>
                            <div className="relative">
                                <img src={f.avatar || `https://ui-avatars.com/api/?name=${f.full_name}`} className="w-12 h-12 rounded-full object-cover bg-gray-200" alt="" />
                                {isUserOnline(f.id) && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <h4 className={`text-sm truncate ${f.unread ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>{f.full_name}</h4>
                                    {f.unread && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                                </div>
                                {/* ✅ Cập nhật: t.msg_new_message, t.msg_active, t.msg_offline */}
                                <p className={`text-xs truncate ${f.unread ? 'font-bold text-slate-800' : 'text-gray-400'}`}>{f.unread ? t.msg_new_message : (isUserOnline(f.id) ? t.msg_active : t.msg_offline)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* KHUNG CHAT */}
            <div className="flex-1 flex flex-col bg-white relative">
                {selectedFriend ? (
                    <>
                        <div className="p-4 border-b border-gray-100 flex items-center gap-3 shadow-sm z-10 bg-white/90 backdrop-blur-sm">
                            <div className="relative">
                                <img src={selectedFriend.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                                {isUserOnline(selectedFriend.id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{selectedFriend.full_name}</h3>
                                {/* ✅ Cập nhật: t.msg_active, t.msg_not_active */}
                                <p className="text-xs text-gray-500">{isUserOnline(selectedFriend.id) ? <span className="text-green-600 font-bold">● {t.msg_active}</span> : t.msg_not_active}</p>
                            </div>
                        </div>

                        {/* LIST TIN NHẮN (Đã thêm pt-8 để fix lỗi che reaction) */}
                        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4 space-y-1 bg-slate-50 custom-scrollbar">
                            {messages.map((msg, index) => {
                                const isMe = msg.sender_id === user.id;
                                const isMenuOpen = activeMenuId === msg.id;
                                return (
                                    <div key={index} className={`flex items-end gap-2 group mb-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isMe && <img src={selectedFriend.avatar} className="w-8 h-8 rounded-full mb-1" alt="" />}
                                            <div className="relative max-w-[70%] group/msg">
                                                {!msg.is_deleted && (
                                                    <div className={`absolute -top-7 ${isMe ? 'right-0' : 'left-0'} flex gap-1 bg-white shadow-sm border border-gray-100 rounded-full px-1.5 py-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20`}>
                                                        {REACTIONS.map(emoji => <button key={emoji} onClick={() => handleReaction(msg.id, emoji, msg.reactions)} className="hover:scale-125 transition-transform text-xs px-0.5">{emoji}</button>)}
                                                    </div>
                                                )}
                                                {!msg.is_deleted && (
                                                    <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover/msg:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}>
                                                        <button className="msg-menu-btn w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg pb-2" onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : msg.id); }}>...</button>
                                                        {isMenuOpen && (
                                                            <div className={`msg-menu-dropdown absolute top-full ${isMe ? 'right-0' : 'left-0'} mt-1 bg-white shadow-lg border border-gray-100 rounded-lg overflow-hidden z-50 w-28 py-1 flex flex-col`}>
                                                                    {/* ✅ Cập nhật: t.msg_reply */}
                                                                    <button onClick={() => { setReplyingTo(msg); textareaRef.current?.focus(); setActiveMenuId(null); }} className="px-3 py-1.5 text-left text-xs font-medium hover:bg-gray-50 text-slate-700">{t.msg_reply}</button>
                                                                    {/* ✅ Cập nhật: t.msg_edit */}
                                                                    {isMe && msg.type === 'text' && <button onClick={() => handleStartEdit(msg)} className="px-3 py-1.5 text-left text-xs font-medium hover:bg-gray-50 text-slate-700">{t.msg_edit}</button>}
                                                                    {/* ✅ Cập nhật: t.msg_unsend */}
                                                                    {isMe && <button onClick={() => handleUnsend(msg.id)} className="px-3 py-1.5 text-left text-xs font-medium hover:bg-red-50 text-red-500">{t.msg_unsend}</button>}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.reply_to && !msg.is_deleted && (
                                                    <div className={`text-xs p-2 mb-1 rounded-xl opacity-70 border-l-4 ${isMe ? 'bg-blue-700 text-white border-blue-300' : 'bg-gray-100 text-gray-600 border-gray-400'}`}>
                                                        {/* ✅ Cập nhật: t.msg_replying_to */}
                                                        <span className="font-bold block mb-0.5">{t.msg_replying_to}</span>
                                                        {/* ✅ Cập nhật: t.msg_reply_image */}
                                                        {msg.reply_to.type === 'image' ? t.msg_reply_image : <span className="line-clamp-1">{msg.reply_to.content}</span>}
                                                    </div>
                                                )}
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm relative ${msg.is_deleted ? 'bg-gray-50 text-gray-400 border border-gray-100 italic' : (isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white text-slate-800 border border-gray-100 rounded-bl-sm')}`}>
                                                    {/* ✅ Cập nhật: t.msg_deleted */}
                                                    {msg.is_deleted ? t.msg_deleted : (
                                                        <>
                                                            {msg.type === 'image' ? <img src={msg.content} alt="sent" className="rounded-lg max-h-60 object-cover cursor-pointer" onClick={() => window.open(msg.content, '_blank')} /> : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.5' }}>{msg.content}</div>}
                                                            {/* ✅ Cập nhật: t.msg_edited */}
                                                            {msg.is_edited && <span className={`text-[9px] block text-right mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{t.msg_edited}</span>}
                                                        </>
                                                    )}
                                                    {!msg.is_deleted && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                        <div className={`absolute -bottom-2 ${isMe ? 'left-0' : 'right-0'} bg-white border border-gray-100 rounded-full px-1 py-0 shadow-sm flex gap-0.5 z-10 items-center scale-90 origin-bottom`}>{Array.from(new Set(Object.values(msg.reactions))).map((e, i) => <span key={i} className="text-[10px]">{e}</span>)}</div>
                                                    )}
                                                </div>
                                            </div>
                                    </div>
                                );
                            })}
                            {/* ✅ Cập nhật: t.msg_sending_image */}
                            {isUploading && <div className="flex justify-end"><div className="text-xs text-gray-400 animate-pulse bg-gray-100 px-3 py-1 rounded-full">{t.msg_sending_image} ({selectedFiles.length})...</div></div>}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 bg-white border-t border-gray-100 relative">
                            {/* THANH ĐANG TRẢ LỜI / SỬA */}
                            {(replyingTo || editingMessage) && (
                                <div className="flex items-center justify-between bg-gray-50 p-2 px-4 rounded-t-xl text-xs border-l-4 border-blue-500 mb-1 animate-fade-in-up shadow-sm mx-2">
                                    <div>
                                        {/* ✅ Cập nhật: t.msg_edit, t.msg_replying_to, t.msg_reply_image */}
                                        {editingMessage ? <span className="font-bold text-blue-600 block mb-0.5">✏️ {t.msg_edit}</span> : <><span className="font-bold text-gray-500 block mb-0.5">{t.msg_replying_to}</span><span className="text-slate-700 line-clamp-1">{replyingTo?.type === 'image' ? t.msg_reply_image : replyingTo?.content}</span></>}
                                    </div>
                                    <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="text-gray-400 hover:text-red-500 font-bold text-lg px-2">×</button>
                                </div>
                            )}

                            {/* ✅ PREVIEW NHIỀU ẢNH CÙNG LÚC */}
                            {previewUrls.length > 0 && (
                                <div className="absolute bottom-full left-0 w-full p-2 bg-white/90 backdrop-blur-sm border-t border-gray-100 flex gap-2 overflow-x-auto z-20 px-4">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative group shrink-0">
                                            <img src={url} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-200 shadow-sm" />
                                            <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500 shadow-md">✕</button>
                                        </div>
                                    ))}
                                    {/* ✅ Cập nhật: t.msg_selected_images */}
                                    <span className="text-xs text-gray-400 font-bold italic self-center ml-2">{t.msg_selected_images} {previewUrls.length}</span>
                                </div>
                            )}

                            {showEmoji && <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl"><EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={350} width={300} /></div>}

                            <div className="flex items-end gap-2 bg-gray-50 px-3 py-2 rounded-3xl border border-gray-200 focus-within:border-blue-400 transition-colors">
                                {!editingMessage && (
                                    <>
                                            <button type="button" onClick={() => fileInputRef.current.click()} className={`p-2 transition-colors shrink-0 ${previewUrls.length > 0 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg></button>
                                            
                                            {/* ✅ INPUT MULTIPLE */}
                                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                                            
                                            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-400 hover:text-yellow-500 transition-colors shrink-0"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg></button>
                                    </>
                                )}
                                {/* ✅ Cập nhật: t.msg_input_placeholder, t.msg_input_placeholder_edit */}
                                <textarea ref={textareaRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={editingMessage ? t.msg_input_placeholder_edit : t.msg_input_placeholder} className="flex-1 bg-transparent px-2 py-2.5 outline-none text-sm font-medium text-slate-800 resize-none max-h-32 overflow-y-auto scrollbar-hide" rows={1} style={{ minHeight: '44px', lineHeight: '1.5' }} />
                                <button onClick={handleSendMessage} disabled={!newMessage.trim() && selectedFiles.length === 0} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shrink-0 mb-1">
                                    {/* ✅ Cập nhật: t.msg_btn_save */}
                                    {editingMessage ? <span className="text-[10px] font-bold px-1">{t.msg_btn_save}</span> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* ✅ Cập nhật: t.msg_select_friend_hint */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50"><div className="text-6xl mb-4 grayscale opacity-20">💬</div><h3 className="font-bold text-slate-400">{t.msg_select_friend_hint}</h3></div>
                )}
            </div>
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } .animate-fade-in-up { animation: fadeInUp 0.2s ease-out; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
};

export default MessageSystem;