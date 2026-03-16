import React, { useState } from 'react';
import { LayoutDashboard, CreditCard, GraduationCap, BarChart3, LogOut, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth, Role } from './context/AuthContext';
import Login from './features/Login';
import Dashboard from './features/Dashboard';
import Finance from './features/Finance';
import LeadManagement from './features/LeadManagement';
import Course from './features/Course';

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    roles: Role[];
}

const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['admin', 'finance', 'teacher', 'pt', 'sale'] },
    { id: 'pipeline', label: 'Sales Pipeline', icon: <BarChart3 size={20} />, roles: ['admin', 'sale'] },
    { id: 'course', label: 'Course', icon: <GraduationCap size={20} />, roles: ['admin', 'teacher', 'pt'] },
    { id: 'finance', label: 'Finance', icon: <CreditCard size={20} />, roles: ['admin', 'finance'] },
];

function MainApp() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Quản lý đóng mở Sidebar trên Mobile

    if (!user) return <Login />;

    const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard />;
            case 'finance': return <Finance />;
            case 'course': return <Course />;
            case 'pipeline': return <LeadManagement />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* MOBILE HEADER - Chỉ hiện trên màn hình nhỏ */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 p-4 flex justify-between items-center z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                        <GraduationCap className="text-white" size={18} />
                    </div>
                    <span className="font-black text-slate-800">Talemy</span>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 bg-slate-100 rounded-xl">
                    <Menu size={24} />
                </button>
            </div>

            {/* OVERLAY - Khi mở Sidebar trên Mobile */}
            {isSidebarOpen && (
                <div className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* SIDEBAR - Responsive: Ẩn trên Mobile, Hiện trên Laptop */}
            <aside className={`
                fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm transition-transform duration-300
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                            <GraduationCap className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Talemy</h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-bold mt-1">Management</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {filteredMenu.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                                activeTab === item.id ? 'bg-orange-500 text-white shadow-xl shadow-orange-100' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 uppercase">
                            {user.name?.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{user.role}</p>
                        </div>
                        <button onClick={logout} className="text-slate-400 hover:text-red-500"><LogOut size={18} /></button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto h-full pt-20 lg:pt-0">
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