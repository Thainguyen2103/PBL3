import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Profile = () => {
  const navigate = useNavigate();
  // Lấy user và các hàm cập nhật từ Context
  const { user, updateUserInfo, setUser } = useAppContext();
  
  // State quản lý form
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    bio: '',
    level: 'N5',
    streak: 0,
    avatar: '',
    goal: 'Học 5 Kanji mỗi ngày'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Danh sách Avatar mẫu
  const avatarOptions = ['Samurai', 'Neko', 'Shiba', 'Sensei', 'Geisha', 'Ronin'];

  // Đổ dữ liệu từ Context vào Form khi trang vừa load
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || user.fullName || user.username || 'Sensei', 
        email: user.email || 'Chưa cập nhật',
        bio: user.bio || '',
        level: user.level || 'N5',
        streak: user.streak || 0,
        avatar: user.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sensei',
        goal: user.goal || 'Học 5 Kanji mỗi ngày'
      });
    }
  }, [user]);

  // --- HÀM LƯU DỮ LIỆU (CHẾ ĐỘ NGHIÊM NGẶT - SERVER FIRST) ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Lấy Token xác thực
      const session = JSON.parse(localStorage.getItem('session'));
      const token = session?.access_token || session?.token; 

      console.log("🚀 Đang gửi dữ liệu lên Server:", formData);

      // 2. Gửi Request lên Server Online
      const response = await fetch('https://pbl3-sofd.onrender.com/api/update-profile', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }) 
        },
        body: JSON.stringify({
          // Gửi kèm username/email cũ để server định danh
          username: user?.username, 
          email: formData.email,
          
          // Dữ liệu mới
          name: formData.fullName,
          fullName: formData.fullName,
          bio: formData.bio,
          avatar: formData.avatar,
          goal: formData.goal
        }),
      });

      const data = await response.json();
      console.log("📡 Server phản hồi:", data);

      if (response.ok) {
        // --- THÀNH CÔNG: SERVER ĐÃ LƯU ---
        
        // 1. Cập nhật Context (để UI đổi ngay)
        const newUserData = { ...user, ...formData, name: formData.fullName };
        updateUserInfo(newUserData);
        
        // 2. Cập nhật localStorage (để F5 không mất)
        localStorage.setItem('session', JSON.stringify(newUserData));

        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        
        // (Tùy chọn) Báo cho người dùng biết
        // alert("✅ Đã lưu thành công vào Server!");
      } else {
        // --- THẤT BẠI: SERVER TỪ CHỐI ---
        console.error("Lỗi từ Server:", data);
        alert(`❌ Không lưu được: ${data.message || "Lỗi Server không xác định"}`);
      }
    } catch (error) {
      console.error("Lỗi mạng:", error);
      alert("❌ Lỗi kết nối! Vui lòng kiểm tra mạng hoặc Server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if(window.confirm("Bạn chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem('session');
        setUser(null);
        navigate('/auth');
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-80 bg-white border-r border-gray-100 p-6 flex flex-col shadow-xl z-20 h-screen sticky top-0 hidden md:flex">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => navigate('/home')}>
          <div className="bg-black text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl">漢</div>
          <h1 className="text-xl font-black tracking-tighter uppercase">Kanji Learning</h1>
        </div>
        
        <div className="space-y-2 flex-1">
          <button onClick={() => navigate('/home')} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-gray-100 text-gray-500 font-bold transition-all">
            <span className="text-xl">🏠</span> Trang chủ
          </button>
          <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-black text-white shadow-lg font-bold transition-all">
            <span className="text-xl">👤</span> Hồ sơ cá nhân
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate('/home')} className="md:hidden bg-white p-3 rounded-xl shadow-sm border border-gray-100">←</button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Hồ Sơ Của Tôi</h1>
              <p className="text-gray-400 font-medium italic">Quản lý thông tin và cá nhân hóa trải nghiệm.</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* CỘT TRÁI: AVATAR & THỐNG KÊ */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center relative group">
                <div className="w-32 h-32 mx-auto bg-gray-100 rounded-3xl overflow-hidden border-4 border-white shadow-lg mb-4 relative cursor-pointer">
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Đổi ảnh</span>
                  </div>
                </div>
                
                <h2 className="text-xl font-black text-gray-900">{formData.fullName}</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">{formData.level}</p>

                <div className="mt-6 pt-6 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Chọn linh vật đại diện</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {avatarOptions.map((seed) => (
                      <button 
                        key={seed}
                        onClick={() => setFormData({...formData, avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`})}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${formData.avatar.includes(seed) ? 'border-black scale-110 shadow-md' : 'border-transparent hover:border-gray-200'}`}
                      >
                        <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`} alt={seed} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-black text-white p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Thành tích học tập</h3>
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-3xl font-black">{formData.streak}</span>
                    <span className="text-xs font-bold text-green-400 uppercase bg-green-400/20 px-2 py-1 rounded-lg">Ngày liên tiếp 🔥</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400 to-blue-500 h-full w-[70%]"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 font-medium">Bạn chăm chỉ hơn 85% người dùng khác!</p>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: FORM CHỈNH SỬA */}
            <div className="flex-1">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Thông tin chi tiết</h3>
                
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Tên hiển thị</label>
                      <input 
                        type="text" 
                        value={formData.fullName} 
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-800 outline-none focus:border-black transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Email (Không thể sửa)</label>
                      <div className="relative">
                          <input 
                            type="email" 
                            value={formData.email} 
                            disabled
                            className="w-full bg-gray-100 border-2 border-transparent rounded-2xl px-5 py-3 font-bold text-gray-500 cursor-not-allowed opacity-70"
                          />
                          <span className="absolute right-4 top-3.5 text-lg">🔒</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Mục tiêu học tập</label>
                    <select 
                      value={formData.goal}
                      onChange={(e) => setFormData({...formData, goal: e.target.value})}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-800 outline-none focus:border-black transition-all appearance-none"
                    >
                      <option>Học 5 Kanji mỗi ngày</option>
                      <option>Học 10 Kanji mỗi ngày</option>
                      <option>Chinh phục N5 trong 1 tháng</option>
                      <option>Luyện viết 30 phút mỗi ngày</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Giới thiệu bản thân (Bio)</label>
                    <textarea 
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      className="w-full h-32 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-medium text-gray-800 outline-none focus:border-black transition-all resize-none"
                    ></textarea>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <button type="button" onClick={handleLogout} className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline">
                      Đăng xuất
                    </button>
                    
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Đang lưu...' : (isSaved ? 'Đã Lưu! ✓' : 'Lưu Thay Đổi')}
                    </button>
                  </div>
                </form>

              </div>

              <div className="mt-8 bg-red-50 p-8 rounded-[2.5rem] border border-red-100 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                <div>
                  <h4 className="text-red-600 font-black uppercase tracking-tight">Xóa tài khoản</h4>
                  <p className="text-red-400 text-xs font-bold mt-1">Hành động này không thể hoàn tác.</p>
                </div>
                <button className="bg-white text-red-500 border-2 border-red-100 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;