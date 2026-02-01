import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import emailjs from '@emailjs/browser';
import { useAppContext } from '../context/AppContext'; // ✅ Import Context
import { translations } from '../utils/translations'; // ✅ Import Translations

// 🔥 CẤU HÌNH EMAILJS (Dùng chung Service/Public Key cũ, chỉ thay Template ID mới)
// 🔥 SỬA LẠI CHO KHỚP .ENV (Tài khoản 1)
const EMAIL_SERVICE_ID = import.meta.env.VITE_MAIN_SERVICE_ID; // Phải là MAIN
const EMAIL_TEMPLATE_ID = import.meta.env.VITE_TEMPLATE_RESET; // Template Reset
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_MAIN_PUBLIC_KEY; // Phải là MAIN

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const { language } = useAppContext(); // ✅ Lấy language từ Context
    const t = translations[language] || translations.vi; // ✅ Lấy bộ từ điển

    const [searchParams] = useSearchParams();
    const token = searchParams.get('token'); // Lấy token từ URL (nếu có)

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [step, setStep] = useState(token ? 2 : 1); // Step 1: Nhập mail | Step 2: Đổi pass
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' }); // type: success | error

    // --- XỬ LÝ GỬI LINK KHÔI PHỤC (STEP 1) ---
    const handleSendLink = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ text: '', type: '' });

        try {
            // 1. Kiểm tra Email có tồn tại không
            const { data: user } = await supabase.from('users').select('id, full_name').eq('email', email).maybeSingle();

            if (!user) {
                setMessage({ text: t.forgot_err_email_not_found, type: 'error' }); // ✅ t.key
                setIsLoading(false);
                return;
            }

            // 2. Tạo Token và Lưu vào DB
            const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            const { error } = await supabase
                .from('users')
                .update({ reset_token: resetToken })
                .eq('email', email);

            if (error) throw error;

            // 3. Gửi EmailJS
            const resetLink = `${window.location.origin}/forgot-password?token=${resetToken}`;
            
            await emailjs.send(EMAIL_SERVICE_ID, EMAIL_TEMPLATE_ID, {
                to_name: user.full_name || email.split('@')[0],
                to_email: email,
                reset_link: resetLink
            }, EMAIL_PUBLIC_KEY);

            setMessage({ text: t.forgot_success_sent, type: 'success' }); // ✅ t.key
            
        } catch (err) {
            console.error(err);
            setMessage({ text: t.forgot_err_send_mail + err.message, type: 'error' }); // ✅ t.key
        } finally {
            setIsLoading(false);
        }
    };

    // --- XỬ LÝ ĐỔI MẬT KHẨU (STEP 2) ---
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ text: t.forgot_err_pass_match, type: 'error' }); // ✅ t.key
            return;
        }
        
        setIsLoading(true);
        try {
            // 1. Tìm User có token này
            const { data: user } = await supabase.from('users').select('id').eq('reset_token', token).maybeSingle();

            if (!user) {
                setMessage({ text: t.forgot_err_invalid_link, type: 'error' }); // ✅ t.key
                setIsLoading(false);
                return;
            }

            // 2. Cập nhật mật khẩu mới & Xóa token
            const { error } = await supabase
                .from('users')
                .update({ 
                    password: newPassword, // Lưu ý: Nên mã hóa nếu có thể
                    reset_token: null      // Xóa token để không dùng lại được
                })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ text: t.forgot_success_reset, type: 'success' }); // ✅ t.key
            setTimeout(() => navigate('/auth'), 3000);

        } catch (err) {
            setMessage({ text: t.forgot_error_prefix + err.message, type: 'error' }); // ✅ t.key
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans text-slate-900 p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-gray-100 relative">
                {/* ✅ Cập nhật: t.forgot_close */}
                <button onClick={() => navigate('/auth')} className="absolute top-6 right-6 text-gray-400 hover:text-black font-bold text-sm">✕ {t.forgot_close}</button>
                
                <div className="text-center mb-6">
                    <div className="text-5xl mb-2">🔐</div>
                    <h1 className="text-2xl font-black uppercase text-gray-800">
                        {/* ✅ Cập nhật: Title */}
                        {step === 1 ? t.forgot_title_step1 : t.forgot_title_step2}
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        {/* ✅ Cập nhật: Desc */}
                        {step === 1 ? t.forgot_desc_step1 : t.forgot_desc_step2}
                    </p>
                </div>

                {message.text && (
                    <div className={`p-3 rounded-xl text-xs font-bold text-center mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                {/* --- FORM STEP 1: NHẬP EMAIL --- */}
                {step === 1 && (
                    <form onSubmit={handleSendLink} className="space-y-4">
                        <div>
                            {/* ✅ Cập nhật: Label Email */}
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t.forgot_label_email}</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium" placeholder="example@gmail.com" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition-all uppercase tracking-widest text-sm shadow-lg">
                            {/* ✅ Cập nhật: Button */}
                            {isLoading ? t.forgot_btn_sending : t.forgot_btn_send}
                        </button>
                    </form>
                )}

                {/* --- FORM STEP 2: ĐỔI PASS --- */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            {/* ✅ Cập nhật: Label New Pass */}
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t.forgot_label_new_pass}</label>
                            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium" />
                        </div>
                        <div>
                            {/* ✅ Cập nhật: Label Confirm Pass */}
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1 ml-1">{t.forgot_label_confirm_pass}</label>
                            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-5 py-3 bg-gray-50 border border-transparent rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium" />
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full bg-black text-white font-black py-4 rounded-2xl hover:bg-gray-800 transition-all uppercase tracking-widest text-sm shadow-lg">
                            {/* ✅ Cập nhật: Button */}
                            {isLoading ? t.forgot_btn_processing : t.forgot_btn_reset}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;