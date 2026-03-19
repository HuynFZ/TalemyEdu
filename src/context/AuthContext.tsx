import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export type Role = 'admin' | 'finance' | 'teacher' | 'sale' | 'pt';

interface User {
    name: string;
    role: Role;
    email: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cấu hình: 30 phút không hoạt động (đơn vị: miliseconds)
const INACTIVITY_LIMIT = 30 * 60 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // 1. Khởi tạo User từ localStorage (giúp F5 không bị văng ra ngoài)
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('talemy_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // 2. Hàm Logout (dùng useCallback để tránh re-render vô tận)
    const logout = useCallback(() => {
        localStorage.removeItem('talemy_user');
        localStorage.removeItem('last_activity');
        setUser(null);
    }, []);

    // 3. Hàm cập nhật mốc thời gian hoạt động cuối cùng
    const updateActivity = useCallback(() => {
        if (user) {
            localStorage.setItem('last_activity', Date.now().toString());
        }
    }, [user]);

    // 4. Kiểm tra thời gian rảnh định kỳ
    const checkInactivity = useCallback(() => {
        const lastActivity = localStorage.getItem('last_activity');
        if (lastActivity && user) {
            const now = Date.now();
            if (now - parseInt(lastActivity) > INACTIVITY_LIMIT) {
                alert("🔴 Phiên làm việc đã hết hạn sau 30 phút không hoạt động.");
                logout();
            }
        }
    }, [user, logout]);

    // 5. Thiết lập các bộ lắng nghe sự kiện
    useEffect(() => {
        if (!user) return;

        // Ghi nhận hoạt động ngay khi load/F5
        updateActivity();

        // Danh sách các hành động được coi là "đang làm việc"
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach(event => window.addEventListener(event, updateActivity));

        // Kiểm tra mỗi phút một lần
        const interval = setInterval(checkInactivity, 60000);

        return () => {
            events.forEach(event => window.removeEventListener(event, updateActivity));
            clearInterval(interval);
        };
    }, [user, updateActivity, checkInactivity]);

    // 6. Hàm Login nâng cấp (Đã thêm ngoại lệ Gmail Tester)
    const login = async (email: string, password?: string) => {
        const lowerEmail = email.toLowerCase();

        // LOGIC NGOẠI LỆ TẠI ĐÂY
        const isTalemyEmail = lowerEmail.endsWith('@talemy.edu');
        const isTesterEmail = lowerEmail === 'nguyennhathuy083@gmail.com';

        if (!isTalemyEmail && !isTesterEmail) {
            alert("⚠️ Vui lòng sử dụng email doanh nghiệp @talemy.edu");
            return;
        }

        if (!password) {
            alert("⚠️ Vui lòng nhập mật khẩu");
            return;
        }

        try {
            const q = query(
                collection(db, "users"),
                where("username", "==", lowerEmail),
                where("status", "==", "active"),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();

                if (userData.password === password) {
                    // Logic lấy tên hiển thị:
                    // Email: nguyen.van.a@talemy.edu -> Name: Nguyen
                    // Email: nguyennhathuy083@gmail.com -> Name: Nguyennhathuy083
                    const namePart = lowerEmail.split('@')[0];
                    const firstName = namePart.includes('.') ? namePart.split('.')[0] : namePart;

                    const newUser: User = {
                        name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
                        role: userData.role as Role,
                        email: lowerEmail
                    };

                    // Lưu vào State và LocalStorage cùng lúc
                    setUser(newUser);
                    localStorage.setItem('talemy_user', JSON.stringify(newUser));
                    localStorage.setItem('last_activity', Date.now().toString());
                } else {
                    alert("❌ Sai mật khẩu! Vui lòng kiểm tra lại.");
                }
            } else {
                alert("❌ Tài khoản không tồn tại hoặc đã bị khóa!");
            }
        } catch (error) {
            console.error("Auth Error:", error);
            alert("🔌 Lỗi kết nối Database!");
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};