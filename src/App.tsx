import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CreditCard, GraduationCap, BarChart3, LogOut } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

// Import Auth và các trang tính năng
import { AuthProvider, useAuth, Role } from './context/AuthContext';
import Login from './features/Login';
import Dashboard from './features/Dashboard';
import Finance from './features/Finance';
import LeadManagement from './features/LeadManagement';
import Course from './features/Course';

// 1. Định nghĩa Interface cho Menu
interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    roles: Role[];
}

// Interface Lead khớp với Database Firebase
interface Lead {
    id: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
    course: string;
    source?: string;
    note?: string;
    create_at?: any; 
}

// 2. Danh sách Menu (CHỈ KHAI BÁO 1 LẦN Ở ĐÂY)
const menuItems: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        roles: ['admin', 'finance', 'teacher', 'pt', 'sale']
    },
    {
        id: 'pipeline',
        label: 'Sales Pipeline',
        icon: <BarChart3 size={20} />,
        roles: ['admin', 'sale']
    },
    {
        id: 'course',
        label: 'Course',
        icon: <GraduationCap size={20} />,
        roles: ['admin', 'teacher', 'pt']
    },
    {
        id: 'finance',
        label: 'Finance',
        icon: <CreditCard size={20} />,
        roles: ['admin', 'finance']
    },
];

function MainApp() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [leads, setLeads] = useState<Lead[]>([]);

    useEffect(() => {
        if (!user) return;
        // Query dữ liệu từ collection "leads" sắp xếp theo create_at
        const q = query(collection(db, "leads"), orderBy("create_at", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            })) as Lead[];
            setLeads(data);
        });
        return () => unsubscribe();
    }, [user]);

    if (!user) return <Login />;

    const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard />;
            case 'finance': return <Finance />;
            case 'course': return <Course />;
            case 'pipeline': return <LeadManagement leads={leads} />;
            default:
                return (
                    <div className="flex items-center justify-center h-full text-slate-400 italic">
                        Tính năng {activeTab} đang phát triển...
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                        <GraduationCap className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Talemy</h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-bold mt-1">Management</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {filteredMenu.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                                activeTab === item.id 
                                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-100' 
                                    : 'text-slate-500 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                            {user.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase">{user.role}</p>
                        </div>
                        <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 overflow-hidden relative">
                {renderContent()}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}