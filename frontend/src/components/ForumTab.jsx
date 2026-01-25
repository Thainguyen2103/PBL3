import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient'; 

// ⚠️ Đảm bảo bạn đã có các file này
import MyPostsManager from './MyPostsManager'; 
import ImageGrid from './ImageGrid'; 
import EditPostModal from './EditPostModal'; 
import { useAppContext } from '../context/AppContext'; // ✅ Import Context
import { translations } from '../utils/translations'; // ✅ Import Translations

// --- CẤU HÌNH ---
// Biến t sẽ được lấy trong component, nhưng REACTIONS cần khai báo ngoài hoặc dùng t bên trong component.
// Để đơn giản và hiệu quả, ta sẽ map label của REACTIONS bên trong component hoặc dùng t trực tiếp.
// Ở đây tôi sẽ giữ nguyên cấu trúc mảng nhưng label sẽ được xử lý khi render.
const REACTIONS_BASE = [
    { id: 'like', icon: '👍', color: 'text-blue-600', labelKey: 'react_like' },
    { id: 'love', icon: '❤️', color: 'text-red-500', labelKey: 'react_love' },
    { id: 'haha', icon: '😆', color: 'text-yellow-500', labelKey: 'react_haha' },
    { id: 'wow', icon: '😮', color: 'text-yellow-500', labelKey: 'react_wow' },
    { id: 'sad', icon: '😢', color: 'text-yellow-500', labelKey: 'react_sad' },
    { id: 'angry', icon: '😡', color: 'text-orange-600', labelKey: 'react_angry' },
];

const EMOJIS = ['😀', '😂', '🥰', '😎', '🤔', '😭', '😡', '👍', '❤️', '🎉', '🔥', '✨', '🇯🇵', '🇻🇳', '📚', '🌸'];

