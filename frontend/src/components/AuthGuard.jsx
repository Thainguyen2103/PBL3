import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext'; // Import context nếu cần dùng setUser

const AuthGuard = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const { setUser } = useAppContext(); // Lấy hàm setUser để đồng bộ context

    useEffect(() => {
        const checkAuth = () => {
            // 1. Lấy thông tin session từ LocalStorage (Cách code hiện tại của bạn đang dùng)
            const storedSession = localStorage.getItem('session');

            if (storedSession) {
                // Nếu có session trong storage, parse ra và cập nhật lại Context (đề phòng F5 mất state)
                try {
                    const sessionData = JSON.parse(storedSession);
                    setUser(sessionData); // Cập nhật lại user vào context toàn cục
                    setIsAuthenticated(true);
                } catch (error) {
                    console.error("Lỗi parse session:", error);
                    localStorage.removeItem('session'); // Xóa nếu dữ liệu lỗi
                    setIsAuthenticated(false);
                }
            } else {
                setIsAuthenticated(false);
            }
            setLoading(false);
        };

        checkAuth();
    }, [setUser]);

    // Màn hình chờ
    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#fdfbf7]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
                </div>
            </div>
        );
    }

    // NẾU CHƯA CÓ SESSION (trong LocalStorage) => ĐÁ VỀ TRANG AUTH
    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // NẾU CÓ SESSION RỒI => CHO PHÉP VÀO
    return children;
};

export default AuthGuard;