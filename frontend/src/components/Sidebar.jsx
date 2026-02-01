import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { translations } from '../utils/translations'; 

// --- BỘ ICON SVG TÙY CHỈNH ---
const Icons = {
    // Icon Ông lão (Chatbot) - Giữ nguyên
    OldMan: () => (
        <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 45 L50 10 L90 45 Z" fill="currentColor" stroke="none" />
            <path d="M35 50 Q50 90 65 50 Z" fill="currentColor" stroke="none" />
        </svg>
    ),
    
    // ✅ ICON GAMEPAD MỚI (MÀU MÈ & NGẦU HƠN)
    GameController: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Thân tay cầm màu Tím (Violet) */}
            <rect x="2" y="6" width="20" height="13" rx="4.5" fill="#8B5CF6" />
            {/* Bóng đổ nhẹ bên dưới để tạo khối 3D */}
            <rect x="2" y="16" width="20" height="3" rx="4.5" fill="#7C3AED" />
            
            {/* D-Pad (Phím điều hướng) màu trắng */}
            <path d="M7 11H9V9H10V11H12V12H10V14H9V12H7V11Z" fill="white" />

            {/* Các nút bấm ABXY nhiều màu */}
            <circle cx="15.5" cy="12.5" r="1.2" fill="#FACC15" /> {/* Vàng */}
            <circle cx="17.5" cy="10.5" r="1.2" fill="#EF4444" /> {/* Đỏ */}
            <circle cx="17.5" cy="14.5" r="1.2" fill="#3B82F6" /> {/* Xanh dương */}
            <circle cx="19.5" cy="12.5" r="1.2" fill="#22C55E" /> {/* Xanh lá */}
        </svg>
    ),

    // ✅ ICON THỐNG KÊ (Biểu đồ cột gradient đẹp)
    Statistics: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Nền bo tròn */}
            <rect x="1" y="3" width="22" height="18" rx="3" fill="url(#statsGrad)" />
            {/* Các cột biểu đồ */}
            <rect x="4" y="12" width="3" height="6" rx="1" fill="white" opacity="0.9"/>
            <rect x="8.5" y="8" width="3" height="10" rx="1" fill="white" opacity="0.95"/>
            <rect x="13" y="10" width="3" height="8" rx="1" fill="white" opacity="0.9"/>
            <rect x="17.5" y="6" width="3" height="12" rx="1" fill="white"/>
            {/* Đường trend line */}
            <path d="M5.5 11 L10 7 L14.5 9 L19 5" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="19" cy="5" r="1.5" fill="#FCD34D"/>
            <defs>
                <linearGradient id="statsGrad" x1="1" y1="3" x2="23" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#06B6D4"/>
                    <stop offset="1" stopColor="#0891B2"/>
                </linearGradient>
            </defs>
        </svg>
    )
};

// --- CẤU HÌNH MENU ---
const MENU_ITEMS = [
    { path: '/', icon: '🏠', labelKey: 'menu_home', defaultLabel: 'Trang chủ' },
    { path: '/viet-tay', icon: '✍️', labelKey: 'menu_handwriting', defaultLabel: 'Tra cứu' },
    { path: '/chat', icon: <Icons.OldMan />, labelKey: 'menu_chatbot', defaultLabel: 'Chatbot', isSvg: true },
    { path: '/dictionary', icon: '📖', labelKey: 'menu_dictionary', defaultLabel: 'Từ điển' },
    { path: '/translator', icon: '🌐', labelKey: 'menu_translator', defaultLabel: 'Dịch thuật' },
    { path: '/flashcards', icon: '🎴', labelKey: 'menu_flashcard', defaultLabel: 'Flashcard' },
    { path: '/challenge', icon: '⚔️', labelKey: 'menu_challenge', defaultLabel: 'Thử thách' },
    
    // ✅ Dùng Icon GameController mới
    { path: '/arena', icon: <Icons.GameController />, labelKey: 'menu_game', defaultLabel: 'Trò chơi', isSvg: true }, 
    
    // ✅ Icon Thống kê mới
    { path: '/statistics', icon: <Icons.Statistics />, labelKey: 'menu_statistics', defaultLabel: 'Thống kê', isSvg: true },
    
    { path: '/world', icon: '🌍', labelKey: 'menu_world', defaultLabel: 'Thế Giới', hasNotification: true }
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, notifications, language } = useAppContext(); 
  
  const t = translations[language] || translations.vi;
  const totalNotifications = (notifications?.message || 0) + (notifications?.forum || 0);

  return (
    <aside className="w-72 bg-white border-r border-gray-100 p-6 flex flex-col shadow-sm z-50 flex-shrink-0 h-screen font-sans">
      
      {/* --- LOGO --- */}
      <div className="mb-10 flex items-center gap-3 select-none cursor-pointer group" onClick={() => navigate('/')}>
         <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white text-2xl shadow-xl transition-transform group-hover:scale-105" style={{ fontFamily: "'Yuji Syuku', serif" }}>
           漢
         </div>
         <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mt-1" style={{ fontFamily: "'Yuji Syuku', serif" }}>
           KAN
         </h1>
      </div>

      {/* --- MENU LIST --- */}
      <nav className="flex-1 space-y-2 text-sm overflow-y-auto custom-scrollbar pr-2 min-h-0">
        {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const notificationCount = item.hasNotification ? totalNotifications : 0;

            return (
                <div 
                    key={item.path}
                    onClick={() => navigate(item.path)} 
                    className={`
                        relative px-4 py-3.5 rounded-2xl cursor-pointer flex items-center gap-3 transition-all select-none group font-bold
                        ${isActive 
                            ? 'bg-black text-white shadow-md' 
                            : 'text-gray-400 hover:text-black hover:bg-gray-50' 
                        }
                    `}
                >
                    {/* Icon Container */}
                    <span className={`text-xl w-6 text-center shrink-0 leading-none flex items-center justify-center ${item.isSvg && !isActive ? 'text-gray-400 group-hover:text-black' : ''}`}>
                        {item.icon}
                    </span>
                    
                    {/* Label */}
                    <span className="tracking-wide truncate">
                        {t[item.labelKey] || item.defaultLabel}
                    </span>

                    {/* Notification Badge */}
                    {notificationCount > 0 && (
                        <span className="absolute right-4 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                            {notificationCount > 99 ? '99+' : notificationCount}
                        </span>
                    )}
                </div>
            );
        })}
      </nav>

      {/* --- USER INFO --- */}
      <div className="mt-auto pt-6 border-t border-gray-100 shrink-0">
         <div 
           onClick={() => navigate('/profile')} 
           className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-xl border border-gray-100/50 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all group"
         >
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shadow-sm overflow-hidden shrink-0">
               {user?.avatar ? (
                   <img src={user.avatar} alt="Avt" className="w-full h-full object-cover" />
               ) : (
                   <span>{user?.name?.charAt(0) || user?.full_name?.charAt(0) || 'U'}</span>
               )}
            </div>
            <div className="flex-col hidden md:flex min-w-0">
               <span className="font-bold text-sm text-slate-800 uppercase group-hover:text-black truncate">
                   {user?.name || user?.full_name || 'Khách'}
               </span>
               <span className="text-[10px] text-slate-400 font-bold group-hover:text-blue-500 transition-colors uppercase">
                   {t.menu_profile_view || "XEM HỒ SƠ"} ➝
               </span>
            </div>
         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .font-kai { font-family: 'Yuji Syuku', serif; }
      `}</style>

    </aside>
  );
};

export default Sidebar;