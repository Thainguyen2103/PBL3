import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../supabaseClient'; 
import { translations } from '../utils/translations'; 

// --- 1. CẤU HÌNH ---
const LANGUAGES = [
    { code: 'vi', label: 'VN', full: 'Tiếng Việt' },
    { code: 'en', label: 'US', full: 'English' },
    { code: 'jp', label: 'JP', full: '日本語' },
    { code: 'cn', label: 'CN', full: '中文' },
    { code: 'kr', label: 'KR', full: '한국어' }
];

const AVATAR_LIST = [
  'Felix', 'Aneka', 'Zoe', 'Midnight', 'Bear', 'Cat', 'Dog', 'Tiger', 'Panda', 'Lion', 'Rabbit', 'Sensei', 'Geisha', 'Ninja'
];

// --- 2. TOAST ---
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

// --- 3. MODAL ĐĂNG XUẤT ---
const LogoutModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                🚪
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Đăng xuất?</h3>
            <p className="text-gray-500 text-sm font-medium mb-8">Bạn có chắc chắn muốn thoát khỏi tài khoản không?</p>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all">
                    Hủy
                </button>
                <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-all">
                    Đăng xuất
                </button>
            </div>
        </div>
    </div>
);

// --- 4. MODAL AVATAR ---
const AvatarSelector = ({ currentAvatar, onSelect, onClose }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-[2rem] p-8 max-w-xl w-full shadow-2xl animate-scale-up border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Chọn Linh Vật</h3>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 font-bold transition-all">✕</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 max-h-[50vh] overflow-y-auto p-2">
                {AVATAR_LIST.map((seed) => {
                    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                    const isSelected = currentAvatar === avatarUrl;
                    return (
                        <button key={seed} type="button" onClick={() => onSelect(avatarUrl)} className={`aspect-square rounded-2xl overflow-hidden transition-all duration-300 group relative ${isSelected ? 'ring-4 ring-black scale-95' : 'hover:scale-105 hover:shadow-lg'}`}>
                            <img src={avatarUrl} alt={seed} className="w-full h-full object-cover bg-gray-50" />
                            {isSelected && <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><span className="text-2xl">✓</span></div>}
                        </button>
                    )
                })}
            </div>
        </div>
    </div>
);

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, updateUserInfo, setUser, language, setLanguage } = useAppContext();
  
  const t = translations[language] || translations.vi;

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', birthdate: '', address: '', country: 'Vietnam',
    currentPassword: '', newPassword: '', confirmPassword: '', 
    avatar: '', bio: '', level: 'N5'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        birthdate: user.birthdate || '',
        address: user.address || '',
        country: user.country || 'Vietnam',
        bio: user.bio || '',
        level: user.level || 'N5',
        avatar: user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=Sensei`
      }));
    }
  }, [user]); 

  const showToast = (message, type = 'success') => {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('appLang', langCode);
  };

  // --- 🔥 HÀM SAVE ĐÃ VÁ LỖI BẢO MẬT ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Kiểm tra xác nhận mật khẩu mới
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        showToast("Mật khẩu xác nhận không khớp", 'error');
        setIsLoading(false);
        return;
    }

    try {
      // 2. 🔥 KIỂM TRA MẬT KHẨU HIỆN TẠI (NẾU CÓ ĐỔI PASS)
      if (formData.newPassword) {
          if (!formData.currentPassword) {
              showToast("Vui lòng nhập mật khẩu hiện tại!", 'error');
              setIsLoading(false);
              return;
          }

          // Lấy mật khẩu gốc từ Database để so sánh
          const { data: dbUser, error: fetchError } = await supabase
              .from('users')
              .select('password')
              .eq('email', user.email)
              .single();

          if (fetchError || !dbUser) throw new Error("Lỗi xác thực người dùng");

          // So sánh mật khẩu nhập vào vs mật khẩu trong DB
          if (dbUser.password !== formData.currentPassword) {
              showToast("Mật khẩu hiện tại không đúng!", 'error');
              setIsLoading(false);
              return; // ⛔ CHẶN LẠI NGAY LẬP TỨC
          }
      }

      // 3. Nếu mọi thứ OK thì mới cho Update
      const updates = {
        full_name: formData.fullName,
        phone: formData.phone,
        birthdate: formData.birthdate || null,
        address: formData.address,
        country: formData.country,
        bio: formData.bio,
        level: formData.level,
        avatar: formData.avatar,
        ...(formData.newPassword && { password: formData.newPassword }) // Chỉ update pass nếu có nhập mới
      };

      const { data, error } = await supabase.from('users').update(updates).eq('email', user.email).select();

      if (error) throw error;

      if (data.length > 0) {
        const newUserData = { ...user, ...updates };
        updateUserInfo(newUserData); 
        localStorage.setItem('session', JSON.stringify(newUserData));
        
        // Reset ô mật khẩu sau khi lưu thành công
        setFormData(prev => ({...prev, currentPassword: '', newPassword: '', confirmPassword: ''}));
        showToast(t.alert_save_success, 'success');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmLogout = () => {
      localStorage.removeItem('session');
      setUser(null);
      navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 flex flex-col md:flex-row">
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({...toast, show: false})} />
      
      {showAvatarModal && (
          <AvatarSelector 
            currentAvatar={formData.avatar} 
            onSelect={(url) => { setFormData({...formData, avatar: url}); setShowAvatarModal(false); }} 
            onClose={() => setShowAvatarModal(false)} 
          />
      )}
      
      {showLogoutModal && (
          <LogoutModal onConfirm={confirmLogout} onCancel={() => setShowLogoutModal(false)} />
      )}

      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-100 fixed h-full z-20 hidden md:flex flex-col">
         <div className="p-8 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
             <div className="bg-black text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">漢</div>
             <h1 className="font-black text-xl tracking-tighter uppercase">Kanji App</h1>
         </div>
         <nav className="flex-1 px-4 space-y-2 mt-4">
             <button onClick={() => navigate('/home')} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all group">
                <span className="text-xl group-hover:scale-110 transition-transform">🏠</span> {t.back}
             </button>
             <button className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl bg-black text-white font-bold shadow-xl shadow-gray-200">
                <span className="text-xl">👤</span> {t.profile_title}
             </button>
         </nav>
         <div className="p-6">
             <button onClick={() => setShowLogoutModal(true)} className="w-full py-4 text-red-500 font-bold bg-red-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all text-xs uppercase tracking-widest">
                 {t.logout}
             </button>
         </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-72 p-6 md:p-12 lg:p-16">
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10 mb-12">
                <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                    <div className="w-40 h-40 rounded-[2.5rem] bg-gray-50 overflow-hidden shadow-2xl border-[6px] border-white ring-1 ring-gray-100">
                        <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-black text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                        <span className="text-sm">✎</span>
                    </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-5">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">{formData.fullName || 'NO NAME'}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                            <span className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest">{formData.level} MEMBER</span>
                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">{user?.email}</span>
                        </div>
                    </div>
                    <div className="inline-flex items-center p-1.5 bg-white rounded-full shadow-lg border border-gray-100">
                        {LANGUAGES.map((lang) => {
                            const isActive = language === lang.code;
                            return (
                                <button key={lang.code} type="button" onClick={() => handleLanguageChange(lang.code)} className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black transition-all duration-300 ${isActive ? 'bg-black text-white shadow-xl scale-105' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}>
                                    <span className={isActive ? '' : 'opacity-80'}>{lang.code.toUpperCase()}</span>
                                    {isActive && <span className="opacity-70 font-medium hidden lg:inline">{lang.label}</span>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                    <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-2">{t.profile_basic}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.label_name}</label>
                                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.label_email}</label>
                                <div className="relative">
                                    <input type="text" value={formData.email} disabled className="w-full bg-gray-50 border-2 border-transparent rounded-2xl px-5 py-4 font-bold text-gray-400 cursor-not-allowed" />
                                    <span className="absolute right-5 top-4 text-lg opacity-30">🔒</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.label_phone}</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.label_dob}</label>
                                <input type="date" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.label_address}</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                    <div>
                         <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6 border-b pb-2">MỤC TIÊU HỌC TẬP</h3>
                        <div className="space-y-6">
                            <div className="flex gap-3">
                                {['N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
                                    <button key={lvl} type="button" onClick={() => setFormData({...formData, level: lvl})} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border-2 ${formData.level === lvl ? 'bg-black text-white border-black shadow-lg transform -translate-y-1' : 'bg-white text-gray-300 border-gray-100 hover:border-gray-300 hover:text-gray-500'}`}>
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">BIO (GIỚI THIỆU)</label>
                                <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg rounded-2xl px-5 py-4 font-medium text-gray-800 outline-none transition-all h-32 resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-10">
                    <div>
                        <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-6 border-b border-red-100 pb-2">{t.security}</h3>
                        <div className="space-y-4">
                            <input type="password" value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})} placeholder={t.labelCurrentPass} className="w-full bg-white border-2 border-gray-100 focus:border-red-500 focus:bg-red-50 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all placeholder-gray-300 text-sm" />
                            <input type="password" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} placeholder={t.labelNewPass} className="w-full bg-white border-2 border-gray-100 focus:border-red-500 focus:bg-red-50 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all placeholder-gray-300 text-sm" />
                            <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} placeholder={t.labelConfirmPass} className="w-full bg-white border-2 border-gray-100 focus:border-red-500 focus:bg-red-50 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none transition-all placeholder-gray-300 text-sm" />
                        </div>
                    </div>
                    <div className="sticky top-10">
                        <button type="submit" disabled={isLoading} className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-gray-200 hover:bg-gray-900 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3">
                            {isLoading ? 'Saving...' : t.btn_save}
                        </button>
                        <button type="button" onClick={() => window.location.reload()} className="w-full mt-4 text-gray-400 font-bold hover:text-gray-600 py-2 transition-all text-sm">
                            {t.btn_cancel}
                        </button>
                    </div>
                </div>
            </form>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;