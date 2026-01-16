import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("Sensei");

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('session'));
    if (session && session.username) {
      setName(session.username);
    }
  }, []);

  return (
    <div 
      // Bấm vào là chuyển sang trang /profile ngay lập tức
      onClick={() => navigate('/profile')}
      className="mt-auto pt-4 border-t border-gray-100 cursor-pointer group"
    >
      <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
          {/* Avatar nhỏ */}
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform border-2 border-white">
              🦊
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-gray-800 truncate">{name}</h4>
              <p className="text-[10px] font-bold text-gray-400 truncate">Xem hồ sơ →</p>
          </div>
      </div>
    </div>
  );
};

export default UserProfile;