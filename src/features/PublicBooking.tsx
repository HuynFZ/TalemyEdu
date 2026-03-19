import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import {
    doc, getDoc, collection, query, where, onSnapshot,
    addDoc, deleteDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { Clock, Calendar, CheckCircle2, AlertCircle, Trash2, Plus, CalendarDays, AlertTriangle } from 'lucide-react';

const DAYS_MAP: { [key: string]: number } = {
    'Chủ Nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 4 ': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6
};

const PublicBooking = () => {
    const { classId } = useParams();
    const [classData, setClassData] = useState<any>(null);
    const [teacherData, setTeacherData] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!classId) return;
        const fetchData = async () => {
            try {
                const cSnap = await getDoc(doc(db, "classes", classId));
                if (cSnap.exists()) {
                    const cData = cSnap.data();
                    setClassData({ id: cSnap.id, ...cData });
                    const tSnap = await getDoc(doc(db, "staffs", cData.teacherId));
                    if (tSnap.exists()) setTeacherData(tSnap.data());
                }
            } catch (e) { console.error(e); }
        };
        fetchData();

        const q = query(collection(db, "sessions"), where("classId", "==", classId), orderBy("date", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => { setLoading(false); });
        return () => unsub();
    }, [classId]);

    const handleBook = async (date: string) => {
        if (sessions.length >= (classData?.totalSessions || 45)) return alert("Đã đủ số buổi!");
        try {
            await addDoc(collection(db, "sessions"), { classId, date, status: 'Chưa diễn ra', createdAt: serverTimestamp() });
        } catch (e) { alert("Lỗi!"); }
    };

    const handleCancel = async (sessionId: string, sessionDate: string) => {
        const diff = (new Date(sessionDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        if (diff < 2) return alert("⚠️ Không thể hủy trước 2 ngày.");
        if (window.confirm("Hủy buổi học này?")) await deleteDoc(doc(db, "sessions", sessionId));
    };

    const generateAvailableSlots = () => {
        if (!teacherData?.fixedSchedule) return [];
        const slots = [];
        const today = new Date();
        const teacherDays = teacherData.fixedSchedule.map((d: string) => DAYS_MAP[d.trim()]);
        for (let i = 1; i <= 14; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            if (teacherDays.includes(date.getDay())) {
                const ds = date.toISOString().split('T')[0];
                if (!sessions.some(s => s.date === ds)) slots.push(ds);
            }
        }
        return slots;
    };

    // LOGIC TIẾN ĐỘ & VẮNG
    const attended = sessions.filter(s => s.status === 'Đã điểm danh').length;
    const absents = sessions.filter(s => s.status === 'Vắng').length;
    const progress = attended + absents;
    const isWarning = absents >= 2;

    if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase tracking-widest">Đang kết nối Talemy...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                        <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-200"><Calendar size={32} /></div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Lịch học của tôi</h1>
                        <p className="text-slate-400 text-sm font-bold uppercase italic">Lớp: {classData?.className}</p>
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-400">Tiến độ khóa học:</span><span className="text-emerald-600">{progress}/{classData?.totalSessions} buổi</span></div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(progress / classData?.totalSessions) * 100}%` }}></div></div>
                        </div>
                    </div>

                    {/* BANNER CẢNH BÁO CHO HỌC VIÊN */}
                    {isWarning && (
                        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] flex items-center gap-4 text-red-600">
                            <AlertTriangle size={24} className="shrink-0" />
                            <div><p className="text-xs font-black uppercase tracking-tight">Cảnh báo học vụ</p><p className="text-[11px] font-bold opacity-80">Bạn đã vắng {absents} buổi học. Vui lòng liên hệ trung tâm để tránh bị gián đoạn lộ trình!</p></div>
                        </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
                        <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={16} /> Lịch học sắp tới</h3>
                        <div className="space-y-3">
                            {sessions.filter(s => s.status === 'Chưa diễn ra').map((s) => {
                                const canCancel = (new Date(s.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) >= 2;
                                return (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                        <div><p className="font-black text-slate-700 uppercase text-xs">{new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}</p><span className="text-[9px] font-black text-orange-400 uppercase bg-orange-50 px-2 py-0.5 rounded">Chờ đến ngày học</span></div>
                                        <button onClick={() => handleCancel(s.id, s.date)} className={`p-2 rounded-xl transition-all ${canCancel ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`} disabled={!canCancel}><Trash2 size={18} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {sessions.filter(s => s.status !== 'Chưa diễn ra').length > 0 && (
                        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> Buổi học đã học</h3>
                            <div className="space-y-3">
                                {sessions.filter(s => s.status !== 'Chưa diễn ra').map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-emerald-50/20 rounded-2xl border border-emerald-100 italic">
                                        <p className="font-bold text-slate-600 text-xs">{s.date}</p>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${s.status === 'Đã điểm danh' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{s.status === 'Đã điểm danh' ? 'Đã học' : `Vắng mặt`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <CalendarDays className="absolute -right-4 -bottom-4 text-white/5" size={120} />
                        <h3 className="text-lg font-black uppercase italic text-orange-500 mb-2 tracking-tighter">Đăng ký ngày học</h3>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Bạn có thể chọn ngày học trong 14 ngày tới theo lịch rảnh của GV {classData?.teacherName}.</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-[11px] text-amber-700 font-black uppercase leading-relaxed italic">Quy định: Mọi thay đổi về lịch học cần thực hiện trước ít nhất 48 tiếng.</p>
                    </div>
                    <div className="space-y-3">
                        {generateAvailableSlots().map((slot) => (
                            <button key={slot} onClick={() => handleBook(slot)} className="w-full bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center justify-between group shadow-sm active:scale-[0.98]">
                                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-inner"><Clock size={20} /></div><span className="font-black text-slate-700 uppercase text-xs">{new Date(slot).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</span></div>
                                <Plus size={20} className="text-slate-300 group-hover:text-orange-500" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicBooking;