import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations'; // Import file translations

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // Lấy ngôn ngữ từ LocalStorage hoặc mặc định là 'vi'
  const [language, setLanguage] = useState(() => localStorage.getItem('appLang') || 'vi');

  // --- ✅ CẬP NHẬT MỚI: STATE THÔNG BÁO ---
  const [notifications, setNotifications] = useState({
    message: 0, // Số tin nhắn chưa đọc
    forum: 0    // Số bài viết mới trên diễn đàn
  });

  // Biến 't' chứa toàn bộ text của ngôn ngữ hiện tại
  const t = translations[language];

  // Hàm login
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('session', JSON.stringify(userData));
  };

  // Hàm logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('session');
    // Reset thông báo khi đăng xuất
    setNotifications({ message: 0, forum: 0 });
  };

  const updateUserInfo = (newInfo) => {
    setUser(prev => ({ ...prev, ...newInfo }));
  };

  // Check session khi F5
  useEffect(() => {
    const session = localStorage.getItem('session');
    if (session) setUser(JSON.parse(session));
  }, []);

  // Lưu ngôn ngữ khi thay đổi
  useEffect(() => {
    localStorage.setItem('appLang', language);
  }, [language]);

  return (
    <AppContext.Provider value={{ 
        user, setUser, login, logout, updateUserInfo, 
        language, setLanguage, 
        t, 
        // ✅ XUẤT STATE THÔNG BÁO RA TOÀN APP
        notifications, setNotifications 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);