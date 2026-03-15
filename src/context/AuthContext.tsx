import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'admin' | 'finance' | 'teacher' | 'sale' | 'pt';

interface User {
    name: string;
    role: Role;
    email: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string) => void; // Hàm đăng nhập giả lập
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    const login = (email: string) => {
        if (email.includes('admin')) {
            setUser({ name: "Huy Nguyễn", role: 'admin', email });
        } else if (email.includes('finance')) {
            setUser({ name: "Ngọc Tài Chính", role: 'finance', email });
        } else if (email.includes('sale')) {
            setUser({ name: "Mạnh Huy Sales", role: 'sale', email }); // Quyền Sales
        } else if (email.includes('pt')) {
            setUser({ name: "Thái PT", role: 'pt', email }); // Quyền PT (giống Teacher)
        } else {
            setUser({ name: "Giảng Viên", role: 'teacher', email });
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