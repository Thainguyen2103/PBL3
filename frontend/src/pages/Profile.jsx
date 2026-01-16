import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUserInfo } = useAppContext();
  
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

  const avatarOptions = ['Samurai', 'Neko', 'Shiba', 'Sensei', 'Geisha', 'Ronin'];

  useEffect(() => {
    if (user) {
      setFormData({
        // Thử lấy cả name hoặc fullName hoặc username
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

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. LẤY TOKEN TỪ SESSION (Quan trọng để Server cho phép sửa)
      const session = JSON.parse(localStorage.getItem('session'));
      const token = session?.access_token || session?.token; 

      console.log("Đang gửi dữ liệu lên Server:", formData);

      const response = await fetch('https://pbl3-sofd.onrender.com/api/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Gửi kèm Token nếu có
          ...(token && { 'Authorization': `Bearer ${token}` }) 
        },
        body: JSON.stringify({
          email: formData.email,
          // Gửi cả 2 trường để chắc chắn Server nhận được 1 trong 2
          name: formData.fullName,      
          fullName: formData.fullName,
          bio: formData.bio,
          avatar: formData.avatar,
          goal: formData.goal
        }),
      });

      const data = await response.json();
      console.log("Server phản hồi:", data);

      if (response.ok) {
        // Cập nhật Context ngay lập tức
        // Lưu ý: Cập nhật cả trường 'name' và 'fullName' vào local để đồng bộ
        updateUserInfo({ ...formData, name: formData.fullName });
        
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      } else {
        alert("Lỗi Server: " + (data.message || "Không thể lưu"));
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      alert("Không thể kết nối đến máy chủ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if(window.confirm("Bạn chắc chắn muốn đăng xuất?")) {
        localStorage.removeItem('session');
        navigate('/auth');
        window.location.reload();
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex font-sans">
      
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
            </div>

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
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Email</label>
                      <div className="relative">
                          <input type="email" value={formData.email} disabled className="w-full bg-gray-100 border-2 border-transparent rounded-2xl px-5 py-3 font-bold text-gray-500 cursor-not-allowed opacity-70"/>
                          <span className="absolute right-4 top-3.5 text-lg">🔒</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Mục tiêu học tập</label>
                    <select value={formData.goal} onChange={(e) => setFormData({...formData, goal: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-800 outline-none focus:border-black transition-all appearance-none">
                      <option>Học 5 Kanji mỗi ngày</option>
                      <option>Học 10 Kanji mỗi ngày</option>
                      <option>Chinh phục N5 trong 1 tháng</option>
                      <option>Luyện viết 30 phút mỗi ngày</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Giới thiệu bản thân (Bio)</label>
                    <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="w-full h-32 bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-medium text-gray-800 outline-none focus:border-black transition-all resize-none"></textarea>
                  </div>

                  <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                    <button type="button" onClick={handleLogout} className="text-red-500 text-xs font-black uppercase tracking-widest hover:underline">Đăng xuất</button>
                    <button type="submit" disabled={isLoading} className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                      {isLoading ? 'Đang lưu...' : (isSaved ? 'Đã Lưu! ✓' : 'Lưu Thay Đổi')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;