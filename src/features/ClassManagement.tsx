import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection, query, where, onSnapshot, addDoc, deleteDoc,
    doc, updateDoc, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import {
    User, UserCheck, Plus, ArrowLeft, X,
    Trash2, Clock, ChevronRight, FileText, Video, Link as LinkIcon,
    ExternalLink, Copy, CheckCircle2, AlertTriangle, Info, Calendar as CalendarIcon
} from 'lucide-react';

interface ClassManagementProps {
    courseId: string;
    courseTitle: string;
    isDirectClass?: boolean;
    onBack: () => void;
}

const ClassManagement = ({ courseId, courseTitle, isDirectClass, onBack }: ClassManagementProps) => {
    const [view, setView] = useState<'list' | 'sessions'>(isDirectClass ? 'sessions' : 'list');
    const [selectedClass, setSelectedClass] = useState<any>(isDirectClass ? { id: courseId, className: courseTitle } : null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [courseDuration, setCourseDuration] = useState<number>(0);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [selectedTeacherData, setSelectedTeacherData] = useState<any>(null);

    // NGÀY HÔM NAY ĐỂ SO SÁNH (Dùng cho logic khóa nút)
    const today = new Date().toISOString().split('T')[0];

    const [newClass, setNewClass] = useState({
        className: '', teacherId: '', teacherName: '',
        studentId: '', studentName: '',
        startDate: '', zoomLink: '', status: 'Đang mở'
    });

    useEffect(() => {
        if (isDirectClass && courseId) {
            getDoc(doc(db, "classes", courseId)).then(snap => {
                if (snap.exists()) setSelectedClass({ id: snap.id, ...snap.data() });
            });
        }
        if (!isDirectClass) {
            getDoc(doc(db, "courses", courseId)).then(snap => {
                if (snap.exists()) setCourseDuration(snap.data().duration || 0);
            });
            onSnapshot(query(collection(db, "classes"), where("courseId", "==", courseId)), (snap) => setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "staffs"), where("position", "==", "teacher")), (s) => setTeachers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
            onSnapshot(query(collection(db, "leads"), where("status", "==", "ĐÃ NHẬP HỌC")), (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        }
    }, [courseId, isDirectClass]);

    useEffect(() => {
        if (selectedClass?.id) {
            onSnapshot(query(collection(db, "sessions"), where("classId", "==", selectedClass.id), orderBy("date", "asc")), (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            if (selectedClass.teacherId) getDoc(doc(db, "staffs", selectedClass.teacherId)).then(s => s.exists() && setSelectedTeacherData(s.data()));
        }
    }, [selectedClass?.id]);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "classes"), { ...newClass, courseId, courseTitle, totalSessions: courseDuration, createdAt: serverTimestamp() });
            setShowCreateModal(false);
            setNewClass({ className: '', teacherId: '', teacherName: '', studentId: '', studentName: '', startDate: '', zoomLink: '', status: 'Đang mở' });
            alert("Mở lớp học thành công!");
        } catch (e) { alert("Lỗi!"); }
    };

    const handleUpdateStatus = async (sid: string, status: string) => {
        await updateDoc(doc(db, "sessions", sid), { status });
    };

    // LOGIC COPY LINK CHỌN LỊCH (Đường dẫn nằm ở đây)
    const copyBookingLink = (id: string) => {
        const link = `${window.location.origin}/booking/${id}`;
        navigator.clipboard.writeText(link);
        alert("Đã copy link chọn lịch gửi cho học viên!");
    };

    // TÍNH TOÁN TIẾN ĐỘ
    const attendedCount = sessions.filter(s => s.status === 'Đã điểm danh').length;
    const absentCount = sessions.filter(s => s.status === 'Vắng').length;
    const isWarning = absentCount >= 2;

    // --- PHẦN RENDER SESSIONS (CHI TIẾT LỚP HỌC) ---
    if (view === 'sessions' && selectedClass) {
        return (
            <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in slide-in-from-right duration-300">
                {/* Header trang chi tiết */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => isDirectClass ? onBack() : setView('list')} className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-slate-100 transition-all">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase italic font-sans tracking-tight">{selectedClass.className}</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">
                            Tiến độ: <span className="text-orange-600">{attendedCount + absentCount}/{selectedClass.totalSessions || 45}</span> buổi đã học & vắng
                        </p>
                    </div>
                </div>

                {/* Banner cảnh báo vắng >= 2 buổi */}
                {isWarning && (
                    <div className="mb-6 bg-red-500 text-white p-5 rounded-[2rem] shadow-xl flex items-center gap-4 animate-bounce">
                        <AlertTriangle size={28} />
                        <p className="text-sm font-black uppercase tracking-tight font-sans">Cảnh báo: Học viên vắng {absentCount} buổi. Cần liên hệ hỗ trợ ngay!</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cột trái: Thông tin nhân sự & Link */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6 font-sans">
                            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><User size={30}/></div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HỌC VIÊN</p><p className="font-black text-slate-800 text-xl tracking-tight">{selectedClass.studentName || '...'}</p></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><UserCheck size={20}/></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">GIẢNG VIÊN</p><p className="font-bold text-slate-700 text-sm">{selectedClass.teacherName}</p></div>
                                </div>
                                <a href={selectedClass.zoomLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-2xl transition-all group border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors"><Video size={20}/></div>
                                        <div><p className="text-[9px] font-black uppercase opacity-60">PHÒNG ZOOM</p><p className="font-bold text-sm">Vào lớp học</p></div>
                                    </div>
                                    <ExternalLink size={16} />
                                </a>
                                <button onClick={() => copyBookingLink(selectedClass.id)} className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-2xl transition-all group border border-orange-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors"><LinkIcon size={20}/></div>
                                        <div><p className="text-[9px] font-black uppercase opacity-60">LỊCH CHỌN</p><p className="font-bold text-sm">Gửi link cho HV</p></div>
                                    </div>
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: Danh sách buổi học */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden font-sans">
                            <div className="p-6 border-b border-slate-50 flex justify-between bg-slate-50/30 font-black text-xs uppercase text-slate-800 italic tracking-widest items-center">
                                <div className="flex items-center gap-2"><FileText size={18} className="text-orange-500"/> LỘ TRÌNH ĐÀO TẠO</div>
                                <div className="flex gap-4">
                                    <span className="text-emerald-500">HỌC: {attendedCount}</span>
                                    <span className="text-red-500">VẮNG: {absentCount}</span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {sessions.map((s, idx) => {
                                    const isToday = s.date === today;
                                    const isLocked = s.date !== today;
                                    const isPast = s.date < today;

                                    return (
                                        <div key={s.id} className={`p-6 flex items-center justify-between transition-colors ${isToday ? 'bg-orange-50/40' : ''}`}>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border transition-all ${isToday ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white border-slate-200'}`}>
                                                    <span className={`text-[8px] font-black uppercase ${isToday ? 'text-white/70' : 'text-slate-400'}`}>Buổi</span>
                                                    <span className="text-xl font-black">{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <p className={`font-black uppercase text-sm ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>
                                                        {s.date} {isToday && <span className="bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse ml-2">HÔM NAY</span>}
                                                    </p>
                                                    {s.status === 'Chưa diễn ra' ? (
                                                        <div className="mt-2 flex gap-2">
                                                            <button
                                                                disabled={isLocked}
                                                                onClick={() => handleUpdateStatus(s.id, 'Đã điểm danh')}
                                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isLocked ? 'bg-slate-50 text-slate-300' : 'bg-emerald-500 text-white shadow-lg active:scale-95'}`}
                                                            >
                                                                Điểm danh
                                                            </button>
                                                            <button
                                                                disabled={isLocked}
                                                                onClick={() => handleUpdateStatus(s.id, 'Vắng')}
                                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isLocked ? 'bg-slate-50 text-slate-300' : 'bg-red-500 text-white shadow-lg active:scale-95'}`}
                                                            >
                                                                Báo vắng
                                                            </button>
                                                            {isLocked && <span className="text-[8px] font-bold text-slate-400 italic flex items-center gap-1 ml-1"><Info size={10}/> {isPast ? "Quá hạn" : "Chưa tới ngày"}</span>}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 flex items-center gap-3">
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${s.status === 'Đã điểm danh' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                                {s.status}
                                                            </span>
                                                            {/* Chỉ cho Reset nếu là ngày hôm nay */}
                                                            {isToday && (
                                                                <button onClick={() => handleUpdateStatus(s.id, 'Chưa diễn ra')} className="p-1 text-slate-400 hover:text-orange-500 transition-colors" title="Hoàn tác để sửa">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {s.status !== 'Chưa diễn ra' && <CheckCircle2 className={s.status === 'Đã điểm danh' ? 'text-emerald-500' : s.status === 'Vắng' ? 'text-red-500' : 'text-slate-100'} size={24} />}
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

    // --- VIEW DANH SÁCH LỚP (GIỮ NGUYÊN) ---
    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl shadow-sm border border-slate-100 transition-all"><ArrowLeft size={20}/></button>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Lớp 1-1: {courseTitle}</h2>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-600 flex items-center gap-2 active:scale-95 transition-all">+ Mở lớp mới</button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead><tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest"><th className="p-6">LỚP & KHAI GIẢNG</th><th className="p-6">HỌC VIÊN</th><th className="p-6">GIẢNG VIÊN</th><th className="p-6 text-center">THAO TÁC</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                    {classes.map((cls) => (
                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-6"><p className="font-black text-slate-800 uppercase text-sm leading-tight">{cls.className}</p><p className="text-[10px] text-slate-400 font-bold mt-1 italic uppercase tracking-widest flex items-center gap-1"><CalendarIcon size={12}/> {cls.startDate}</p></td>
                            <td className="p-6 font-bold text-slate-700">{cls.studentName}</td>
                            <td className="p-6 font-black text-xs text-slate-800 uppercase flex items-center gap-2 mt-4"><UserCheck size={14} className="text-emerald-500"/> {cls.teacherName}</td>
                            <td className="p-6">
                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => copyBookingLink(cls.id)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Gửi link cho HV"><LinkIcon size={18}/></button>
                                    <button onClick={() => { setSelectedClass(cls); setView('sessions'); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-md">Chi tiết <ChevronRight size={14}/></button>
                                    <button onClick={() => { if(window.confirm("Xóa lớp học?")) deleteDoc(doc(db, "classes", cls.id)) }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL MỞ LỚP HỌC (GIỮ NGUYÊN NHƯ BẢN TRƯỚC) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 font-sans">
                        <div className="p-8 bg-orange-500 text-white flex justify-between items-center shadow-lg">
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter">MỞ LỚP HỌC 1-1</h3>
                            <button onClick={() => setShowCreateModal(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-2xl"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleCreateClass} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">TÊN LỚP (MÃ LỚP) *</label><input required className="w-full px-6 py-5 bg-slate-50 rounded-[1.2rem] font-bold border-2 border-transparent focus:border-orange-500/20 outline-none" value={newClass.className} onChange={e => setNewClass({...newClass, className: e.target.value})} placeholder="VD: IELTS-101-NGOC" /></div>
                            <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">HỌC VIÊN ĐĂNG KÝ (1-1) *</label><select required className="w-full px-6 py-5 bg-blue-50/30 text-blue-600 rounded-[1.2rem] font-black border-2 border-blue-100/50 outline-none cursor-pointer" onChange={e => { const s = students.find(x => x.id === e.target.value); setNewClass({...newClass, studentId: s.id, studentName: s.name}); }}><option value="">-- Chọn học viên --</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}</select></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">GIẢNG VIÊN HƯỚNG DẪN</label><select required className="w-full px-6 py-5 bg-slate-50 rounded-[1.2rem] font-bold outline-none" onChange={e => { const t = teachers.find(x => x.id === e.target.value); setNewClass({...newClass, teacherId: t.id, teacherName: t.name}); }}><option value="">-- Chọn GV --</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">NGÀY KHAI GIẢNG DỰ KIẾN</label><input type="date" required className="w-full px-6 py-5 bg-slate-50 rounded-[1.2rem] font-black" value={newClass.startDate} onChange={e => setNewClass({...newClass, startDate: e.target.value})} /></div></div>
                            <div className="space-y-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">LINK PHÒNG ZOOM CỐ ĐỊNH *</label><input required className="w-full px-6 py-5 bg-blue-50/20 text-blue-700 rounded-[1.2rem] font-bold outline-none" value={newClass.zoomLink} onChange={e => setNewClass({...newClass, zoomLink: e.target.value})} placeholder="https://zoom.us/j/..." /></div>
                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-6 rounded-[1.5rem] shadow-xl uppercase tracking-[0.2em] text-xl mt-4 active:scale-95 transition-all">XÁC NHẬN TẠO LỚP</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;