// --- HELPER FORMAT ---
const formatTimeRelative = (dateString, t) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return t.forum_just_now;
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t.forum_mins_ago}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t.forum_hours_ago}`;
    return `${date.getDate()} thg ${date.getMonth() + 1}`;
};

const formatTimeFull = (dateString) => {
    if (!dateString) return '';
    // Giữ nguyên format locale 'vi-VN' hoặc thay đổi tùy ý, ở đây giữ nguyên để hiển thị ngày tháng rõ ràng
    return new Date(dateString).toLocaleString('vi-VN', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
};

const toggleReaction = (currentReactions, userId, type) => {
    const safeReactions = Array.isArray(currentReactions) ? currentReactions : [];
    const cleanReactions = safeReactions.filter(r => r && typeof r === 'object' && r.userId);
    const existingIndex = cleanReactions.findIndex(r => r.userId === userId);

    if (existingIndex > -1) {
        if (cleanReactions[existingIndex].type === type) return cleanReactions.filter(r => r.userId !== userId);
        const newReactions = [...cleanReactions];
        newReactions[existingIndex] = { userId, type };
        return newReactions;
    }
    return [...cleanReactions, { userId, type }];
};

const getMyReaction = (reactions, userId) => {
    if (!Array.isArray(reactions)) return null;
    const myReact = reactions.find(r => r.userId === userId);
    return myReact ? REACTIONS_BASE.find(r => r.id === myReact.type) : null;
};

// --- CUSTOM TOOLTIP ---
const CustomTooltip = ({ content, children }) => (
    <div className="group/tooltip relative inline-block">
        {children}
        <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
        </div>
    </div>
);

// --- MODALS & STATS ---
const ReactionListModal = ({ reactions, onClose, onUserClick, t }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        const fetchUsers = async () => {
            const userIds = reactions.map(r => r.userId);
            if (userIds.length === 0) { setLoading(false); return; }
            const { data } = await supabase.from('users').select('id, full_name, avatar').in('id', userIds);
            
            const combinedData = reactions.map(r => {
                const userInfo = data?.find(u => u.id === r.userId);
                return userInfo ? { ...userInfo, reactionType: r.type } : null;
            }).filter(item => item !== null);
            
            setUsers(combinedData);
            setLoading(false);
        };
        fetchUsers();
    }, [reactions]);

    const displayList = activeTab === 'all' ? users : users.filter(u => u.reactionType === activeTab);
    const availableTypes = [...new Set(users.map(u => u.reactionType))];

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]" onClick={e => e.stopPropagation()}>
                <div className="border-b border-gray-100">
                    <div className="p-4 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">{t.forum_reaction_title}</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500">✕</button>
                    </div>
                    <div className="flex gap-2 px-4 pb-0 overflow-x-auto custom-scrollbar">
                        <button onClick={() => setActiveTab('all')} className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>{t.forum_reaction_all} <span className="text-xs ml-1 bg-gray-100 px-1.5 rounded-full">{users.length}</span></button>
                        {availableTypes.map(type => {
                            const reactObj = REACTIONS_BASE.find(r => r.id === type);
                            const icon = reactObj?.icon;
                            const count = users.filter(u => u.reactionType === type).length;
                            return <button key={type} onClick={() => setActiveTab(type)} className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1 ${activeTab === type ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}><span>{icon}</span> <span className="text-xs">{count}</span></button>
                        })}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-full animate-pulse"></div>)}</div> : (
                        <div className="space-y-4">
                            {displayList.map(u => (
                                <div key={u.id} className="flex items-center gap-3 cursor-pointer group" onClick={() => { onUserClick && onUserClick(u); onClose(); }}>
                                    <div className="relative"><img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="" /><div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm text-[10px]">{REACTIONS_BASE.find(r => r.id === u.reactionType)?.icon}</div></div>
                                    <span className="font-bold text-slate-800 text-sm group-hover:underline">{u.full_name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReactionSummary = ({ reactions, onClick, t }) => {
    if (!Array.isArray(reactions) || reactions.length === 0) return null;
    const counts = reactions.reduce((acc, curr) => { const type = curr.type || 'like'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
    
    // Tạo tooltip text
    const tooltipText = sortedTypes.map(type => {
        const reactObj = REACTIONS_BASE.find(r => r.id === type);
        const label = reactObj ? (t[reactObj.labelKey] || reactObj.labelKey) : type;
        return `${label}: ${counts[type]}`;
    }).join('\n');

    return (
        <div className="group/stats relative flex items-center cursor-pointer hover:bg-gray-50 rounded-full pr-2 transition-colors" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <div className="flex items-center gap-1 bg-white rounded-full px-1 shadow-sm border border-gray-100">
                <div className="flex -space-x-1">{sortedTypes.map(type => <span key={type} className="text-[10px] bg-gray-50 rounded-full w-4 h-4 flex items-center justify-center border border-white relative z-10">{REACTIONS_BASE.find(r => r.id === type)?.icon || '👍'}</span>)}</div>
                <span className="text-[11px] text-gray-500 font-medium pl-1 hover:underline">{reactions.length}</span>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/stats:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-pre z-50 pointer-events-none">{tooltipText}</div>
        </div>
    );
};

// --- CONFIRM DIALOG ---
const ConfirmDialog = ({ title, message, onConfirm, onCancel, t }) => (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 border border-gray-100 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-red-500">🗑️</div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">{title}</h3>
            <p className="text-gray-500 text-sm text-center mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors">{t.forum_btn_cancel}</button>
                <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all">{t.forum_btn_confirm_delete}</button>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
const ForumTab = ({ user, onUserClick }) => {
    const { language } = useAppContext(); // ✅ Lấy language từ Context
    const t = translations[language] || translations.vi; // ✅ Lấy bộ từ điển

    const [posts, setPosts] = useState([]);
    const [newContent, setNewContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    
    // UI States
    const [commentInputs, setCommentInputs] = useState({});
    const [openComments, setOpenComments] = useState({});
    const [replyingTo, setReplyingTo] = useState({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null); 
    
    // Image Uploads
    const [selectedFiles, setSelectedFiles] = useState([]); 
    const [previewUrls, setPreviewUrls] = useState([]);     
    const [commentFiles, setCommentFiles] = useState({}); 
    const [commentPreviews, setCommentPreviews] = useState({}); 
    const [activeCommentEmoji, setActiveCommentEmoji] = useState(null); 
    
    // Modals
    const [showManager, setShowManager] = useState(false);
    const [viewingReactions, setViewingReactions] = useState(null);
    const [editingPost, setEditingPost] = useState(null);
    
    // Dialogs
    const [deleteConfirmId, setDeleteConfirmId] = useState(null); 
    const [deleteCommentInfo, setDeleteCommentInfo] = useState(null);

    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const inputRefs = useRef({}); 
    const commentFileInputRefs = useRef({}); 

    // --- FETCH ---
    const fetchPosts = async () => {
        if (posts.length === 0) setLoading(true);
        // Lấy bài viết, user, và comment kèm user của comment
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *, 
                users:user_id (id, full_name, avatar, level, gender, country), 
                comments (
                    id, content, created_at, likes, parent_id, images, user_id, 
                    users:user_id (id, full_name, avatar)
                )
            `)
            .order('created_at', { ascending: false });

        if (!error) {
            const sortedData = data.map(post => ({
                ...post,
                comments: post.comments ? post.comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) : []
            }));
            setPosts(sortedData);
        } else {
            console.error("Lỗi fetch posts:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();
        
        // Lắng nghe thay đổi DB
        const channel = supabase.channel('realtime-forum-full')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchPosts())
            .subscribe();
            
        const handleClickOutside = () => { setActiveMenu(null); setActiveCommentEmoji(null); };
        document.addEventListener('click', handleClickOutside);
        return () => { supabase.removeChannel(channel); document.removeEventListener('click', handleClickOutside); };
    }, []);

    const handleTextareaChange = (e) => { 
        setNewContent(e.target.value); 
        if (textareaRef.current) { 
            textareaRef.current.style.height = 'auto'; 
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; 
        }
    };
    
    const handleCommentInputChange = (postId, e) => { 
        setCommentInputs({ ...commentInputs, [postId]: e.target.value }); 
        const el = inputRefs.current[postId]; 
        if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
    };
    
    const handleScrollToPost = (postId) => { 
        setShowManager(false); 
        setTimeout(() => { 
            const element = document.getElementById(`post-${postId}`); 
            if (element) { 
                element.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                element.style.transition = 'all 0.5s'; 
                element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)'; 
                setTimeout(() => { element.style.boxShadow = 'none'; }, 1500); 
            } 
        }, 300); 
    };

    // --- POST LOGIC ---
    const handleImageSelect = (e) => { 
        const files = Array.from(e.target.files); 
        if (files.length > 0) { 
            setSelectedFiles([...selectedFiles, ...files]); 
            const newPreviews = files.map(file => URL.createObjectURL(file)); 
            setPreviewUrls([...previewUrls, ...newPreviews]); 
        }
    };
    
    const removeImage = (index) => { 
        const newFiles = selectedFiles.filter((_, i) => i !== index); 
        const newPreviews = previewUrls.filter((_, i) => i !== index); 
        setSelectedFiles(newFiles); 
        setPreviewUrls(newPreviews); 
        if (newFiles.length === 0 && fileInputRef.current) fileInputRef.current.value = ""; 
    };

    const handlePost = async () => {
        if (!newContent.trim() && selectedFiles.length === 0) return;
        setPosting(true);
        let uploadedImageUrls = [];
        
        // Upload ảnh Post
        if (selectedFiles.length > 0) {
            const uploadPromises = selectedFiles.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `posts/${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
                const { error } = await supabase.storage.from('chat-images').upload(fileName, file); // Dùng chung bucket chat-images cho tiện
                if (error) throw error;
                const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
                return data.publicUrl;
            });
            try { uploadedImageUrls = await Promise.all(uploadPromises); } 
            catch (error) { alert(t.forum_upload_error + error.message); setPosting(false); return; }
        }
        
        // Insert Post
        await supabase.from('posts').insert([{ 
            user_id: user.id, 
            content: newContent, 
            images: uploadedImageUrls, 
            likes: [] 
        }]);
        
        setNewContent(''); setSelectedFiles([]); setPreviewUrls([]); setShowEmojiPicker(false); setPosting(false); 
        if(textareaRef.current) textareaRef.current.style.height = 'auto'; 
    };
    
    // --- XÓA POST ---
    const requestDeletePost = (postId) => { setDeleteConfirmId(postId); };
    const confirmDeletePost = async () => { 
        if (deleteConfirmId) { 
            await supabase.from('posts').delete().eq('id', deleteConfirmId); 
            setDeleteConfirmId(null); 
        } 
    };
    
    const handlePostUpdated = (postId, newContent, newImages) => { 
        setPosts(posts.map(p => p.id === postId ? { ...p, content: newContent, images: newImages } : p)); 
    };
    
    const handlePostReaction = async (postId, currentLikes, type) => { 
        const newLikes = toggleReaction(currentLikes, user.id, type); 
        // Optimistic UI update
        setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p)); 
        await supabase.from('posts').update({ likes: newLikes }).eq('id', postId); 
    };

    // --- COMMENT LOGIC ---
    const handleCommentImageSelect = (e, postId) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const currentFiles = commentFiles[postId] || [];
            const currentPreviews = commentPreviews[postId] || [];
            const newFiles = [...currentFiles, ...files];
            const newPreviewUrls = files.map(file => URL.createObjectURL(file));
            setCommentFiles({ ...commentFiles, [postId]: newFiles });
            setCommentPreviews({ ...commentPreviews, [postId]: [...currentPreviews, ...newPreviewUrls] });
        }
    };
    
    const removeCommentImage = (postId, index) => {
        const files = commentFiles[postId].filter((_, i) => i !== index);
        const previews = commentPreviews[postId].filter((_, i) => i !== index);
        setCommentFiles({ ...commentFiles, [postId]: files }); 
        setCommentPreviews({ ...commentPreviews, [postId]: previews });
        if (files.length === 0 && commentFileInputRefs.current[postId]) commentFileInputRefs.current[postId].value = "";
    };
    
    const handleAddEmojiToComment = (postId, emoji) => { 
        setCommentInputs(prev => ({ ...prev, [postId]: (prev[postId] || '') + emoji })); 
        setActiveCommentEmoji(null); 
    };
    
    const handleCommentReaction = async (commentId, currentLikes, postId, type) => { 
        const newLikes = toggleReaction(currentLikes, user.id, type); 
        // Optimistic update
        setPosts(posts.map(p => { 
            if (p.id === postId) return { ...p, comments: p.comments.map(c => c.id === commentId ? { ...c, likes: newLikes } : c) }; 
            return p; 
        })); 
        await supabase.from('comments').update({ likes: newLikes }).eq('id', commentId); 
    };
    
    // --- XÓA COMMENT ---
    const requestDeleteComment = (postId, commentId) => { setDeleteCommentInfo({ postId, commentId }); };
    const confirmDeleteComment = async () => {
        if (deleteCommentInfo) {
            const { postId, commentId } = deleteCommentInfo;
            // Optimistic UI Delete
            setPosts(posts.map(p => {
                if (p.id === postId) return { ...p, comments: p.comments.filter(c => c.id !== commentId) };
                return p;
            }));
            setDeleteCommentInfo(null);
            const { error } = await supabase.from('comments').delete().eq('id', commentId);
            if (error) alert(t.forum_delete_error + error.message);
        }
    };

    const handleSendComment = async (postId) => {
        const content = commentInputs[postId]; 
        const files = commentFiles[postId] || [];
        if ((!content || !content.trim()) && files.length === 0) return;
        
        const parentId = replyingTo[postId]?.commentId || null;
        
        // Reset input UI ngay lập tức
        setCommentInputs({ ...commentInputs, [postId]: '' }); 
        setReplyingTo({ ...replyingTo, [postId]: null }); 
        setOpenComments({ ...openComments, [postId]: true }); 
        setCommentFiles({ ...commentFiles, [postId]: [] }); 
        setCommentPreviews({ ...commentPreviews, [postId]: [] });
        if (inputRefs.current[postId]) inputRefs.current[postId].style.height = 'auto'; 

        let uploadedImageUrls = [];
        if (files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `comments/${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;
                const { error } = await supabase.storage.from('chat-images').upload(fileName, file);
                if (error) throw error;
                const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
                return data.publicUrl;
            });
            try { uploadedImageUrls = await Promise.all(uploadPromises); } 
            catch (error) { console.error("Lỗi upload:", error); }
        }
        
        // Insert Comment
        await supabase.from('comments').insert([{ 
            post_id: postId, 
            user_id: user.id, 
            content: content, 
            parent_id: parentId, 
            images: uploadedImageUrls, 
            likes: [] 
        }]);
    };
    
    const handleReplyClick = (postId, commentId, userName) => { 
        setReplyingTo({ ...replyingTo, [postId]: { commentId, userName } }); 
        setCommentInputs({ ...commentInputs, [postId]: `@${userName} ` }); 
        if (inputRefs.current[postId]) inputRefs.current[postId].focus(); 
    };
    
    const cancelReply = (postId) => { 
        setReplyingTo({ ...replyingTo, [postId]: null }); 
        setCommentInputs({ ...commentInputs, [postId]: '' }); 
    };

    // --- RENDER COMMENT ITEM ---
    const renderCommentItem = (cmt, post, isReply = false) => {
        const cmtLikes = Array.isArray(cmt.likes) ? cmt.likes : [];
        const myReact = getMyReaction(cmtLikes, user.id);
        const isMyComment = user?.id === cmt.user_id; 
        
        let displayImages = [];
        if (cmt.images && Array.isArray(cmt.images) && cmt.images.length > 0) displayImages = cmt.images;

        return (
            <div key={cmt.id} className={`flex gap-2 group ${isReply ? 'ml-10 mt-1' : 'mt-3'}`}>
                <img src={cmt.users?.avatar} className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover mt-1 cursor-pointer`} alt="" onClick={() => onUserClick && onUserClick(cmt.users)} />
                <div className="flex-1">
                    <div className="bg-gray-100 rounded-2xl px-3 py-2 text-sm inline-block relative group/bubble min-w-[150px]">
                        <span className="font-bold text-slate-800 text-xs block mb-0.5 cursor-pointer hover:underline" onClick={() => onUserClick && onUserClick(cmt.users)}>{cmt.users?.full_name}</span>
                        {cmt.content && <span className="text-slate-800 break-words block whitespace-pre-wrap">{cmt.content}</span>}
                        {displayImages.length > 0 && <div className="mt-2 max-w-[300px]"><ImageGrid images={displayImages} /></div>}
                        {cmtLikes.length > 0 && <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-1 py-0.5 shadow-sm border border-gray-200 flex items-center gap-0.5 z-10"><ReactionSummary reactions={cmtLikes} onClick={() => setViewingReactions(cmtLikes)} t={t} /></div>}
                    </div>
                    <div className="flex gap-3 ml-3 mt-1 text-[11px] text-gray-500 font-medium items-center relative">
                        <CustomTooltip content={formatTimeFull(cmt.created_at)}><span className="text-gray-400 cursor-pointer hover:underline">{formatTimeRelative(cmt.created_at, t)}</span></CustomTooltip>
                        <div className="group/react relative">
                            <button className={`font-bold hover:underline ${myReact ? myReact.color : 'text-gray-500'}`} onClick={() => handleCommentReaction(cmt.id, cmtLikes, post.id, myReact ? myReact.id : 'like')}>{myReact ? (t[myReact.labelKey] || myReact.labelKey) : t.forum_like}</button>
                            <div className="absolute bottom-full left-0 mb-0 pb-2 hidden group-hover/react:flex flex-col justify-end z-50"><div className="bg-white rounded-full shadow-xl border border-gray-100 p-1 flex gap-1 animate-in zoom-in-95 origin-bottom">{REACTIONS_BASE.map(react => <button key={react.id} onClick={(e) => { e.stopPropagation(); handleCommentReaction(cmt.id, cmtLikes, post.id, react.id); }} className="text-lg hover:scale-125 transition-transform p-0.5 origin-bottom" title={t[react.labelKey] || react.labelKey}>{react.icon}</button>)}</div></div>
                        </div>
                        <button onClick={() => handleReplyClick(post.id, cmt.id, cmt.users?.full_name)} className="font-bold hover:underline text-gray-500">{t.forum_reply}</button>
                        {isMyComment && <button onClick={() => requestDeleteComment(post.id, cmt.id)} className="font-bold hover:underline text-red-500 hover:bg-red-50 px-1 rounded transition-colors">{t.forum_delete}</button>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[#f0f2f5] h-full flex flex-col relative z-10 overflow-hidden rounded-[2rem] border border-gray-200 shadow-xl font-sans">
            <div className="bg-white px-5 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm shrink-0 z-20">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">{t.forum_community_title} <span className="text-blue-600">{t.forum_kanji}</span></h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowManager(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full text-xs font-bold text-blue-700 border border-blue-200">{t.forum_manage_posts}</button>
                    <button onClick={fetchPosts} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 font-bold">{t.forum_refresh}</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                {/* CREATE POST BOX */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex gap-3 mb-2">
                        <img src={user?.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="" />
                        <div className="flex-1">
                            <div className="bg-gray-100 rounded-3xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-100/50">
                                <textarea ref={textareaRef} value={newContent} onChange={handleTextareaChange} placeholder={`${t.forum_placeholder_post} ${user?.full_name?.split(' ').pop()}?`} className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-[15px] resize-none text-slate-800 caret-blue-600 overflow-hidden" rows={1} style={{ minHeight: '40px' }} />
                            </div>
                            {previewUrls.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{previewUrls.map((url, idx) => <div key={idx} className="relative group rounded-lg overflow-hidden h-24 border border-gray-200"><img src={url} className="w-full h-full object-cover" alt="" /><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors text-xs">✕</button></div>)}</div>}
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-50 mt-2 px-1 relative">
                        <div className="flex gap-1">
                             <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-600 text-xs font-bold"><span className="text-green-500 text-lg">🖼️</span> {t.forum_btn_image}</button>
                             <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" multiple />
                             <div className="relative">
                                 <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg text-gray-600 text-xs font-bold"><span className="text-yellow-500 text-lg">😄</span> {t.forum_btn_emotion}</button>
                                 {showEmojiPicker && <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-2xl border border-gray-100 p-3 grid grid-cols-4 gap-2 w-56 z-50 animate-in fade-in zoom-in-95">{EMOJIS.map(emo => <button key={emo} onClick={() => { setNewContent(prev => prev + emo); setShowEmojiPicker(false); }} className="text-2xl hover:bg-gray-100 p-2 rounded-lg">{emo}</button>)}</div>}
                             </div>
                        </div>
                        <button onClick={handlePost} disabled={posting || (!newContent.trim() && selectedFiles.length === 0)} className="px-6 py-2 rounded-xl text-xs font-black bg-blue-600 text-white shadow-md hover:bg-blue-700 disabled:bg-gray-300">{posting ? t.forum_btn_posting : t.forum_btn_post}</button>
                    </div>
                </div>

                {/* POST LIST */}
                {posts.map((post) => {
                    const likes = Array.isArray(post.likes) ? post.likes : [];
                    const myReact = getMyReaction(likes, user.id);
                    const comments = post.comments || [];
                    const isOpen = openComments[post.id];
                    const rootComments = comments.filter(c => !c.parent_id);
                    const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

                    return (
                        <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-visible hover:shadow-md transition-shadow">
                            <div className="p-4 flex justify-between items-start">
                                <div className="flex gap-3">
                                    <img onClick={() => onUserClick && onUserClick(post.users)} src={post.users?.avatar} className="w-10 h-10 rounded-full border border-gray-100 object-cover cursor-pointer hover:opacity-90" alt="" />
                                    <div>
                                        <h4 onClick={() => onUserClick && onUserClick(post.users)} className="font-bold text-slate-800 text-sm hover:underline cursor-pointer">{post.users?.full_name}</h4>
                                        <div className="text-xs text-gray-500 flex items-center gap-1"><CustomTooltip content={formatTimeFull(post.created_at)}><span className="cursor-pointer hover:underline">{formatTimeRelative(post.created_at, t)}</span></CustomTooltip><span>•</span><span>🌎</span></div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === post.id ? null : post.id); }} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors font-bold">•••</button>
                                    {activeMenu === post.id && <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-xl border border-gray-100 p-1.5 w-40 z-50 animate-in fade-in zoom-in-95">{user?.id === post.user_id ? <><button onClick={() => { setEditingPost(post); setActiveMenu(null); }} className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-bold flex items-center gap-2">{t.forum_edit}</button><button onClick={() => requestDeletePost(post.id)} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-2">{t.forum_delete_post}</button></> : <button className="w-full text-left px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium">{t.forum_report}</button>}</div>}
                                </div>
                            </div>

                            <div className="px-4 pb-3">
                                {post.content && <p className="text-slate-800 text-[15px] whitespace-pre-wrap mb-2 leading-relaxed">{post.content}</p>}
                                {(post.images && post.images.length > 0) ? <ImageGrid images={post.images} /> : null}
                            </div>
                            
                            <div className="px-4 py-2 flex justify-between items-center text-gray-500 text-xs mx-1">
                                <div className="flex items-center gap-1 h-5"><ReactionSummary reactions={likes} onClick={() => setViewingReactions(likes)} t={t} /></div>
                                <div className="hover:underline cursor-pointer font-medium" onClick={() => setOpenComments(prev => ({...prev, [post.id]: !prev[post.id]}))}>{comments.length > 0 ? `${comments.length} ${t.forum_comment_count}` : ''}</div>
                            </div>

                            <div className="px-2 py-1 flex border-t border-gray-100 mx-2 mt-1">
                                <div className="flex-1 group relative">
                                    <button onClick={() => handlePostReaction(post.id, likes, myReact ? myReact.id : 'like')} className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors ${myReact ? myReact.color : 'text-gray-600 hover:bg-gray-100'}`}><span>{myReact ? myReact.icon : '👍'}</span> {myReact ? (t[myReact.labelKey] || myReact.labelKey) : t.forum_like}</button>
                                    <div className="absolute bottom-full left-0 w-full flex justify-center pb-2 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50"><div className="bg-white rounded-full shadow-xl border border-gray-100 p-1.5 flex gap-2 animate-in zoom-in-95 origin-bottom">{REACTIONS_BASE.map(react => <button key={react.id} onClick={(e) => { e.stopPropagation(); handlePostReaction(post.id, likes, react.id); }} className="text-2xl hover:scale-125 transition-transform origin-bottom" title={t[react.labelKey] || react.labelKey}>{react.icon}</button>)}</div></div>
                                </div>
                                <button onClick={() => setOpenComments(prev => ({...prev, [post.id]: !prev[post.id]}))} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-bold">{t.forum_comment}</button>
                            </div>

                            {isOpen && (
                                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                                    <div className="mb-4 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                        {rootComments.map(cmt => <div key={cmt.id}>{renderCommentItem(cmt, post)}{getReplies(cmt.id).map(reply => renderCommentItem(reply, post, true))}</div>)}
                                    </div>
                                    <div className="flex gap-2 items-end">
                                        <img src={user?.avatar} className="w-8 h-8 rounded-full border border-gray-200 mb-1" alt="" />
                                        <div className="flex-1 bg-gray-100 rounded-2xl px-3 py-2 relative transition-all focus-within:ring-1 focus-within:ring-blue-200">
                                            {replyingTo[post.id] && <div className="flex justify-between items-center text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg mb-1 w-fit"><span>{t.forum_replying_to} <b>{replyingTo[post.id].userName}</b></span><button onClick={() => cancelReply(post.id)} className="ml-2 hover:text-red-500 font-bold">✕</button></div>}
                                            {commentPreviews[post.id] && commentPreviews[post.id].length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto pb-1 max-w-[250px]">{commentPreviews[post.id].map((url, idx) => <div key={idx} className="relative shrink-0 w-14 h-14 rounded-lg border border-gray-200 bg-white overflow-hidden"><img src={url} alt="" className="w-full h-full object-cover" /><button onClick={() => removeCommentImage(post.id, idx)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[8px] hover:bg-black">✕</button></div>)}</div>}
                                            <div className="flex items-end gap-2">
                                                <textarea ref={(el) => (inputRefs.current[post.id] = el)} value={commentInputs[post.id] || ''} onChange={(e) => handleCommentInputChange(post.id, e)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendComment(post.id))} placeholder={t.forum_write_comment} className="w-full bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder-gray-500 resize-none overflow-hidden py-1 max-h-32" rows={1} />
                                                <div className="flex gap-1 shrink-0 pb-0.5">
                                                    <div className="relative"><button onClick={(e) => { e.stopPropagation(); setActiveCommentEmoji(activeCommentEmoji === post.id ? null : post.id); }} className="text-gray-400 hover:text-yellow-500 hover:bg-gray-200 p-1.5 rounded-full transition-colors">😄</button>{activeCommentEmoji === post.id && <div className="absolute bottom-full right-0 mb-2 bg-white shadow-xl rounded-2xl border border-gray-100 p-2 grid grid-cols-4 gap-1 w-48 z-[100] animate-in zoom-in-95">{EMOJIS.map(emo => <button key={emo} onClick={() => handleAddEmojiToComment(post.id, emo)} className="text-xl hover:bg-gray-100 p-1 rounded-lg">{emo}</button>)}</div>}</div>
                                                    <button onClick={() => commentFileInputRefs.current[post.id].click()} className="text-lg hover:bg-gray-200 p-1 rounded-full transition-colors" title="Đính kèm ảnh"><span className="text-green-500">🖼️</span></button>
                                                    <input type="file" ref={el => commentFileInputRefs.current[post.id] = el} onChange={(e) => handleCommentImageSelect(e, post.id)} className="hidden" accept="image/*" multiple />
                                                    <button onClick={() => handleSendComment(post.id)} disabled={!commentInputs[post.id]?.trim() && (!commentFiles[post.id] || commentFiles[post.id].length === 0)} className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {showManager && <MyPostsManager user={user} onClose={() => setShowManager(false)} onPostClick={handleScrollToPost} />}
            {viewingReactions && <ReactionListModal reactions={viewingReactions} onClose={() => setViewingReactions(null)} onUserClick={onUserClick} t={t} />}
            {editingPost && <EditPostModal post={editingPost} user={user} onClose={() => setEditingPost(null)} onUpdate={handlePostUpdated} />}
            {deleteConfirmId && <ConfirmDialog title={t.forum_delete_confirm_title} message={t.forum_delete_confirm_msg} onConfirm={confirmDeletePost} onCancel={() => setDeleteConfirmId(null)} t={t} />}
            {deleteCommentInfo && <ConfirmDialog title={t.forum_delete_comment_title} message={t.forum_delete_comment_msg} onConfirm={confirmDeleteComment} onCancel={() => setDeleteCommentInfo(null)} t={t} />}
            
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }`}</style>
        </div>
    );
};

export default ForumTab;