import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext'; // ✅ Import Context
import { translations } from '../utils/translations'; // ✅ Import Translations

// --- CẤU HÌNH ICON ĐƠN GIẢN ---
const REACTIONS = [
    { id: 'like', icon: '👍' },
    { id: 'love', icon: '❤️' },
    { id: 'haha', icon: '😆' },
    { id: 'wow', icon: '😮' },
    { id: 'sad', icon: '😢' },
    { id: 'angry', icon: '😡' },
];

// --- COMPONENT THỐNG KÊ MINI (Clean & Simple) ---
const MiniReactionSummary = ({ reactions }) => {
    if (!Array.isArray(reactions) || reactions.length === 0) return null;
    
    // Đếm số lượng
    const counts = reactions.reduce((acc, curr) => {
        const type = curr.type || 'like';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    // Lấy tối đa 2 icon phổ biến nhất để hiển thị cho gọn
    const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2);

    return (
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            <div className="flex text-xs space-x-0.5">
                {sortedTypes.map(t => (
                    <span key={t}>{REACTIONS.find(r => r.id === t)?.icon || '👍'}</span>
                ))}
            </div>
            <span className="text-[10px] font-bold text-gray-500">
                {reactions.length}
            </span>
        </div>
    );
};

// --- TOAST THÔNG BÁO ---
const Toast = ({ message }) => (
    <div className="fixed bottom-6 right-6 bg-white text-slate-800 border border-gray-100 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-[2000]">
        <span className="text-green-500 text-lg">✔</span>
        <span className="font-semibold text-xs">{message}</span>
    </div>
);

// --- HỘP THOẠI XÁC NHẬN ---
const DeleteConfirmDialog = ({ onConfirm, onCancel, t }) => (
    <div className="fixed inset-0 z-[2001] flex items-center justify-center bg-black/10 backdrop-blur-[1px] animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl p-5 w-72 border border-gray-100 transform scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-800 text-center mb-1">{t.myposts_delete_confirm_title}</h3>
            <p className="text-gray-500 text-xs text-center mb-5 leading-relaxed">
                {t.myposts_delete_confirm_msg}
            </p>
            <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-colors">
                    {t.myposts_btn_cancel}
                </button>
                <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 shadow-md shadow-red-200 transition-all">
                    {t.myposts_btn_delete}
                </button>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
const MyPostsManager = ({ user, onClose, onPostClick }) => {
    const { language } = useAppContext(); // ✅ Lấy language từ Context
    const t = translations[language] || translations.vi; // ✅ Lấy bộ từ điển

    const [myPosts, setMyPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State xử lý xóa
    const [deleteTarget, setDeleteTarget] = useState(null); 
    const [toastMsg, setToastMsg] = useState(null); 

    useEffect(() => {
        fetchMyPosts();
    }, [user]);

    const fetchMyPosts = async () => {
        const { data } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        setMyPosts(data || []);
        setLoading(false);
    };

    const requestDelete = (e, post) => {
        e.stopPropagation();
        setDeleteTarget(post);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        
        // Logic xóa ảnh trong storage (hỗ trợ cả cột images mới và image_url cũ)
        const imagesToDelete = [];
        if (deleteTarget.images && Array.isArray(deleteTarget.images)) {
            deleteTarget.images.forEach(url => {
                const path = url.split('forum-images/')[1];
                if (path) imagesToDelete.push(path);
            });
        } else if (deleteTarget.image_url) {
            const path = deleteTarget.image_url.split('forum-images/')[1];
            if (path) imagesToDelete.push(path);
        }

        if (imagesToDelete.length > 0) {
            await supabase.storage.from('forum-images').remove(imagesToDelete);
        }
        
        const { error } = await supabase.from('posts').delete().eq('id', deleteTarget.id);
        
        if (!error) {
            setMyPosts(myPosts.filter(p => p.id !== deleteTarget.id));
            setDeleteTarget(null);
            setToastMsg(t.myposts_toast_success);
            setTimeout(() => setToastMsg(null), 3000);
        } else {
            alert(t.myposts_error + error.message);
            setDeleteTarget(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-100">
                
                {/* Header đơn giản */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <span>🗂️</span> {t.myposts_title}
                        <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">{myPosts.length}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 w-8 h-8 rounded-full transition-all flex items-center justify-center font-bold">✕</button>
                </div>
                
                {/* Danh sách bài viết */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
                    {loading ? (
                        <div className="space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-lg animate-pulse border border-gray-100"></div>)}
                        </div>
                    ) : (
                        myPosts.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 text-sm">
                                {t.myposts_empty}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myPosts.map(post => {
                                    // Xử lý ảnh để hiển thị thumbnail
                                    let thumbUrl = null;
                                    if (post.images && post.images.length > 0) thumbUrl = post.images[0];
                                    else if (post.image_url) thumbUrl = post.image_url;

                                    const likes = Array.isArray(post.likes) ? post.likes : [];
                                    
                                    return (
                                        <div 
                                            key={post.id} 
                                            onClick={() => onPostClick(post.id)}
                                            className="group bg-white border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer flex gap-3"
                                        >
                                            {/* Thumbnail (Vuông vắn, đơn giản) */}
                                            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-50">
                                                {thumbUrl ? (
                                                    <img src={thumbUrl} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl grayscale opacity-30">📝</div>
                                                )}
                                            </div>

                                            {/* Nội dung */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                                <p className={`text-slate-700 text-sm font-medium line-clamp-1 ${!thumbUrl ? 'text-base' : ''}`}>
                                                    {post.content || <span className="text-gray-400 italic">{t.myposts_no_title}</span>}
                                                </p>
                                                
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                        {new Date(post.created_at).toLocaleDateString('vi-VN')}
                                                    </span>
                                                    
                                                    {/* Thống kê Like đơn giản */}
                                                    {likes.length > 0 && <MiniReactionSummary reactions={likes} />}
                                                </div>
                                            </div>

                                            {/* Nút Xóa (Icon thùng rác đơn giản) */}
                                            <div className="flex items-center pr-1">
                                                <button 
                                                    onClick={(e) => requestDelete(e, post)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    title={t.myposts_btn_delete}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Dialog & Toast */}
            {deleteTarget && <DeleteConfirmDialog onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} t={t} />}
            {toastMsg && <Toast message={toastMsg} />}
        </div>
    );
};

export default MyPostsManager;