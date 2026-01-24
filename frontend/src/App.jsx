import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- IMPORT COMPONENT BẢO VỆ & QUẢN LÝ ---
import AuthGuard from './components/AuthGuard';
import NotificationManager from './components/NotificationManager'; // ✅ MỚI: Phải import cái này vào
import VerifyEmailPage from './pages/VerifyEmailPage'; // Nhớ import
import ForgotPasswordPage from './pages/ForgotPasswordPage'; // Nhớ import
import DeleteAccountPage from './pages/DeleteAccountPage'; // Nhớ import
// --- IMPORT CÁC TRANG (PAGES) ---
import HomePage from './pages/HomePage';
import WritePage from './pages/WritePage';       // Trang Tra cứu viết tay
import AiChatPage from './pages/AiChatPage';     // Trang Chatbot AI
import LoginPage from './pages/LoginPage';       // Trang Đăng nhập cũ
import AuthPage from './pages/AuthPage';         // Trang Đăng nhập/Đăng ký chính
import UserProfilePage from './pages/UserProfilePage'; // Trang Hồ sơ cá nhân
import FlashcardPage from './pages/FlashcardPage'; // Trang Luyện tập Flashcard
import KanjiGraphPage from './pages/KanjiGraphPage'; // Trang Sơ đồ mạng lưới
import DictionaryPage from './pages/DictionaryPage'; // Trang Từ điển 512 từ
import KanjiDetailPage from './pages/KanjiDetailPage'; // Trang Chi tiết Kanji
import TranslatorPage from './pages/TranslatorPage'; // Trang Dịch thuật
import WorldPage from './pages/WorldPage';       // Trang Thế giới
import ForumPage from './pages/ForumPage';       // Trang Diễn đàn

function App() {
  return (
    <div className="App min-h-screen bg-[#fdfbf7]">
      
      {/* ✅ Đặt component thông báo ở đây để nó chạy ngầm toàn app */}
      <NotificationManager />

      <Routes>
        {/* --- PUBLIC ROUTES (Ai cũng vào được) --- */}
        {/* Trang đăng nhập/đăng ký là cửa ngõ */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
        {/* Redirect trang login cũ sang auth cho đồng bộ */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />


        {/* --- PROTECTED ROUTES (Phải đăng nhập mới vào được) --- */}
        {/* Tất cả các trang bên dưới đều được bọc bởi AuthGuard */}
        
        <Route path="/" element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        } />

        <Route path="/viet-tay" element={
          <AuthGuard>
            <WritePage />
          </AuthGuard>
        } />

        <Route path="/chat" element={
          <AuthGuard>
            <AiChatPage />
          </AuthGuard>
        } />

        <Route path="/flashcards" element={
          <AuthGuard>
            <FlashcardPage />
          </AuthGuard>
        } />

        <Route path="/dictionary" element={
          <AuthGuard>
            <DictionaryPage />
          </AuthGuard>
        } />

        <Route path="/translator" element={
          <AuthGuard>
            <TranslatorPage />
          </AuthGuard>
        } />

        <Route path="/world" element={
          <AuthGuard>
            <WorldPage />
          </AuthGuard>
        } />

        <Route path="/forum" element={
          <AuthGuard>
            <ForumPage />
          </AuthGuard>
        } />

        <Route path="/profile" element={
          <AuthGuard>
            <UserProfilePage />
          </AuthGuard>
        } />

        {/* --- CÁC TRANG CHI TIẾT (DYNAMIC ROUTES - Cũng cần bảo vệ) --- */}
        
        <Route path="/kanji/:kanji" element={
          <AuthGuard>
            <KanjiDetailPage />
          </AuthGuard>
        } />
        
        <Route path="/kanji-graph/:kanji" element={
          <AuthGuard>
            <KanjiGraphPage />
          </AuthGuard>
        } />

        {/* --- REDIRECTS (Điều hướng mặc định) --- */}
        <Route path="/home" element={<Navigate to="/" replace />} />
        
        {/* Bất kỳ link lạ nào cũng đá về trang chủ (để AuthGuard xử lý tiếp) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;