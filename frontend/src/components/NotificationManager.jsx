import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

const NotificationManager = () => {
    const { user, setNotifications } = useAppContext();

    useEffect(() => {
        if (!user) return;

        console.log("🔌 NotificationManager: Đang lắng nghe...");

        // 1. Lấy số lượng ban đầu
        const fetchInitialCounts = async () => {
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);
            setNotifications(prev => ({ ...prev, message: count || 0 }));
        };
        fetchInitialCounts();

        // 2. Kênh Realtime
        const channel = supabase.channel('global_notifications')
            
            // --- A. TIN NHẮN MỚI ---
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (String(payload.new.receiver_id) === String(user.id)) {
                    setNotifications(prev => ({ ...prev, message: prev.message + 1 }));
                }
            })

            // --- B. DIỄN ĐÀN: CÓ BÀI MỚI (INSERT) ---
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
                // Nếu người đăng không phải mình -> Báo đỏ
                if (String(payload.new.user_id) !== String(user.id)) {
                    setNotifications(prev => ({ ...prev, forum: prev.forum + 1 }));
                }
            })

            // --- C. DIỄN ĐÀN: THẢ TIM/HAHA (UPDATE) ---
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
                console.log("⚡ Có sự kiện UPDATE bài viết:", payload);

                // 1. Kiểm tra xem bài viết này có phải của MÌNH không?
                // (Lưu ý: trong ảnh bạn gửi cột là 'user_id', nhưng đôi khi Supabase trả về string/number nên ép kiểu cho chắc)
                const isMyPost = String(payload.new.user_id) === String(user.id);

                if (isMyPost) {
                    // 2. Lấy mảng like cũ và mới
                    // Nếu chưa chạy lệnh SQL Bước 1 thì payload.old sẽ rỗng -> fallback về mảng rỗng
                    const oldLikes = payload.old && payload.old.likes ? payload.old.likes : [];
                    const newLikes = payload.new.likes || [];

                    console.log("🔍 So sánh Likes:", { old: oldLikes.length, new: newLikes.length });

                    // 3. Logic: Nếu số lượng like tăng lên, hoặc nội dung like thay đổi -> Báo đỏ
                    // (JSON.stringify để so sánh nội dung mảng)
                    if (JSON.stringify(oldLikes) !== JSON.stringify(newLikes)) {
                        console.log("✅ Có tương tác mới vào bài của bạn! -> +1 Thông báo");
                        setNotifications(prev => ({ ...prev, forum: prev.forum + 1 }));
                    } else {
                        console.log("❌ Không có thay đổi về like (có thể chỉ sửa text).");
                    }
                } else {
                    console.log("❌ Đây không phải bài của bạn (User ID bài viết:", payload.new.user_id, "- User ID bạn:", user.id, ")");
                }
            })

            .subscribe((status) => {
                console.log("📡 Trạng thái kết nối:", status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, setNotifications]);

    return null;
};

export default NotificationManager;