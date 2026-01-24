import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PublicProfile = ({ targetUser, currentUser, onBack }) => {
    const [status, setStatus] = useState('loading'); // 'none', 'pending', 'friends', 'received'
    const [loadingAction, setLoadingAction] = useState(false);

    // 1. Kiểm tra trạng thái bạn bè
    useEffect(() => {
        const checkStatus = async () => {
            if (!currentUser || !targetUser) return;
            
            const { data } = await supabase
                .from('friendships')
                .select('*')
                .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},receiver_id.eq.${currentUser.id})`)
                .maybeSingle();

            if (!data) {
                setStatus('none');
            } else if (data.status === 'accepted') {
                setStatus('friends');
            } else if (data.status === 'pending') {
                if (data.requester_id === currentUser.id) setStatus('sent');
                else setStatus('received');
            }
        };
        checkStatus();
    }, [currentUser, targetUser]);

    // 2. Xử lý hành động kết bạn
    const handleAction = async (action) => {
        setLoadingAction(true);
        try {
            if (action === 'add') {
                await supabase.from('friendships').insert({ requester_id: currentUser.id, receiver_id: targetUser.id, status: 'pending' });
                setStatus('sent');
            } else if (action === 'accept') {
                await supabase.from('friendships').update({ status: 'accepted' }).match({ requester_id: targetUser.id, receiver_id: currentUser.id });
                setStatus('friends');
            } else if (['cancel', 'unfriend', 'reject'].includes(action)) {
                await supabase.from('friendships').delete().or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},receiver_id.eq.${currentUser.id})`);
                setStatus('none');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAction(false);
        }
    };

    // 3. Render nút bấm (Thay thế phần Mật khẩu/Lưu)
    const renderFriendActions = () => {
        if (currentUser.id === targetUser.id) {
            return <div className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl font-bold text-center border-2 border-dashed border-gray-200">Đây là hồ sơ của bạn</div>;
        }
        if (loadingAction) return <button className="w-full py-4 bg-gray-100 rounded-2xl font-bold text-gray-400 animate-pulse">⏳ Đang xử lý...</button>;

        switch (status) {
            case 'friends':
                return (
                    <div className="space-y-4">
                        <div className="w-full py-4 bg-green-50 text-green-600 rounded-2xl font-black text-center border border-green-200">✓ Bạn bè</div>
                        <button onClick={() => handleAction('unfriend')} className="w-full py-3 bg-white border-2 border-red-100 text-red-400 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all">Hủy kết bạn</button>
                    </div>
                );
            case 'sent':
                return <button onClick={() => handleAction('cancel')} className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all">Đã gửi lời mời (Hủy)</button>;
            case 'received':
                return (
                    <div className="space-y-3">
                        <button onClick={() => handleAction('accept')} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 hover:scale-[1.02] transition-all">Chấp nhận lời mời</button>
                        <button onClick={() => handleAction('reject')} className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200">Từ chối</button>
                    </div>
                );
            default:
                return <button onClick={() => handleAction('add')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><span>👋</span> Thêm bạn bè</button>;
        }
    };

    // Component hiển thị input dạng Read-only
    const ReadOnlyInput = ({ label, value }) => (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
            <div className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold text-gray-700 truncate">
                {value || "Chưa cập nhật"}
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in-up bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 md:p-12 relative overflow-hidden">
            {/* Header / Avatar Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12">
                <div className="relative">
                    <div className="w-40 h-40 rounded-[2.5rem] bg-gray-50 overflow-hidden shadow-2xl border-[6px] border-white ring-1 ring-gray-100">
                        <img src={targetUser.avatar || `https://ui-avatars.com/api/?name=${targetUser.full_name}`} alt="" className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">{targetUser.full_name || 'NO NAME'}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                            <span className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">{targetUser.level || 'N5'} MEMBER</span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">{targetUser.country || 'VN'}</span>
                        </div>
                    </div>
                    {/* Nút Back */}
                    <button onClick={onBack} className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 transition-all">
                        ← Quay lại danh sách bạn bè
                    </button>
                </div>
            </div>

            {/* Layout Grid: Bên trái Thông tin, Bên phải Hành động */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* CỘT TRÁI: THÔNG TIN CÁ NHÂN (READ ONLY) */}
                <div className="lg:col-span-2 space-y-10">
                    <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-2">Thông tin cơ bản</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                            <ReadOnlyInput label="Họ và tên" value={targetUser.full_name} />
                            <ReadOnlyInput label="Email" value={targetUser.email} />
                            <ReadOnlyInput label="Số điện thoại" value={targetUser.phone} />
                            <ReadOnlyInput label="Ngày sinh" value={targetUser.birthdate} />
                            
                            {/* Giới tính (Kanji Button Style - Read Only) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giới tính</label>
                                <div className="flex gap-2">
                                    <div className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center opacity-100 ${targetUser.gender === 'male' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                        <span className="text-xl font-kai">男</span>
                                    </div>
                                    <div className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center opacity-100 ${targetUser.gender === 'female' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                        <span className="text-xl font-kai">女</span>
                                    </div>
                                    <div className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center opacity-100 ${targetUser.gender === 'other' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                        <span className="text-xl font-kai">他</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <ReadOnlyInput label="Địa chỉ" value={targetUser.address} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-2">Giới thiệu (Bio)</h3>
                        <div className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 font-medium text-gray-600 italic h-32 overflow-y-auto">
                            "{targetUser.bio || "Người dùng này chưa viết giới thiệu."}"
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: TRẠNG THÁI BẠN BÈ (THAY CHO BẢO MẬT) */}
                <div className="space-y-10">
                    <div>
                        <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6 border-b border-blue-100 pb-2">Trạng thái kết nối</h3>
                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 text-center space-y-6">
                            <div className="text-6xl animate-bounce-slow">
                                {status === 'friends' ? '🤝' : status === 'sent' ? '📩' : status === 'received' ? '📬' : '👋'}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-lg mb-1">
                                    {status === 'friends' ? 'Đã là bạn bè' : status === 'sent' ? 'Đã gửi lời mời' : status === 'received' ? 'Muốn kết bạn với bạn' : 'Chưa kết bạn'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {status === 'friends' ? 'Hai bạn đã có thể nhắn tin và xem tiến độ của nhau.' : 'Kết nối để cùng nhau học tập hiệu quả hơn!'}
                                </p>
                            </div>
                            
                            {/* NÚT HÀNH ĐỘNG CHÍNH */}
                            {renderFriendActions()}
                        </div>
                    </div>

                    {/* Thống kê nhanh (Optional) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-yellow-50 p-4 rounded-2xl text-center border border-yellow-100">
                            <div className="text-2xl font-black text-yellow-600">{targetUser.kanji_learned || 0}</div>
                            <div className="text-[9px] font-bold text-yellow-800 uppercase tracking-widest">Kanji</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                            <div className="text-2xl font-black text-blue-600">{targetUser.lessons_completed || 0}</div>
                            <div className="text-[9px] font-bold text-blue-800 uppercase tracking-widest">Bài học</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;