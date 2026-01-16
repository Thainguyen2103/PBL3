import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 1. Import Context để lấy dữ liệu toàn cục
import { useAppContext } from '../context/AppContext';

const UserProfilePage = () => {
  const navigate = useNavigate();
  
  // 2. Lấy user, hàm cập nhật và bộ từ điển (t) từ Context
  // (Không khai báo biến translations ở đây nữa vì đã có trong AppContext)
  const { user, updateUserInfo, t } = useAppContext();

  // State local để quản lý form nhập liệu
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    language: "vi", 
    address: "",
    level: "N5",
    exp: 0,
    maxExp: 500,
    username: "",
    joinDate: ""
  });

  // 3. Khi mở trang, điền dữ liệu từ Global State vào Form
  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, ...user }));
    }
  }, [user]);

  const handleChangeInfo = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // 4. GỌI HÀM CẬP NHẬT TOÀN APP
    // Khi chạy hàm này, Context sẽ lưu ngôn ngữ mới và đổi toàn bộ giao diện App
    updateUserInfo(formData);
    alert(t.alert_save_success);
  };

  const handleLogout = () => {
    if (window.confirm(t.alert_logout)) {
      localStorage.removeItem('session');
      navigate('/auth');
      // Reload để reset lại trạng thái của AppContext
      window.location.reload(); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900 p-4 md:p-8 flex justify-center items-center">
      
      <div className="max-w-6xl w-full bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[700px]">
        
        {/* --- CỘT TRÁI (SIDEBAR) --- */}
        <div className="w-full md:w-1/3 bg-slate-900 text-white p-8 flex flex-col items-center relative overflow-hidden">
             {/* Background trang trí */}
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-blue-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
             </div>

             <button onClick={() => navigate('/home')} className="self-start mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider">
                ← {t.back}
             </button>

             <div className="relative z-10 flex flex-col items-center text-center w-full">
                <div className="w-36 h-36 rounded-full bg-yellow-400 border-4 border-slate-700 shadow-2xl flex items-center justify-center text-6xl mb-4 relative group cursor-pointer">
                    🦊
                    <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold text-white text-center px-2">
                        {t.changePhoto}
                    </div>
                </div>
                
                <h2 className="text-2xl font-black tracking-wide">{formData.fullName}</h2>
                <p className="text-slate-400 text-sm font-medium mb-6">{formData.email}</p>

                {/* Level Bar */}
                <div className="w-full bg-slate-800 rounded-xl p-4 border border-slate-700 mb-6">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                        <span>{formData.level}</span>
                        <span>{formData.exp}/{formData.maxExp} XP</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${(formData.exp / formData.maxExp) * 100}%` }}></div>
                    </div>
                </div>

                <div className="w-full flex flex-col gap-2 mt-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg text-sm font-bold text-slate-300">
                        <span>📅</span> {t.joinDate}: {formData.joinDate}
                    </div>
                    <button onClick={handleLogout} className="mt-8 py-3 w-full border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all text-sm uppercase tracking-widest">
                        {t.logout}
                    </button>
                </div>
             </div>
        </div>

        {/* --- CỘT PHẢI (FORM NHẬP LIỆU) --- */}
        <div className="w-full md:w-2/3 p-8 md:p-12 bg-white overflow-y-auto max-h-screen">
            <h1 className="text-3xl font-black text-slate-800 mb-1" style={{ fontFamily: "'Yuji Syuku', serif" }}>{t.profile_title}</h1>
            <p className="text-slate-500 text-sm mb-8">{t.profile_sub}</p>

            <div className="mb-10">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">{t.profile_basic}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">{t.label_name}</label>
                        <input type="text" name="fullName" value={formData.fullName || ""} onChange={handleChangeInfo} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-700"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">{t.label_email}</label>
                        <input type="email" name="email" value={formData.email || ""} onChange={handleChangeInfo} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-700"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">{t.label_phone}</label>
                        <input type="tel" name="phone" value={formData.phone || ""} onChange={handleChangeInfo} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-700"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">{t.label_address}</label>
                        <input type="text" name="address" value={formData.address || ""} onChange={handleChangeInfo} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-700"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">{t.label_country}</label>
                        <select name="country" value={formData.country || "Vietnam"} onChange={handleChangeInfo} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-700 appearance-none cursor-pointer">
                            <option value="Vietnam">Vietnam 🇻🇳</option>
                            <option value="Japan">Japan 🇯🇵</option>
                            <option value="China">China 🇨🇳</option>
                            <option value="Korea">Korea 🇰🇷</option>
                            <option value="USA">United States 🇺🇸</option>
                            <option value="UK">United Kingdom 🇬🇧</option>
                        </select>
                    </div>

                    {/* --- QUAN TRỌNG: Ô CHỌN NGÔN NGỮ KẾT NỐI GLOBAL STATE --- */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase text-blue-600">{t.label_lang}</label>
                        <select name="language" value={formData.language || "vi"} onChange={handleChangeInfo} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-700 appearance-none cursor-pointer">
                            <option value="vi">Tiếng Việt 🇻🇳</option>
                            <option value="en">English (US) 🇺🇸</option>
                            <option value="jp">日本語 (Japanese) 🇯🇵</option>
                            <option value="cn">中文 (Chinese) 🇨🇳</option>
                            <option value="kr">한국어 (Korean) 🇰🇷</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">{t.security}</h3>
                
                <div className="grid grid-cols-1 gap-4 max-w-lg">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">{t.labelCurrentPass}</label>
                        <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 uppercase">{t.labelNewPass}</label>
                            <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-700 uppercase">{t.labelConfirmPass}</label>
                            <input type="password" placeholder="••••••••" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all" />
                        </div>
                    </div>
                </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center gap-4 border-t border-gray-100 pt-8">
                <button 
                    onClick={handleSave}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                    {t.btn_save}
                </button>
                <button 
                    onClick={() => navigate('/home')}
                    className="px-6 py-3 bg-white text-slate-500 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                >
                    {t.btn_cancel}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;