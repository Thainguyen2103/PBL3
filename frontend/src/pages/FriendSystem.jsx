import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import PublicProfile from '../components/PublicProfile';

const FriendSystem = ({ user, initialSelectedUser, onBackToRank }) => {
    const [viewProfile, setViewProfile] = useState(initialSelectedUser);
    
    // Data Lists
    const [myFriends, setMyFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingSearch, setLoadingSearch] = useState(false);

    // Đồng bộ khi props thay đổi (từ WorldPage bấm vào)
    useEffect(() => {
        setViewProfile(initialSelectedUser); 
    }, [initialSelectedUser]);

    // Fetch dữ liệu bạn bè & lời mời
    const fetchData = useCallback(async () => {
        if (!user) return;
        
        const { data: rels } = await supabase.from('friendships').select('*')
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
        
        if (rels) {
            const friendIds = [];
            const reqIds = [];
            
            rels.forEach(r => {
                if (r.status === 'accepted') {
                    friendIds.push(r.requester_id === user.id ? r.receiver_id : r.requester_id);
                } else if (r.status === 'pending' && r.receiver_id === user.id) {
                    reqIds.push(r.requester_id); // Ai đó gửi cho mình
                }
            });

            if (friendIds.length) {
                const { data } = await supabase.from('users').select('*').in('id', friendIds);
                setMyFriends(data || []);
            } else setMyFriends([]);

            if (reqIds.length) {
                const { data } = await supabase.from('users').select('*').in('id', reqIds);
                setFriendRequests(data || []);
            } else setFriendRequests([]);
        }
    }, [user]);

    // Gọi fetch data khi mount hoặc khi đóng profile để refresh list
    useEffect(() => { fetchData(); }, [fetchData, viewProfile]);

    // Xử lý tìm kiếm
    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        
        if (term.length < 2) { 
            setSearchResults([]); 
            return; 
        }
        
        setLoadingSearch(true);
        // Tìm theo tên hoặc email
        const { data } = await supabase.from('users').select('*')
            .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
            .limit(10);
            
        setSearchResults(data || []);
        setLoadingSearch(false);
    };

    // Card nhỏ hiển thị trong danh sách
    const MiniCard = ({ target }) => (
        <div 
            onClick={() => setViewProfile(target)} 
            className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all hover:bg-gray-50 group"
        >
            <img 
                src={target.avatar || `https://ui-avatars.com/api/?name=${target.full_name}`} 
                className="w-10 h-10 rounded-full bg-gray-200 object-cover border border-gray-100" 
                alt="" 
            />
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                    {target.full_name}
                </h4>
                <p className="text-xs text-gray-400 truncate">{target.email}</p>
            </div>
            <span className="text-gray-300 text-lg group-hover:translate-x-1 transition-transform">›</span>
        </div>
    );

    // --- RENDER ---

    // 1. Nếu đang xem chi tiết hồ sơ
    if (viewProfile) {
        return (
            <div className="h-full">
                <PublicProfile 
                    targetUser={viewProfile} 
                    currentUser={user} 
                    onBack={() => {
                        setViewProfile(null);
                        if (onBackToRank) onBackToRank(); // Reset state ở cha
                    }} 
                />
            </div>
        );
    }

    // 2. Màn hình danh sách chính
    return (
        <div className="max-w-2xl mx-auto h-full flex flex-col">
            
            {/* SEARCH BAR (Đã sửa lỗi padding) */}
            <div className="relative mb-6 shrink-0 group">
                {/* Icon kính lúp nằm tuyệt đối */}
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                    <span className="text-xl group-focus-within:scale-110 transition-transform duration-300 opacity-50">🔍</span>
                </div>
                
                <input 
                    type="text" 
                    placeholder="Tìm chiến hữu bằng tên, email..." 
                    value={searchTerm}
                    onChange={handleSearch}
                    // pl-14 để chữ không đè lên icon
                    className="w-full py-4 pl-14 pr-6 rounded-2xl border-2 border-gray-100 bg-white font-bold text-slate-700 outline-none focus:border-slate-900 transition-all shadow-sm text-sm placeholder-gray-400"
                />
                
                {loadingSearch && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500 animate-pulse">
                        Searching...
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                
                {/* Kết quả tìm kiếm */}
                {searchTerm.length >= 2 && (
                    <div className="animate-fade-in">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Kết quả tìm kiếm</h3>
                        <div className="grid gap-2">
                            {searchResults.length > 0 ? (
                                searchResults.map(u => <MiniCard key={u.id} target={u} />)
                            ) : (
                                <div className="text-center py-4 text-gray-400 text-xs border-2 border-dashed border-gray-100 rounded-xl">
                                    Không tìm thấy chiến binh nào.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Danh sách mặc định (khi không search) */}
                {!searchTerm && (
                    <>
                        {/* Lời mời kết bạn */}
                        {friendRequests.length > 0 && (
                            <div className="animate-fade-in-down">
                                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                                    <span>💌</span> Lời mời kết bạn
                                </h3>
                                <div className="grid gap-2">
                                    {friendRequests.map(u => <MiniCard key={u.id} target={u} />)}
                                </div>
                            </div>
                        )}

                        {/* Danh sách bạn bè */}
                        <div>
                            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                                <span>💎</span> Bạn bè ({myFriends.length})
                            </h3>
                            {myFriends.length > 0 ? (
                                <div className="grid gap-2">
                                    {myFriends.map(u => <MiniCard key={u.id} target={u} />)}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-100 text-center">
                                    <div className="text-4xl mb-3 grayscale opacity-20">🙌</div>
                                    <p className="text-gray-500 font-bold text-sm">Chưa có bạn bè nào.</p>
                                    <p className="text-gray-400 text-xs mt-1">Hãy tìm kiếm để kết nối!</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FriendSystem;