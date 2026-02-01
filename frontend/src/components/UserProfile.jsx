import React from 'react';
import { useNavigate } from 'react-router-dom';
// 👇 1. QUAN TRỌNG: Phải Import cái này để nghe ngóng dữ liệu thay đổi
import { useAppContext } from '../context/AppContext';

const UserProfile = () => {
  const navigate = useNavigate();
  
  // 👇 2. Lấy user từ Context (Thay vì dùng dữ liệu cứng)
  const { user } = useAppContext();

  // Nếu chưa đăng nhập thì không hiện gì
  if (!user) return null;

  return (
    <div 
      onClick={() => navigate('/profile')}
      className="mt-auto bg-gray-50 p-3 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-all border border-gray-100 group"
    >
      {/* AVATAR: Lấy từ user.avatar */}
      <div className="relative">
        <img 
          src={user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sensei'} 
          alt="Avatar" 
          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
        />
        {/* Chấm xanh */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
      </div>

      {/* INFO: Lấy từ user.full_name và user.level */}
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-sm text-gray-900 truncate">
            {user.full_name || user.email?.split('@')[0] || 'Học viên'}
        </h4>
        <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
           {user.level || 'N5'} Member <span className="text-[8px]">➔</span>
        </p>
      </div>
    </div>
  );
};

export default UserProfile;