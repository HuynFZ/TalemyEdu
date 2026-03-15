import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CreditCard, GraduationCap, BarChart3, Plus, Send } from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, serverTimestamp, orderBy } from "firebase/firestore";

function App() {
    const [activeTab, setActiveTab] = useState('pipeline');
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Lắng nghe dữ liệu Real-time từ Firebase
    useEffect(() => {
        const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeads(data);
        });
        return () => unsubscribe();
    }, []);

    // 2. Hàm Test kết nối - Ghi dữ liệu
    const handleAddTestLead = async () => {
        setLoading(true);
        try {
            await addDoc(collection(db, "leads"), {
                name: `Học viên ${Math.floor(Math.random() * 1000)}`,
                status: "New",
                course: "IELTS Special",
                source: "Facebook Ads",
                createdAt: serverTimestamp()
            });
        } catch (e) {
            alert("Lỗi kết nối Firebase: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'pipeline', label: 'Sales Pipeline', icon: <BarChart3 size={20} /> },
        { id: 'students', label: 'Học viên (LMS)', icon: <GraduationCap size={20} /> },
        { id: 'finance', label: 'Tài chính', icon: <CreditCard size={20} /> },
    ];

    return (
        <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-2xl font-black text-blue-600 tracking-tight">TalemyEdu</h1>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Internal Management</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {item.icon}
                            <span className="font-semibold">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
                    <h2 className="text-xl font-bold capitalize">{activeTab} View</h2>
                    <button
                        onClick={handleAddTestLead}
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Đang gửi..." : <><Plus size={18} /> Thêm Lead Test</>}
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    {activeTab === 'pipeline' ? (
                        <div className="flex gap-6 h-full overflow-x-auto pb-6">
                            {["New", "Contacted", "Trial", "Enrolled"].map(status => (
                                <div key={status} className="min-w-[300px] flex flex-col bg-slate-200/50 rounded-2xl p-4 border border-slate-200">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <span className="font-bold text-slate-600 uppercase text-xs tracking-wider">{status}</span>
                                        <span className="bg-white text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                      {leads.filter(l => l.status === status).length}
                    </span>
                                    </div>
                                    <div className="space-y-3 flex-1 overflow-y-auto">
                                        {leads.filter(l => l.status === status).map(lead => (
                                            <div key={lead.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-slate-800">{lead.name}</h4>
                                                    <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-md font-bold">{lead.source}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2 font-medium">Khóa học: {lead.course}</p>
                                                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="text-blue-600 text-xs font-bold underline">Chi tiết</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 italic">
                            Tính năng {activeTab} đang được Ngọc và Khang phát triển...
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default App;