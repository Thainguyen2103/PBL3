import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient'; 
import { translations } from '../utils/translations'; 
import emailjs from '@emailjs/browser'; 

// 🔥 CẤU HÌNH EMAILJS (GIỮ NGUYÊN KEY CỦA BẠN)
const EMAIL_SERVICE_ID = import.meta.env.VITE_DELETE_SERVICE_ID; 
const EMAIL_TEMPLATE_DELETE_ID = import.meta.env.VITE_TEMPLATE_DELETE;
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_DELETE_PUBLIC_KEY;

// --- 1. CẤU HÌNH ---
const LANGUAGES = [
    { code: 'vi', label: 'VN', full: 'Tiếng Việt' },
    { code: 'en', label: 'US', full: 'English' },
    { code: 'jp', label: 'JP', full: '日本語' },
    { code: 'cn', label: 'CN', full: '中文' },
    { code: 'kr', label: 'KR', full: '한국어' }
];

const COUNTRIES = [
    { code: 'VN', label: 'Việt Nam' }, { code: 'JP', label: '日本' }, 
    { code: 'KR', label: '한국' }, { code: 'CN', label: '中国' }, 
    { code: 'US', label: 'USA' }, { code: 'GB', label: 'UK' }, 
    { code: 'FR', label: 'France' }, { code: 'DE', label: 'Deutschland' },
    { code: 'RU', label: 'Россия' }, { code: 'TH', label: 'ประเทศไทย' }, 
    { code: 'OT', label: 'Other' }
];

const AVATAR_LIST = [
  'Felix', 'Aneka', 'Zoe', 'Midnight', 'Bear', 'Cat', 'Dog', 'Tiger', 'Panda', 'Lion', 'Rabbit', 'Sensei', 'Geisha', 'Ninja'
];

// --- 2. COMPONENT CẮT ẢNH ---
const ImageCropperModal = ({ imageSrc, onCancel, onSave, t }) => {
    const CROP_SIZE = 280; 
    const imgRef = useRef(null);
    const canvasRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

    const onImageLoad = (e) => {
        const naturalWidth = e.target.naturalWidth;
        const naturalHeight = e.target.naturalHeight;
        setImgSize({ w: naturalWidth, h: naturalHeight });
        const minScale = CROP_SIZE / Math.min(naturalWidth, naturalHeight);
        setScale(minScale);
        setPosition({ x: (CROP_SIZE - naturalWidth * minScale) / 2, y: (CROP_SIZE - naturalHeight * minScale) / 2 });
    };

    const getBoundedPosition = (x, y, currentScale) => {
        const currentW = imgSize.w * currentScale;
        const currentH = imgSize.h * currentScale;
        let newX = x; let newY = y;
        if (currentW > CROP_SIZE) {
            if (newX > 0) newX = 0;
            if (newX + currentW < CROP_SIZE) newX = CROP_SIZE - currentW;
        } else { newX = (CROP_SIZE - currentW) / 2; }
        if (currentH > CROP_SIZE) {
            if (newY > 0) newY = 0;
            if (newY + currentH < CROP_SIZE) newY = CROP_SIZE - currentH;
        } else { newY = (CROP_SIZE - currentH) / 2; }
        return { x: newX, y: newY };
    };

    const handleMouseDown = (e) => { setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition(getBoundedPosition(e.clientX - dragStart.x, e.clientY - dragStart.y, scale));
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleZoomChange = (e) => { const newScale = parseFloat(e.target.value); setScale(newScale); setPosition(prev => getBoundedPosition(prev.x, prev.y, newScale)); };
    const handleCrop = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;
        const outputSize = 512; 
        canvas.width = outputSize; canvas.height = outputSize;
        const ratio = outputSize / CROP_SIZE;
        ctx.clearRect(0, 0, outputSize, outputSize);
        ctx.drawImage(img, position.x * ratio, position.y * ratio, imgSize.w * scale * ratio, imgSize.h * scale * ratio);
        onSave(canvas.toDataURL('image/jpeg', 0.95));
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl overflow-hidden flex flex-col items-center">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6">{t?.crop_title || "Chỉnh sửa ảnh"}</h3>
                <div className="relative bg-slate-100 rounded-full overflow-hidden cursor-move shadow-inner border-4 border-slate-200" style={{ width: CROP_SIZE, height: CROP_SIZE }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}>
                    <img ref={imgRef} src={imageSrc} alt="Preview" onLoad={onImageLoad} draggable={false} className="max-w-none absolute select-none" style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: imgSize.w * scale, height: imgSize.h * scale, transition: isDragging ? 'none' : 'width 0.1s, height 0.1s, transform 0.1s' }} />
                </div>
                <div className="w-full mt-8 px-4">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase mb-2"><span>Min</span><span>Max</span></div>
                    {imgSize.w > 0 && <input type="range" min={Math.min(CROP_SIZE / imgSize.w, CROP_SIZE / imgSize.h)} max={Math.max(CROP_SIZE / imgSize.w, CROP_SIZE / imgSize.h) * 3} step="0.01" value={scale} onChange={handleZoomChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" />}
                </div>
                <div className="flex gap-4 w-full mt-8">
                    <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">{t?.btn_cancel || "Hủy"}</button>
                    <button onClick={handleCrop} className="flex-1 py-3 rounded-xl font-bold bg-black text-white hover:bg-gray-800 shadow-lg transition-transform hover:scale-105">{t?.btn_confirm || "Xong"}</button>
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
        </div>
    );
};

