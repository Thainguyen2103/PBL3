import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const verifyAccount = async () => {
      const token = searchParams.get('token');

      // Nếu không có token trên URL -> Lỗi
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        // 1. Tìm xem user nào đang giữ token này
        const { data, error } = await supabase
          .from('users')
          .select('id, email')
          .eq('verification_token', token)
          .maybeSingle();

        if (error || !data) {
          setStatus('error'); // Token không tồn tại (hoặc đã dùng rồi)
        } else {
          // 2. Kích hoạt tài khoản (Active) và Xóa token
          await supabase
            .from('users')
            .update({ 
              status: 'active', 
              verification_token: null 
            })
            .eq('id', data.id);
            
          setStatus('success');
          // Chuyển về trang đăng nhập sau 3 giây
          setTimeout(() => navigate('/auth'), 3000);
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    verifyAccount();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
        {status === 'verifying' && (
          <>
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <h2 className="text-xl font-black text-gray-800">ĐANG XÁC THỰC...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-green-600">THÀNH CÔNG!</h2>
            <p className="text-gray-600 mt-2">Tài khoản đã được kích hoạt.</p>
            <p className="text-sm text-gray-400 mt-4">Đang chuyển hướng...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-black text-red-500">LỖI XÁC THỰC</h2>
            <p className="text-gray-600 mt-2">Link đã hết hạn hoặc không hợp lệ.</p>
            <button onClick={() => navigate('/auth')} className="mt-6 w-full bg-black text-white py-3 rounded-xl font-bold">QUAY LẠI</button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;