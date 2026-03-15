import React, { useState, useEffect } from 'react';
import { LayoutDashboard, CreditCard, GraduationCap, BarChart3, Plus, LogOut } from 'lucide-react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

// 1. Import trang Dashboard (Giả sử bạn để file ở src/features/Dashboard.tsx)
import Dashboard from './features/Dashboard';

interface Lead {
    id: string;
    name: string;
    status: string;
    course: string;
    source: string;
}

function App() {
    const [activeTab, setActiveTab] = useState<string>('dashboard'); // Mặc định mở Dashboard
    const [leads, setLeads] = useState<Lead[]>([]);

    useEffect(() => {
        const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
            setLeads(data);
        });
        return () => unsubscribe();
    }, []);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'pipeline', label: 'Sales Pipeline', icon: <BarChart3 size={20} /> },
        { id: 'students', label: 'Học viên (LMS)', icon: <GraduationCap size={20} /> },
        { id: 'finance', label: 'Tài chính', icon: <CreditCard size={20} /> },
    ];

    // 2. Hàm render nội dung theo Tab
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'pipeline':
                return (
                    <div className="p-8">
                        <h2 className="text-2xl font-black mb-6">Sales Pipeline</h2>
                        <div className="flex gap-6 overflow-x-auto pb-6">
                            {["New", "Contacted", "Trial", "Enrolled"].map(status => (
                                <div key={status} className="min-w-[300px] bg-slate-200/50 rounded-2xl p-4 border border-slate-200">
                                    <div className="flex justify-between mb-4 px-2 italic text-slate-500 text-xs font-bold uppercase">
                                        {status} ({leads.filter(l => l.status === status).length})
                                    </div>
                                    {/* List leads here... */}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center justify-center h-full text-slate-400 italic">
                        Tính năng {activeTab} đang được phát triển...
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
            {/* Sidebar màu Cam-Trắng đồng bộ */}
            <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                        <GraduationCap className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">Talemy</h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-bold mt-1">Management</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {menuItems.map((item) => (
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

                {/* User Profile Area */}
                <div className="p-4 mt-auto border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                            H
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">Huy Nguyễn</p>
                            <p className="text-[10px] text-slate-500 font-medium">Administrator</p>
                        </div>
                        <button className="text-slate-400 hover:text-red-500">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main View Area */}
            <main className="flex-1 overflow-hidden relative">
                {renderContent()}
            </main>
        </div>
    );
}

export default App;