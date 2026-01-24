import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAppContext } from '../context/AppContext';

const DeleteAccountPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const deleteUser = async () => {
      const token = searchParams.get('token');
      if (!token) { setStatus('error'); return; }

      try {
        // 1. Tìm User có token xóa này
        const { data: user } = await supabase.from('users').select('id').eq('delete_token', token).maybeSingle();

        if (!user) { setStatus('error'); return; }

        // 2. XÓA VĨNH VIỄN
        const { error } = await supabase.from('users').delete().eq('id', user.id);
        if (error) throw error;

        // 3. Đăng xuất
        localStorage.removeItem('session');
        setUser(null);
        setStatus('success');
        setTimeout(() => navigate('/auth'), 5000); // Về trang login sau 5s

      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    deleteUser();
  }, [searchParams, navigate, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-2 border-red-100">
        {status === 'verifying' && <h2 className="text-xl font-black text-red-600 animate-pulse">⏳ ĐANG XÓA DỮ LIỆU...</h2>}
        
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-2xl font-black text-gray-800">ĐÃ XÓA TÀI KHOẢN</h2>
            <p className="text-gray-600 mt-2">Toàn bộ dữ liệu của bạn đã biến mất vĩnh viễn.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-2xl font-black text-gray-800">LIÊN KẾT LỖI</h2>
            <p className="text-gray-500 mt-2">Link hết hạn hoặc tài khoản đã bị xóa.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountPage;