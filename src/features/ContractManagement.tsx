import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
    User, UserCheck, GraduationCap, Plus, ArrowLeft, X, 
    Calendar as CalendarIcon, Eye, Trash2, Search, ChevronRight
} from 'lucide-react';
import SessionManagement from './SessionManagement';

interface ClassManagementProps {
    courseId: string;
    courseTitle: string;
    onBack: () => void;
}

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const ClassManagement = ({ courseId, courseTitle, onBack }: ClassManagementProps) => {
    const [view, setView] = useState<'list' | 'session'>('list');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeClass, setActiveClass] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Dữ liệu hỗ trợ nhân sự
    const [teachers, setTeachers] = useState<any[]>([]);
    const [pts, setPts] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [newClass, setNewClass] = useState({
        className: '', teacherId: '', teacherName: '',
        ptId: '', ptName: '', studentId: '', studentName: '',
        startDate: '', studyDay: 'Thứ 2', status: 'Đang mở'
    });

    useEffect(() => {
        const qClasses = query(collection(db, "classes"), where("courseId", "==", courseId));
        const unsub = onSnapshot(qClasses, (snap) => setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        onSnapshot(query(collection(db, "staffs"), where("position", "==", "teacher")), (s) => setTeachers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        onSnapshot(query(collection(db, "staffs"), where("position", "==", "pt")), (s) => setPts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        onSnapshot(query(collection(db, "leads"), where("status", "==", "ĐÃ NHẬP HỌC")), (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => unsub();
    }, [courseId]);

    // HÀM TẠO LỚP & TỰ ĐỘNG TẠO 4 BUỔI HỌC ĐẦU TIÊN (1 THÁNG)
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const docRef = await addDoc(collection(db, "classes"), { 
                ...newClass, courseId, courseTitle, createdAt: serverTimestamp() 
            });

            // Tự động tạo lộ trình 1 tháng (4 buổi) cách nhau 7 ngày
            const baseDate = new Date(newClass.startDate);
            for (let i = 1; i <= 4; i++) {
                const sessionDate = new Date(baseDate);
                sessionDate.setDate(baseDate.getDate() + (i - 1) * 7);
                
                await addDoc(collection(db, "sessions"), {
                    classId: docRef.id,
                    sessionNumber: i,
                    date: sessionDate.toISOString().split('T')[0],
                    status: 'Chưa diễn ra',
                    createdAt: serverTimestamp()
                });
            }

            setShowCreateModal(false);
            setNewClass({ className: '', teacherId: '', teacherName: '', ptId: '', ptName: '', studentId: '', studentName: '', startDate: '', studyDay: 'Thứ 2', status: 'Đang mở' });
        } catch (error) { 
            alert("Lỗi khi tạo lớp học!"); 
        }
    };

    if (view === 'session' && activeClass) {
        return <SessionManagement classData={activeClass} onBack={() => setView('list')} />;
    }

    return (
        <div className="p-8 bg-slate-50 min-h-screen relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-5">
                    <button onClick={onBack} className="p-3.5 bg-white text-orange-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-orange-50 transition-all">
                        <ArrowLeft size={22}/>
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none mb-1">Quản lý Lớp 1-1</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-80">Khóa học: {courseTitle}</p>
                    </div>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-orange-500 text-white px-7 py-4 rounded-[1.5rem] font-black shadow-2xl shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95 flex items-center gap-3">
                    <Plus size={20} /> MỞ LỚP MỚI
                </button>
            </div>

            {/* DANH SÁCH LỚP HỌC (LIST VIEW) */}
            <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="p-8 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Thông tin Lớp / Ngày học</th>
                            <th className="p-8 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Học viên (1-1)</th>
                            <th className="p-8 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Giảng viên & Trợ giảng</th>
                            <th className="p-8 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Trạng thái</th>
                            <th className="p-8 text-right text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {classes.map((cls) => (
                            <tr 
                                key={cls.id} 
                                onDoubleClick={() => { setActiveClass(cls); setView('session'); }}
                                className="hover:bg-orange-50/30 transition-all group cursor-pointer active:bg-orange-100/30"
                            >
                                <td className="p-8">
                                    <p className="font-black text-slate-800 text-lg tracking-tight mb-2 uppercase">{cls.className}</p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-200">
                                        <CalendarIcon size={12}/> {cls.studyDay} (Từ {cls.startDate})
                                    </div>
                                </td>
                                <td className="p-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center font-black text-xs border border-blue-100 shadow-inner">{cls.studentName.charAt(0)}</div>
                                        <span className="font-bold text-slate-700 tracking-tight text-base">{cls.studentName}</span>
                                    </div>
                                </td>
                                <td className="p-8">
                                    <div className="flex flex-col">
                                        {/* TÊN GIẢNG VIÊN TO NHẤT */}
                                        <span className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1.5 flex items-center gap-2 uppercase">
                                            <UserCheck size={18} className="text-emerald-500"/> {cls.teacherName}
                                        </span>
                                        {/* TÊN PT NHỎ NHẤT & IN NGHIÊNG */}
                                        <span className="text-[11px] font-bold text-slate-400 italic opacity-80 flex items-center gap-1 pl-6">
                                            Trợ giảng: {cls.ptName || '---'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-8 text-center md:text-left">
                                    <span className={`px-4 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-[0.15em] border-2 ${cls.status === 'Đang mở' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                        {cls.status}
                                    </span>
                                </td>
                                <td className="p-8 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => { setActiveClass(cls); setView('session'); }} className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-orange-600 transition-all"><ChevronRight size={20}/></button>
                                        <button onClick={async () => { if(window.confirm("Xóa lớp học?")) await deleteDoc(doc(db,"classes",cls.id)) }} className="p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"><Trash2 size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {classes.length === 0 && <div className="p-32 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-50">Hệ thống chưa ghi nhận lớp học nào.</div>}
            </div>

            {/* MODAL TẠO LỚP MỚI */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-[110] p-4 transition-all">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
                        <div className="p-10 bg-orange-500 text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                            <GraduationCap className="absolute -right-6 -bottom-6 text-white/10 rotate-12" size={120}/>
                            <div className="relative">
                                <h3 className="text-3xl font-black italic tracking-tighter mb-1 uppercase">Mở lớp học 1-1</h3>
                                <p className="text-xs font-bold text-orange-100 opacity-80 uppercase tracking-widest">Thiết lập lộ trình cá nhân hóa</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="hover:rotate-90 transition-all p-3 bg-white/20 rounded-2xl border border-white/30"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateClass} className="p-10 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên lớp học / Mã định danh *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-orange-500/20 text-slate-800 transition-all" placeholder="VD: IELTS 1-1 NGUYỄN VĂN A" value={newClass.className} onChange={e => setNewClass({...newClass, className: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Giảng viên hướng dẫn</label>
                                    <select required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-emerald-50 focus:border-emerald-500/20 text-slate-700" onChange={e => {
                                        const t = teachers.find(x => x.id === e.target.value);
                                        setNewClass({...newClass, teacherId: t.id, teacherName: t.name});
                                    }}>
                                        <option value="">-- Chọn giáo viên --</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trợ giảng (PT)</label>
                                    <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-orange-500/20 text-slate-700" onChange={e => {
                                        const p = pts.find(x => x.id === e.target.value);
                                        setNewClass({...newClass, ptId: p.id, ptName: p.name});
                                    }}>
                                        <option value="">-- Không có PT --</option>
                                        {pts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-blue-600">Học viên chính (1-1)</label>
                                <select required className="w-full px-6 py-4 bg-blue-50/50 text-blue-600 rounded-2xl font-black outline-none border-2 border-blue-100 hover:border-blue-300 transition-all" onChange={e => {
                                    const s = students.find(x => x.id === e.target.value);
                                    setNewClass({...newClass, studentId: s.id, studentName: s.name});
                                }}>
                                    <option value="">-- Chọn học viên đã nhập học --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thứ học định kỳ hàng tuần</label>
                                    <select className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-orange-500/20" value={newClass.studyDay} onChange={e => setNewClass({...newClass, studyDay: e.target.value})}>
                                        {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày bắt đầu khóa học</label>
                                    <input type="date" required className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-orange-500/20" value={newClass.startDate} onChange={e => setNewClass({...newClass, startDate: e.target.value})} />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-orange-500/30 hover:bg-orange-600 transition-all mt-6 uppercase tracking-[0.2em] text-lg active:scale-95">XÁC NHẬN MỞ LỚP</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;