import React, { createContext, useState, useEffect, useContext } from 'react';
import { translations } from '../utils/translations';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 1. Load User từ LocalStorage
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('session');
    return saved ? JSON.parse(saved) : null;
  });

  // 2. Load Ngôn ngữ (Ưu tiên: User setting > LocalStorage > Mặc định 'vi')
  const [language, setLanguage] = useState(() => {
    if (user && user.language) return user.language;
    const savedLang = localStorage.getItem('appLang');
    return savedLang || 'vi';
  });

  // 3. Sync: Nếu User thay đổi (lúc login), cập nhật language theo user
  useEffect(() => {
    if (user && user.language) {
      setLanguage(user.language);
    }
  }, [user]);

  // 4. Hàm cập nhật thông tin (Dùng cho Profile)
  const updateUserInfo = (newInfo) => {
    const updatedUser = { ...user, ...newInfo };
    
    setUser(updatedUser);
    localStorage.setItem('session', JSON.stringify(updatedUser));

    // QUAN TRỌNG: Cập nhật ngôn ngữ toàn App ngay lập tức
    if (newInfo.language) {
      setLanguage(newInfo.language);
      localStorage.setItem('appLang', newInfo.language); 
    }
  };

  // 5. Chọn bộ từ điển
  const t = translations[language] || translations.vi;

  return (
    <AppContext.Provider value={{ user, setUser, language, setLanguage, updateUserInfo, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);