// --- 3. TOAST & MODALS ---
const Toast = ({ message, type, show, onClose }) => {
    if (!show) return null;
    const isSuccess = type === 'success';
    return (
        <div className={`fixed top-6 right-6 z-[120] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-fade-in-down transition-all backdrop-blur-md ${isSuccess ? 'bg-black text-white' : 'bg-red-600 text-white'}`}>
            <span className="text-xl font-bold">{isSuccess ? '✓' : '!'}</span>
            <p className="text-sm font-bold tracking-wide">{message}</p>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 font-bold px-2">✕</button>
        </div>
    );
};

const AvatarSelector = ({ currentAvatar, onSelect, onClose, onUploadStart, t }) => {
    const fileInputRef = useRef(null);
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 5MB."); return; }
            const reader = new FileReader();
            reader.onloadend = () => { onUploadStart(reader.result); };
            reader.readAsDataURL(file);
        }
    };
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-2xl animate-scale-up border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{t?.modal_avatar_title || "Avatar"}</h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 font-bold transition-all">✕</button>
                </div>
                <div className="mb-6">
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current.click()} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-gray-50 transition-all group cursor-pointer">
                        <span className="text-3xl group-hover:scale-110 transition-transform">📤</span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-black">{t?.upload_photo || "Tải ảnh từ máy tính"}</span>
                    </button>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t?.choose_default || "Hoặc chọn mẫu có sẵn"}</div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 max-h-[40vh] overflow-y-auto p-2 custom-scrollbar">
                    {AVATAR_LIST.map((seed) => {
                        const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                        const isSelected = currentAvatar === avatarUrl;
                        return (
                            <button key={seed} type="button" onClick={() => { onSelect(avatarUrl); onClose(); }} className={`aspect-square rounded-2xl overflow-hidden transition-all duration-300 group relative ${isSelected ? 'ring-4 ring-black scale-95' : 'hover:scale-105 hover:shadow-lg'}`}>
                                <img src={avatarUrl} alt={seed} className="w-full h-full object-cover bg-gray-50" />
                                {isSelected && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><span className="text-2xl">✓</span></div>}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT CHÍNH ---
const UserProfilePage = () => { 
  const navigate = useNavigate();
  const { user, updateUserInfo, setUser, language, setLanguage } = useAppContext();
  // 🔥 Lấy ngôn ngữ hiện tại từ Context hoặc mặc định là 'vi'
  const t = translations[language] || translations.vi;

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', birthdate: '', address: '', country: 'VN',
    currentPassword: '', newPassword: '', confirmPassword: '', 
    avatar: '', bio: '', level: 'N5', gender: 'other' 
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // State xóa tài khoản
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        birthdate: user.birthdate || '',
        address: user.address || '',
        country: user.country || 'VN',
        bio: user.bio || '',
        level: user.level || 'N5',
        gender: user.gender || 'other', 
        avatar: user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=Sensei`
      }));
    }
  }, [user]); 

  // Logic đếm ngược xóa tài khoản
  useEffect(() => {
    let timer;
    if (showDeleteModal && deleteCountdown > 0) {
      timer = setTimeout(() => setDeleteCountdown(deleteCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [showDeleteModal, deleteCountdown]);

  // Xử lý xóa tài khoản
  const handleRequestDelete = async () => {
    setIsDeleting(true);
    try {
      const deleteToken = "DEL_" + Math.random().toString(36).substring(2) + Date.now();
      
      const { error } = await supabase.from('users').update({ delete_token: deleteToken }).eq('id', user.id);
      if (error) throw error;

      const deleteLink = `${window.location.origin}/delete-account?token=${deleteToken}`;
      await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_DELETE_ID, {
        to_name: user.full_name || "User",
        to_email: user.email,
        delete_link: deleteLink
      }, EMAIL_PUBLIC_KEY);

      setShowDeleteModal(false);
      showToast(t?.delete_email_sent || "Đã gửi email xác nhận! Hãy kiểm tra hộp thư của bạn.", "success");

    } catch (err) {
      console.error(err);
      showToast("Lỗi: " + (err.message || err.text), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('appLang', langCode);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        showToast(t?.err_pass_match || "Mật khẩu không khớp", 'error');
        setIsLoading(false);
        return;
    }

    try {
      if (formData.newPassword) {
          if (!formData.currentPassword) {
              showToast(t?.err_pass_empty || "Vui lòng nhập mật khẩu hiện tại", 'error');
              setIsLoading(false); return;
          }
          const { data: dbUser, error: fetchError } = await supabase.from('users').select('password').eq('email', user.email).single();
          if (fetchError || !dbUser) throw new Error("Lỗi xác thực người dùng");
          if (dbUser.password !== formData.currentPassword) {
              showToast(t?.err_pass_wrong || "Mật khẩu hiện tại không đúng", 'error');
              setIsLoading(false); return;
          }
      }

      const updates = {
        full_name: formData.fullName, phone: formData.phone, birthdate: formData.birthdate || null,
        address: formData.address, country: formData.country, bio: formData.bio,
        level: formData.level, gender: formData.gender, avatar: formData.avatar,
        ...(formData.newPassword && { password: formData.newPassword })
      };

      const { data, error } = await supabase.from('users').update(updates).eq('email', user.email).select();
      if (error) throw error;

      if (data.length > 0) {
        const newUserData = { ...user, ...updates };
        updateUserInfo(newUserData); 
        localStorage.setItem('session', JSON.stringify(newUserData));
        setFormData(prev => ({...prev, currentPassword: '', newPassword: '', confirmPassword: ''}));
        showToast(t?.alert_save_success || "Cập nhật thành công!", 'success');
      }
    } catch (error) { showToast(error.message, 'error'); } finally { setIsLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem('session'); setUser(null); navigate('/auth'); };

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 flex flex-col md:flex-row">
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      
      {showAvatarModal && <AvatarSelector currentAvatar={formData.avatar} onSelect={(url) => { setFormData(prev => ({ ...prev, avatar: url })); setShowAvatarModal(false); }} onUploadStart={(rawImage) => { setShowAvatarModal(false); setImageToCrop(rawImage); }} onClose={() => setShowAvatarModal(false)} t={t} />}
      {imageToCrop && <ImageCropperModal imageSrc={imageToCrop} t={t} onCancel={() => setImageToCrop(null)} onSave={(croppedImage) => { setFormData(prev => ({ ...prev, avatar: croppedImage })); setImageToCrop(null); }} />}
      
      <aside className="w-full md:w-72 bg-white border-r border-gray-100 fixed h-full z-20 hidden md:flex flex-col">
          <div className="p-8 flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="bg-black text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg transition-transform group-hover:scale-105" style={{ fontFamily: "'Yuji Syuku', serif" }}>漢</div>
              <h1 className="font-black text-3xl tracking-tighter text-slate-900 mt-1" style={{ fontFamily: "'Yuji Syuku', serif" }}>KAN</h1>
          </div>
          <nav className="flex-1 px-4 space-y-2 mt-4">
              <button onClick={() => navigate('/')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all group">
                 <span className="text-xl group-hover:scale-110 transition-transform">🏠</span> {t?.back || "Quay lại"}
              </button>
              <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl bg-black text-white font-bold shadow-xl shadow-gray-200">
                 <span className="text-xl">👤</span> {t?.profile_title || "Hồ sơ"}
              </button>
          </nav>
          <div className="p-6">
              <button onClick={handleLogout} className="w-full py-4 text-red-500 font-bold bg-red-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all text-xs uppercase tracking-widest">{t?.menu_logout || "Đăng xuất"}</button>
          </div>
      </aside>

      <main className="flex-1 md:ml-72 p-6 md:p-12 lg:p-16">
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12">
                <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                    <div className="w-40 h-40 rounded-[2.5rem] bg-gray-50 overflow-hidden shadow-2xl border-[6px] border-white ring-1 ring-gray-100 relative">
                        <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-bold text-xs uppercase tracking-widest">{t?.btn_change_photo || "Đổi ảnh"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-5">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">{formData.fullName || 'NO NAME'}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                            <span className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">{formData.level} {t?.member || "THÀNH VIÊN"}</span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">{user?.email}</span>
                        </div>
                    </div>
                    <div className="inline-flex items-center p-1.5 bg-white rounded-full shadow-lg border border-gray-100">
                        {LANGUAGES.map((lang) => {
                            const isActive = language === lang.code;
                            return <button key={lang.code} type="button" onClick={() => handleLanguageChange(lang.code)} className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all duration-300 ${isActive ? 'bg-black text-white shadow-xl scale-105' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}><span className={isActive ? '' : 'opacity-80'}>{lang.code.toUpperCase()}</span>{isActive && <span className="opacity-70 font-medium hidden lg:inline">{lang.label}</span>}</button>
                        })}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-2">{t?.profile_basic || "THÔNG TIN CƠ BẢN"}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_name || "HỌ TÊN"}</label>
                                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_email || "EMAIL"}</label>
                                <div className="relative">
                                    <input type="text" value={formData.email} disabled className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold text-gray-400 cursor-not-allowed" />
                                    <span className="absolute right-5 top-4 text-lg opacity-30">🔒</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_phone || "SỐ ĐIỆN THOẠI"}</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_dob || "NGÀY SINH"}</label>
                                <input type="date" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_gender || "GIỚI TÍNH"}</label>
                                <div className="flex gap-4">
                                    {[
                                        { val: 'male', label: '男', sub: t?.gender_male || 'Nam', color: 'hover:border-blue-200 hover:text-blue-600' },
                                        { val: 'female', label: '女', sub: t?.gender_female || 'Nữ', color: 'hover:border-pink-200 hover:text-pink-600' },
                                        { val: 'other', label: '他', sub: t?.gender_other || 'Khác', color: 'hover:border-purple-200 hover:text-purple-600' }
                                    ].map((g) => (
                                        <button key={g.val} type="button" onClick={() => setFormData({...formData, gender: g.val})} className={`flex-1 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 group ${formData.gender === g.val ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' : `bg-white border-gray-100 text-gray-400 ${g.color}`}`}>
                                            <span className={`text-2xl font-kai font-normal ${formData.gender === g.val ? 'text-white' : 'text-slate-700 group-hover:text-current'}`}>{g.label}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{g.sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_country || "QUỐC GIA"}</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {COUNTRIES.map((c) => (
                                        <button key={c.code} type="button" onClick={() => setFormData({...formData, country: c.code})} className={`py-2 px-1 rounded-xl border-2 text-xs font-bold transition-all ${formData.country === c.code ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-black'}`}>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_address || "ĐỊA CHỈ"}</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                    <div>
                         <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-2">{t?.profile_goal || "MỤC TIÊU"}</h3>
                        <div className="space-y-6">
                            <div className="flex gap-3">
                                {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                                    <button key={lvl} type="button" onClick={() => setFormData({...formData, level: lvl})} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 ${formData.level === lvl ? 'bg-black text-white border-black shadow-lg transform -translate-y-1' : 'bg-white text-gray-300 border-gray-100 hover:border-gray-300 hover:text-gray-500'}`}>{lvl}</button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t?.label_bio || "GIỚI THIỆU"}</label>
                                <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-medium text-gray-800 outline-none transition-all h-32 resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* CỘT PHẢI (BẢO MẬT & NÚT LƯU) */}
                <div className="space-y-10">
                    <div>
                        <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 border-b border-red-100 pb-2">{t?.profile_security || "BẢO MẬT"}</h3>
                        <div className="space-y-4">
                            <input type="password" value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})} placeholder={t?.label_current_pass || "Mật khẩu hiện tại"} className="w-full bg-white border-2 border-gray-100 focus:border-red-500 focus:bg-red-50 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all placeholder-gray-300 text-sm" />
                            <input type="password" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} placeholder={t?.label_new_pass || "Mật khẩu mới"} className="w-full bg-white border-2 border-gray-100 focus:border-red-500 focus:bg-red-50 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all placeholder-gray-300 text-sm" />
                            <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} placeholder={t?.label_confirm_pass || "Xác nhận mật khẩu"} className="w-full bg-white border-2 border-gray-100 focus:border-red-500 focus:bg-red-50 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all placeholder-gray-300 text-sm" />
                        </div>
                    </div>
                    {/* NÚT LƯU STICKY */}
                    <div className="sticky top-10">
                        <button type="submit" disabled={isLoading} className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-gray-200 hover:bg-gray-900 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3">{isLoading ? (t?.loading || "Đang xử lý...") : (t?.btn_save || "Lưu thay đổi")}</button>
                        <button type="button" onClick={() => window.location.reload()} className="w-full mt-4 text-gray-400 font-bold hover:text-gray-600 py-2 transition-all text-sm">{t?.btn_cancel || "Hủy bỏ"}</button>
                    </div>
                </div>
            </form>

            {/* VÙNG NGUY HIỂM */}
            <div className="mt-20 pt-10 border-t-2 border-red-100">
                <h3 className="text-xl font-black text-red-600 uppercase mb-6 flex items-center gap-2"><span>☠️</span> {t?.danger_zone || "VÙNG NGUY HIỂM"}</h3>
                <div className="bg-red-50 border border-red-200 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h4 className="font-bold text-gray-900 text-lg mb-1">{t?.delete_account_title || "Xóa vĩnh viễn tài khoản?"}</h4>
                        <p className="text-sm text-red-500 leading-relaxed">
                            {t?.delete_account_desc || "Hành động này sẽ xóa toàn bộ dữ liệu học tập, bạn bè và thành tích của bạn. Bạn sẽ không thể khôi phục lại tài khoản sau khi xóa."}
                        </p>
                    </div>
                    <button type="button" onClick={() => { setShowDeleteModal(true); setDeleteCountdown(5); }} className="px-8 py-4 bg-white border-2 border-red-500 text-red-600 font-black text-sm uppercase rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-md hover:shadow-red-200 whitespace-nowrap">
                        {t?.btn_delete_account || "Xóa Tài Khoản"}
                    </button>
                </div>
            </div>

            {/* MODAL XÁC NHẬN XÓA */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border-t-8 border-red-600 shadow-2xl">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h2 className="text-xl font-black text-gray-800 mb-2">{t?.confirm_delete_title || "BẠN CHẮC CHẮN CHỨ?"}</h2>
                        <p className="text-sm text-gray-500 mb-6">{t?.confirm_delete_sub || "Bạn phải xác nhận qua Email để hoàn tất việc xóa."}</p>
                        <button onClick={handleRequestDelete} disabled={deleteCountdown > 0 || isDeleting} className={`w-full py-4 rounded-xl font-black uppercase text-sm mb-3 transition-all ${deleteCountdown > 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'}`}>
                            {isDeleting ? (t?.sending_mail || "ĐANG GỬI...") : deleteCountdown > 0 ? `${t?.wait || "ĐỢI"} ${deleteCountdown}S...` : (t?.btn_send_confirm_mail || "GỬI MAIL XÁC NHẬN")}
                        </button>
                        <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 font-bold text-xs hover:text-black">{t?.btn_cancel || "HỦY BỎ"}</button>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;