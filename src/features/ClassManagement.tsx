import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection, query, where, onSnapshot, addDoc, deleteDoc,
    doc, updateDoc, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import {
    User, UserCheck, Plus, ArrowLeft, X,
    Trash2, Clock, ChevronRight, FileText, Video, Link as LinkIcon,
    ExternalLink, Copy, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';

interface ClassManagementProps {
    courseId: string; // Đây sẽ là classId nếu isDirectClass = true
    courseTitle: string;
    isDirectClass?: boolean; // Nhận cờ từ Course.tsx
    onBack: () => void;
}

const ClassManagement = ({ courseId, courseTitle, isDirectClass, onBack }: ClassManagementProps) => {
    // Nếu là teacher (direct), vào thẳng sessions. Nếu là admin, vào list lớp.
    const [view, setView] = useState<'list' | 'sessions'>(isDirectClass ? 'sessions' : 'list');

    // Nếu vào thẳng, khởi tạo selectedClass tạm thời bằng info có sẵn
    const [selectedClass, setSelectedClass] = useState<any>(isDirectClass ? { id: courseId, className: courseTitle } : null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [courseDuration, setCourseDuration] = useState<number>(0);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [pts, setPts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedTeacherData, setSelectedTeacherData] = useState<any>(null);

    const today = new Date().toISOString().split('T')[0];

    const [newClass, setNewClass] = useState({
        className: '', teacherId: '', teacherName: '',
        ptId: '', ptName: '', studentId: '', studentName: '',
        startDate: '', zoomLink: '', status: 'Đang mở'
    });

    useEffect(() => {
        // Trường hợp Giảng viên (Vào thẳng lớp)
        if (isDirectClass && courseId) {
            getDoc(doc(db, "classes", courseId)).then(snap => {
                if (snap.exists()) setSelectedClass({ id: snap.id, ...snap.data() });
            });
        }

        // Trường hợp Admin (Cần thông tin khóa học và danh sách lớp)
        if (!isDirectClass) {
            getDoc(doc(db, "courses", courseId)).then(snap => {
                if (snap.exists()) setCourseDuration(snap.data().duration || 0);
            });
            const unsub = onSnapshot(query(collection(db, "classes"), where("courseId", "==", courseId)), (snap) => {
                setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }

        // Chung cho cả 2
        onSnapshot(query(collection(db, "staffs"), where("position", "==", "teacher")), (s) => setTeachers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        onSnapshot(query(collection(db, "leads"), where("status", "==", "ĐÃ NHẬP HỌC")), (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [courseId, isDirectClass]);

    useEffect(() => {
        if (selectedClass?.teacherId) {
            getDoc(doc(db, "staffs", selectedClass.teacherId)).then(s => s.exists() && setSelectedTeacherData(s.data()));
        }
    }, [selectedClass]);

    useEffect(() => {
        if (view === 'sessions' && selectedClass?.id) {
            const q = query(collection(db, "sessions"), where("classId", "==", selectedClass.id), orderBy("date", "asc"));
            const unsub = onSnapshot(q, (snap) => {
                setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsub();
        }
    }, [view, selectedClass?.id]);

    const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
        await updateDoc(doc(db, "sessions", sessionId), { status });
    };

    const handleGoBack = () => {
        if (isDirectClass) onBack(); // Teacher về sảnh Card
        else setView('list'); // Admin về sảnh Bảng
    };

    const attendedCount = sessions.filter(s => s.status === 'Đã điểm danh').length;
    const absentCount = sessions.filter(s => s.status === 'Vắng').length;
    const totalDone = attendedCount + absentCount;
    const isWarning = absentCount >= 2;

    if (view === 'sessions' && selectedClass) {
        return (
            <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={handleGoBack} className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-slate-100 transition-all"><ArrowLeft size={20}/></button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">{selectedClass.className}</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Tiến độ: {totalDone}/{selectedClass.totalSessions || 45} buổi đã học & vắng</p>
                    </div>
                </div>

                {isWarning && (
                    <div className="mb-6 bg-red-500 text-white p-5 rounded-[2rem] shadow-xl flex items-center gap-4 animate-bounce">
                        <AlertTriangle size={28} />
                        <p className="text-sm font-black uppercase tracking-tight">Cảnh báo: Học viên vắng {absentCount} buổi. Cần liên hệ hỗ trợ!</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><User size={30}/></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học viên</p><p className="font-black text-slate-800 text-xl tracking-tight">{selectedClass.studentName || 'Đang tải...'}</p></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><UserCheck size={20}/></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">Giảng viên</p><p className="font-bold text-slate-700 text-sm">{selectedClass.teacherName}</p></div>
                                </div>
                                <a href={selectedClass.zoomLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-2xl transition-all group border border-blue-100">
                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-white/20"><Video size={20}/></div><div><p className="text-[9px] font-black uppercase opacity-60">Phòng Zoom</p><p className="font-bold text-sm">Vào lớp học</p></div></div>
                                    <ExternalLink size={16} />
                                </a>
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/booking/${selectedClass.id}`); alert("Đã copy link!"); }} className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-2xl transition-all group border border-orange-100">
                                    <div className="flex items-center gap-3"><div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center group-hover:bg-white/20"><LinkIcon size={20}/></div><div><p className="text-[9px] font-black uppercase opacity-60">Link Chọn Lịch</p><p className="font-bold text-sm">Gửi cho Học viên</p></div></div>
                                    <Copy size={16} />
                                </button>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 italic"><Clock size={12}/> Lịch rảnh của GV:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTeacherData?.fixedSchedule?.map((day: string) => <span key={day} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black rounded-lg border border-slate-100 uppercase">{day}</span>) || <span className="text-[10px] italic text-slate-400">N/A</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><FileText size={18} className="text-orange-500"/> Lộ trình đào tạo</h3>
                                <div className="flex gap-4 font-black text-[10px] uppercase"><span className="text-emerald-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Học: {attendedCount}</span><span className="text-red-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Vắng: {absentCount}</span></div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {sessions.map((s, index) => {
                                    const isToday = s.date === today;
                                    const isLocked = s.date !== today;
                                    return (
                                        <div key={s.id} className={`p-6 flex items-center justify-between transition-colors ${isToday ? 'bg-orange-50/30' : ''}`}>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border transition-all ${isToday ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-200'}`}><span className={`text-[8px] font-black uppercase ${isToday ? 'text-white/70' : 'text-slate-400'}`}>Buổi</span><span className="text-xl font-black">{index + 1}</span></div>
                                                <div>
                                                    <p className={`font-black uppercase text-sm ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>{s.date} {isToday && "• HÔM NAY"}</p>
                                                    {s.status === 'Chưa diễn ra' ? (
                                                        <div className="mt-2 flex gap-2">
                                                            <button disabled={isLocked} onClick={() => handleUpdateSessionStatus(s.id, 'Đã điểm danh')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isLocked ? 'bg-slate-50 text-slate-300' : 'bg-emerald-500 text-white shadow-lg active:scale-95'}`}>Điểm danh</button>
                                                            <button disabled={isLocked} onClick={() => handleUpdateSessionStatus(s.id, 'Vắng')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isLocked ? 'bg-slate-50 text-slate-300' : 'bg-red-500 text-white shadow-lg active:scale-95'}`}>Báo vắng</button>
                                                            {isLocked && <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 italic"><Info size={10}/> {s.date < today ? "Quá hạn" : "Chưa tới ngày"}</span>}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 flex items-center gap-3">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${s.status === 'Đã điểm danh' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{s.status}</span>
                                                            {isToday && <button onClick={() => handleUpdateSessionStatus(s.id, 'Chưa diễn ra')} className="p-1 text-slate-400 hover:text-orange-500 transition-colors"><Trash2 size={14} /></button>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {s.status !== 'Chưa diễn ra' && <CheckCircle2 className={s.status === 'Đã điểm danh' ? 'text-emerald-500' : 'text-red-500'} size={24} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-slate-100 transition-all"><ArrowLeft size={20}/></button>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Lớp 1-1: {courseTitle}</h2>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-600 flex items-center gap-2 transition-all active:scale-95"><Plus size={20} /> Mở lớp mới</button>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead><tr className="bg-slate-50/50 border-b border-slate-100"><th className="p-6 text-[10px] font-black uppercase text-slate-400">Lớp & Khai giảng</th><th className="p-6 text-[10px] font-black uppercase text-slate-400">Học viên</th><th className="p-6 text-[10px] font-black uppercase text-slate-400">Giảng viên</th><th className="p-6 text-center text-[10px] font-black uppercase text-slate-400">Thao tác</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                    {classes.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-6"><p className="font-black text-slate-800 uppercase text-sm">{cls.className}</p><p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">{cls.startDate}</p></td>
                            <td className="p-6"><span className="font-bold text-slate-700">{cls.studentName}</span></td>
                            <td className="p-6"><span className="text-xs font-black text-slate-800 flex items-center gap-1 uppercase"><UserCheck size={14} className="text-emerald-500"/> {cls.teacherName}</span></td>
                            <td className="p-6">
                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/booking/${cls.id}`); alert("Đã copy link!"); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><LinkIcon size={18}/></button>
                                    <button onClick={() => { setSelectedClass(cls); setView('sessions'); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 text-[10px] font-black uppercase flex items-center gap-2 transition-all">Chi tiết <ChevronRight size={14}/></button>
                                    <button onClick={() => { if(window.confirm("Xóa lớp học này?")) deleteDoc(doc(db, "classes", cls.id)) }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            {/* Modal bỏ qua ở bản này cho gọn */}
        </div>
    );
};

export default ClassManagement;