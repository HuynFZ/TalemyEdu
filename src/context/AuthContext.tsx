import React, { createContext, useContext, useState, ReactNode } from 'react';
import { db } from '../firebase'; // Đảm bảo đường dẫn tới file config firebase của Huy
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export type Role = 'admin' | 'finance' | 'teacher' | 'sale' | 'pt';

interface User {
    name: string;
    role: Role;
    email: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string) => Promise<void>; // Chuyển thành Promise vì phải đợi Firebase phản hồi
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = async (email: string, password?: string) => {
        const lowerEmail = email.toLowerCase();

        if (!lowerEmail.endsWith('@talemy.edu')) {
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

                // KIỂM TRA MẬT KHẨU
                if (userData.password === password) {
                    const parts = lowerEmail.split('@')[0].split('.');
                    setUser({
                        name: parts[0].charAt(0).toUpperCase() + parts[0].slice(1),
                        role: userData.role as Role,
                        email: lowerEmail
                    });
                } else {
                    alert("❌ Sai mật khẩu! Vui lòng kiểm tra lại.");
                }
            } else {
                alert("❌ Tài khoản không tồn tại hoặc đã bị khóa!");
            }
        } catch (error) {
            alert("🔌 Lỗi kết nối Database!");
        }
    };

    const logout = () => setUser(null);

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