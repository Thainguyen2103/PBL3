import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient';

// --- HÀM HELPER THỜI GIAN ---
const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${date.getDate()}/${date.getMonth() + 1}`;
};

const ForumPage = () => {
    const { user } = useAppContext();
    const [posts, setPosts] = useState([]);
    const [newContent, setNewContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    // --- 1. LẤY DỮ LIỆU BÀI VIẾT ---
    const fetchPosts = async () => {
        setLoading(true);
        // Join bảng posts với bảng users để lấy tên và avatar
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                users:user_id (full_name, avatar, level)
            `)
            .order('created_at', { ascending: false });

        if (!error) setPosts(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    // --- 2. ĐĂNG BÀI ---
    const handlePost = async () => {
        if (!newContent.trim()) return;
        setPosting(true);

        const { error } = await supabase
            .from('posts')
            .insert([{ user_id: user.id, content: newContent }]);

        if (!error) {
            setNewContent('');
            fetchPosts(); // Refresh lại feed
        } else {
            alert('Lỗi đăng bài: ' + error.message);
        }
        setPosting(false);
    };

    // --- 3. XỬ LÝ LIKE ---
    const handleLike = async (postId, currentLikes) => {
        const isLiked = currentLikes.includes(user.id);
        let newLikes;

        if (isLiked) {
            newLikes = currentLikes.filter(id => id !== user.id); // Unlike
        } else {
            newLikes = [...currentLikes, user.id]; // Like
        }

        // Cập nhật UI ngay lập tức (Optimistic UI)
        setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p));

        // Cập nhật Database
        await supabase
            .from('posts')
            .update({ likes: newLikes })
            .eq('id', postId);
    };

    return (
        <div className="flex h-screen bg-[#Fdfdfd] font-sans text-slate-900 overflow-hidden">
            <Sidebar />

            <main className="flex-1 h-full flex flex-col bg-slate-50/50 overflow-hidden relative">
                {/* HEADER */}
                <div className="p-6 border-b border-gray-100 bg-white shadow-sm z-10">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        Diễn Đàn Thảo Luận <span className="text-2xl animate-pulse">💬</span>
                    </h1>
                    <p className="text-gray-500 text-xs mt-1">Nơi trao đổi kiến thức và chém gió của các Chiến Binh Kanji.</p>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    <div className="max-w-2xl mx-auto space-y-6">
                        
                        {/* --- Ô ĐĂNG BÀI --- */}
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">
                                    <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.full_name}`} alt="Me" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="Hôm nay bạn học được từ mới nào? Chia sẻ đi..."
                                        className="w-full bg-gray-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none h-24"
                                    />
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="flex gap-2 text-gray-400">
                                            <button className="hover:bg-gray-100 p-2 rounded-full transition-colors" title="Thêm ảnh">🖼️</button>
                                            <button className="hover:bg-gray-100 p-2 rounded-full transition-colors" title="Thêm Kanji">mV</button>
                                        </div>
                                        <button 
                                            onClick={handlePost}
                                            disabled={posting || !newContent.trim()}
                                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all ${!newContent.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/30'}`}
                                        >
                                            {posting ? 'Đang đăng...' : 'Đăng Bài'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- DANH SÁCH BÀI VIẾT (FEED) --- */}
                        {loading ? (
                            <div className="text-center py-10 text-gray-400 text-sm">⏳ Đang tải tin mới...</div>
                        ) : (
                            posts.map((post) => {
                                const isLiked = post.likes?.includes(user?.id);
                                return (
                                    <div key={post.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                        {/* Post Header */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 cursor-pointer">
                                                    <img src={post.users?.avatar || `https://ui-avatars.com/api/?name=${post.users?.full_name}`} alt="Avt" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                        {post.users?.full_name}
                                                        {/* Badge Level nếu có */}
                                                        {post.users?.level && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{post.users.level}</span>}
                                                    </h4>
                                                    <span className="text-xs text-gray-400 block">{timeAgo(post.created_at)}</span>
                                                </div>
                                            </div>
                                            <button className="text-gray-300 hover:text-gray-600">•••</button>
                                        </div>

                                        {/* Post Content */}
                                        <div className="text-slate-700 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                                            {post.content}
                                        </div>

                                        {/* Post Image (Nếu có - Demo placeholder) */}
                                        {/* {post.image_url && <img src={post.image_url} className="w-full rounded-xl mb-4 border border-gray-100" />} */}

                                        {/* Post Actions */}
                                        <div className="flex items-center gap-6 border-t border-gray-50 pt-3">
                                            <button 
                                                onClick={() => handleLike(post.id, post.likes || [])}
                                                className={`flex items-center gap-2 text-xs font-bold transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                                            >
                                                <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                                                {post.likes?.length || 0}
                                            </button>
                                            
                                            <button className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-indigo-500 transition-colors">
                                                <span className="text-lg">💬</span>
                                                Bình luận
                                            </button>

                                            <button className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-500 transition-colors ml-auto">
                                                <span className="text-lg">✈️</span>
                                                Gửi
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        
                        {/* End of Feed */}
                        {!loading && posts.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <div className="text-4xl mb-2">🦗</div>
                                <p>Chưa có bài viết nào. Hãy là người đầu tiên!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default ForumPage;