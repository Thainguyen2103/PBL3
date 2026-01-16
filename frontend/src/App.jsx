import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import KanjiDetailPage from './pages/KanjiDetailPage'; 
// 1. Import trang Profile mới
import UserProfilePage from './pages/UserProfilePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/kanji/:character" element={<KanjiDetailPage />} />
      
      {/* 2. Thêm Route Profile */}
      <Route path="/profile" element={<UserProfilePage />} />
    </Routes>
  );
}

export default App;