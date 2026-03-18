import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ArrowLeft, User, UserCheck, Clock, CheckCircle2, XCircle, AlertCircle, Calendar, GraduationCap } from 'lucide-react';

interface SessionManagementProps {
    classData: any;
    onBack: () => void;
}

const SessionManagement = ({ classData, onBack }: SessionManagementProps) => {
    const [sessions, setSessions] = useState<any[]>([]);

    // 1. Lấy danh sách buổi học của lớp này
    useEffect(() => {
        const q = query(
            collection(db, "sessions"), 
            where("classId", "==", classData.id),
            orderBy("sessionNumber", "asc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [classData.id]);

    // 2. Hàm xử lý điểm danh và TỰ ĐỘNG TẠO BUỔI TIẾP THEO (Cuốn chiếu 1 tháng)
    const handleAttendance = async (sessionId: string, status: string) => {
        try {
            // Cập nhật trạng thái buổi hiện tại
            await updateDoc(doc(db, "sessions", sessionId), { status });

            // Kiểm tra số buổi "Chưa diễn ra" còn lại
            // Nếu còn ít hơn 4 buổi chưa diễn ra, tạo thêm 1 buổi mới cách 7 ngày so với buổi cuối cùng
            const upcomingSessions = sessions.filter(s => s.status === 'Chưa diễn ra' && s.id !== sessionId);
            
            if (upcomingSessions.length < 4) {
                const lastSession = sessions[sessions.length - 1];
                const lastDate = new Date(lastSession.date);
                
                const nextDate = new Date(lastDate);
                nextDate.setDate(lastDate.getDate() + 7); // Cộng thêm 1 tuần

                await addDoc(collection(db, "sessions"), {
                    classId: classData.id,
                    sessionNumber: lastSession.sessionNumber + 1,
                    date: nextDate.toISOString().split('T')[0],
                    status: 'Chưa diễn ra',
                    createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            console.error("Lỗi điểm danh:", err);
            alert("Có lỗi xảy ra khi điểm danh!");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Đã điểm danh': return <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-lg uppercase">Đã có mặt</span>;
            case 'Vắng': return <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase">Vắng mặt</span>;
            case 'Hủy': return <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black rounded-lg uppercase">Đã hủy</span>;
            default: return <span className="px-3 py-1 bg-orange-50 text-orange-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-orange-100">Chưa diễn ra</span>;
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-right duration-500">
            {/* TOP HEADER */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0 shadow-xl">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5 shadow-inner">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-black italic tracking-tight uppercase">{classData.className}</h2>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5 opacity-70">Quản lý lộ trình học tập 1-1</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-orange-500 px-5 py-2.5 rounded-[1.2rem] shadow-lg shadow-orange-500/20">
                    <Calendar size={18} className="text-white"/>
                    <span className="text-xs font-black uppercase tracking-widest text-white">{classData.studyDay} hàng tuần</span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR TRÁI: THÔNG TIN NHÂN SỰ LỚP */}
                <div className="w-85 bg-slate-50 border-r p-8 space-y-10 overflow-y-auto shrink-0 shadow-inner">
                    <div className="space-y-8">
                        {/* GIẢNG VIÊN (TO NHẤT) */}
                        <section>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Giảng viên chính
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white rounded-3xl shadow-sm flex items-center justify-center text-emerald-500 border border-slate-100"><UserCheck size={28}/></div>
                                <div>
                                    <p className="text-2xl font-black text-slate-800 leading-none tracking-tighter">{classData.teacherName}</p>
                                    <p className="text-[11px] font-bold text-slate-400 italic mt-2 flex items-center gap-1 opacity-80">
                                        Trợ giảng: <span className="text-slate-500 uppercase font-black">{classData.ptName || 'Chưa có'}</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* HỌC VIÊN */}
                        <section className="pt-8 border-t border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Học viên 1-1
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner"><User size={24}/></div>
                                <p className="text-lg font-bold text-slate-700 tracking-tight">{classData.studentName}</p>
                            </div>
                        </section>
                    </div>

                    <div className="mt-auto p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <GraduationCap className="absolute -right-4 -bottom-4 text-white/5 rotate-12 transition-transform group-hover:scale-110" size={120}/>
                        <p className="text-[10px] font-black text-slate-400 uppercase text-center mb-3 tracking-widest">Tiến độ khóa học</p>
                        <p className="text-4xl font-black text-center text-orange-500 tracking-tighter mb-4">
                            {sessions.filter(s => s.status !== 'Chưa diễn ra').length}<span className="text-white/20 mx-1">/</span>{sessions.length}
                        </p>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-orange-500 h-full transition-all duration-700" 
                                 style={{ width: `${(sessions.filter(s => s.status !== 'Chưa diễn ra').length / sessions.length) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* DANH SÁCH BUỔI HỌC BÊN PHẢI */}
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-end mb-10 border-b-2 border-slate-50 pb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">Nhật ký lộ trình</h3>
                                <p className="text-xs font-bold text-slate-400 italic">Hệ thống luôn tự động cập nhật và hiển thị trước lộ trình 1 tháng học.</p>
                            </div>
                            <Clock className="text-slate-200" size={40}/>
                        </div>

                        <div className="space-y-5">
                            {sessions.map((s) => (
                                <div key={s.id} className={`p-7 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group shadow-sm ${
                                    s.status === 'Chưa diễn ra' ? 'border-slate-100 bg-white hover:border-orange-200 hover:shadow-orange-100/50' : 'bg-slate-50 border-transparent opacity-80'
                                }`}>
                                    <div className="flex items-center gap-8">
                                        <div className="bg-white w-16 h-16 rounded-3xl border border-slate-200 flex flex-col items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Buổi</span>
                                            <span className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{s.sessionNumber}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 tracking-widest uppercase">
                                                    Mã: {classData.className.slice(0,3).toUpperCase()}-S{s.sessionNumber}
                                                </span>
                                                {getStatusBadge(s.status)}
                                            </div>
                                            <p className="text-lg font-black text-slate-700 tracking-tight flex items-center gap-2 italic">
                                                <Calendar size={16} className="text-slate-300"/> {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>

                                    {s.status === 'Chưa diễn ra' ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleAttendance(s.id, 'Đã điểm danh')} className="px-6 py-3.5 bg-emerald-500 text-white text-[10px] font-black rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 uppercase tracking-widest">ĐIỂM DANH</button>
                                            <button onClick={() => handleAttendance(s.id, 'Vắng')} className="px-6 py-3.5 bg-white text-red-600 text-[10px] font-black rounded-2xl border-2 border-red-100 hover:bg-red-50 transition-all active:scale-95 uppercase tracking-widest">VẮNG</button>
                                            <button onClick={() => handleAttendance(s.id, 'Hủy')} className="p-3.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"><XCircle size={18}/></button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100 text-slate-300">
                                            <CheckCircle2 size={24}/>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default SessionManagement;
