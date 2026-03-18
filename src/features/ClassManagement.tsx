import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { 
    User, UserCheck, GraduationCap, Plus, ArrowLeft, X, 
    Calendar as CalendarIcon, Eye, Trash2, Search, CheckCircle2, Clock, ChevronRight, FileText
} from 'lucide-react';

interface ClassManagementProps {
    courseId: string;
    courseTitle: string;
    onBack: () => void;
}

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const ClassManagement = ({ courseId, courseTitle, onBack }: ClassManagementProps) => {
    const [view, setView] = useState<'list' | 'sessions'>('list');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    const [classes, setClasses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [courseDuration, setCourseDuration] = useState<number>(0); // Lưu số lượng buổi học của khóa
    
    const [teachers, setTeachers] = useState<any[]>([]);
    const [pts, setPts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [newClass, setNewClass] = useState({
        className: '', 
        teacherId: '', teacherName: '',
        ptId: '', ptName: '', 
        studentId: '', studentName: '', 
        startDate: '',
        studyDay: 'Thứ 2',
        status: 'Đang mở'
    });

    // 1. Fetch dữ liệu cơ bản và lấy Duration của khóa học
    useEffect(() => {
        // Lấy thông tin course để có duration
        const getCourseInfo = async () => {
            const courseDoc = await getDoc(doc(db, "courses", courseId));
            if (courseDoc.exists()) {
                setCourseDuration(courseDoc.data().duration || 0);
            }
        };
        getCourseInfo();

        const qClasses = query(collection(db, "classes"), where("courseId", "==", courseId));
        const unsubClasses = onSnapshot(qClasses, (snap) => setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        onSnapshot(query(collection(db, "staffs"), where("position", "==", "teacher")), (s) => setTeachers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        onSnapshot(query(collection(db, "staffs"), where("position", "==", "pt")), (s) => setPts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        onSnapshot(query(collection(db, "leads"), where("status", "==", "ĐÃ NHẬP HỌC")), (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => unsubClasses();
    }, [courseId]);

    // 2. Lấy danh sách buổi học khi vào view sessions
    useEffect(() => {
        if (view === 'sessions' && selectedClass) {
            const q = query(collection(db, "sessions"), where("classId", "==", selectedClass.id), orderBy("sessionNumber", "asc"));
            const unsubSessions = onSnapshot(q, (snap) => setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsubSessions();
        }
    }, [view, selectedClass]);

    // 3. Logic Tạo lớp và Tự động tạo list buổi học theo Duration
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (courseDuration <= 0) return alert("Khóa học này chưa thiết lập số buổi học (duration)!");

        try {
            // Bước A: Tạo document Lớp học
            const classDocRef = await addDoc(collection(db, "classes"), { 
                ...newClass, 
                courseId, 
                courseTitle, 
                totalSessions: courseDuration,
                createdAt: serverTimestamp() 
            });

            // Bước B: Tạo tự động các buổi học (Sessions)
            const start = new Date(newClass.startDate);
            for (let i = 0; i < courseDuration; i++) {
                const sessionDate = new Date(start);
                sessionDate.setDate(start.getDate() + (i * 7)); // Mỗi buổi cách nhau đúng 7 ngày

                await addDoc(collection(db, "sessions"), {
                    classId: classDocRef.id,
                    sessionNumber: i + 1,
                    date: sessionDate.toISOString().split('T')[0],
                    status: 'Chưa diễn ra',
                    createdAt: serverTimestamp()
                });
            }

            setShowCreateModal(false);
            setNewClass({ className: '', teacherId: '', teacherName: '', ptId: '', ptName: '', studentId: '', studentName: '', startDate: '', studyDay: 'Thứ 2', status: 'Đang mở' });
            alert(`Đã tạo lớp và tự động thiết lập ${courseDuration} buổi học thành công!`);
        } catch (error) { 
            console.error(error);
            alert("Lỗi khi tạo lớp và lộ trình học!"); 
        }
    };

    const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
        await updateDoc(doc(db, "sessions", sessionId), { status });
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Xóa lớp học này sẽ xóa toàn bộ lộ trình liên quan. Tiếp tục?")) await deleteDoc(doc(db, "classes", id));
    };

    // --- VIEW QUẢN LÝ BUỔI HỌC ---
    if (view === 'sessions' && selectedClass) {
        return (
            <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setView('list')} className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl shadow-sm transition-all border border-slate-100">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Lộ trình học tập 1-1</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-tighter italic">Lớp: <span className="text-orange-600">{selectedClass.className}</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><GraduationCap size={30}/></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học viên</p>
                                    <p className="font-black text-slate-800 text-xl tracking-tight">{selectedClass.studentName}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><UserCheck size={20}/></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">Giảng viên</p><p className="font-bold text-slate-700 text-sm">{selectedClass.teacherName}</p></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><Clock size={20}/></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">Lịch học</p><p className="font-bold text-slate-700 text-sm">{selectedClass.studyDay} hàng tuần</p></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center italic font-black text-[10px]">PT</div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">Quản lý lớp</p><p className="font-bold text-slate-500 text-sm">{selectedClass.ptName || '---'}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest"><FileText size={18} className="text-orange-500"/> Danh sách {sessions.length} buổi học</h3>
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã học: {sessions.filter(s => s.status === 'Đã điểm danh').length}
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {sessions.map((s) => (
                                    <div key={s.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                                                <span className="text-[8px] font-black text-slate-400 uppercase">Buổi</span>
                                                <span className="text-xl font-black text-slate-800 leading-tight">{s.sessionNumber}</span>
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-700 flex items-center gap-2 tracking-tight italic uppercase text-sm">
                                                    <CalendarIcon size={14} className="text-orange-500"/> {s.date}
                                                </p>
                                                <div className="mt-2 flex gap-2">
                                                    <button onClick={() => handleUpdateSessionStatus(s.id, 'Đã điểm danh')}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${s.status === 'Đã điểm danh' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                                                        Có mặt
                                                    </button>
                                                    <button onClick={() => handleUpdateSessionStatus(s.id, 'Vắng')}
                                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${s.status === 'Vắng' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600'}`}>
                                                        Vắng
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${s.status === 'Đã điểm danh' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s.status === 'Vắng' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW DANH SÁCH LỚP ---
    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-white hover:bg-orange-50 text-orange-600 rounded-2xl shadow-sm transition-all border border-slate-100"><ArrowLeft size={20}/></button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Danh sách lớp học 1-1</h2>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-tighter italic">Khóa học: <span className="text-orange-600">{courseTitle}</span></p>
                    </div>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center gap-2">
                    <Plus size={20} /> Tạo lớp mới
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Lớp & Ngày khai giảng</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Lịch học định kỳ</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Học viên 1-1</th>
                            <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Giảng viên / PT</th>
                            <th className="p-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {classes.map((cls) => (
                            <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-6">
                                    <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{cls.className}</p>
                                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1 uppercase"><CalendarIcon size={12} className="text-orange-500"/> {cls.startDate}</p>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-600 rounded-lg w-fit border border-orange-100">
                                        <Clock size={14}/><span className="text-[10px] font-black uppercase tracking-widest">{cls.studyDay}</span>
                                    </div>
                                </td>
                                <td className="p-6"><span className="font-bold text-slate-700">{cls.studentName}</span></td>
                                <td className="p-6">
                                    <div className="flex flex-col"><span className="text-xs font-black text-slate-800 flex items-center gap-1 uppercase"><UserCheck size={14} className="text-emerald-500"/> {cls.teacherName}</span><span className="text-[10px] text-slate-400 font-bold opacity-60">PT: {cls.ptName || '---'}</span></div>
                                </td>
                                <td className="p-6">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setSelectedClass(cls); setView('sessions'); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-orange-600 transition-all text-[10px] font-black uppercase flex items-center gap-2">Chi tiết <ChevronRight size={14}/></button>
                                        <button onClick={() => handleDelete(cls.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL TẠO LỚP */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-orange-500 text-white flex justify-between items-center">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase">Mở lớp học 1-1</h3>
                            <button onClick={() => setShowCreateModal(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-2xl"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateClass} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Lớp (Mã lớp) *</label>
                                <input required className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500/20 text-slate-800" value={newClass.className} onChange={e => setNewClass({...newClass, className: e.target.value})} />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Học viên chính (1-1) *</label>
                                <select required className="w-full px-5 py-4 bg-blue-50/50 text-blue-600 rounded-2xl font-black outline-none border-2 border-blue-100 appearance-none" onChange={e => { const s = students.find(x => x.id === e.target.value); setNewClass({...newClass, studentId: s.id, studentName: s.name}); }}>
                                    <option value="">-- Chọn học viên --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Giảng viên hướng dẫn</label>
                                <select required className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-emerald-500/20 text-slate-700" onChange={e => { const t = teachers.find(x => x.id === e.target.value); setNewClass({...newClass, teacherId: t.id, teacherName: t.name}); }}>
                                    <option value="">-- Chọn GV --</option>
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trợ giảng (PT)</label>
                                <select className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500/20 text-slate-700" onChange={e => { const p = pts.find(x => x.id === e.target.value); setNewClass({...newClass, ptId: p.id, ptName: p.name}); }}>
                                    <option value="">-- Không có --</option>
                                    {pts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-orange-500"><Clock size={12} className="inline mr-1"/> Thứ học</label>
                                <select className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black outline-none" value={newClass.studyDay} onChange={e => setNewClass({...newClass, studyDay: e.target.value})}>
                                    {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1"><CalendarIcon size={12} className="inline mr-1"/> Ngày khai giảng</label>
                                <input type="date" required className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black outline-none" value={newClass.startDate} onChange={e => setNewClass({...newClass, startDate: e.target.value})} />
                            </div>
                            <button type="submit" className="md:col-span-2 bg-orange-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl hover:bg-orange-600 transition-all mt-4 uppercase tracking-[0.2em] text-lg active:scale-95">Xác nhận tạo lớp</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;