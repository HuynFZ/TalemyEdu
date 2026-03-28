// --- FILE: src/features/ClassManagement.tsx ---
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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
    // --- 1. STATES ---
    const [view, setView] = useState<'list' | 'sessions'>(isDirectClass ? 'sessions' : 'list');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [courseDuration, setCourseDuration] = useState<number>(0);

    const today = new Date().toISOString().split('T')[0];

    // Form nạp đầy đủ các trường cũ
    const [newClass, setNewClass] = useState({
        class_name: '',
        teacher_id: '',
        teacher_name: '',
        student_id: '',
        student_name: '',
        start_date: '',
        zoom_link: '',
        status: 'Đang mở'
    });

    // --- 2. EFFECTS (DATA FETCHING) ---
    useEffect(() => {
        const fetchInitialData = async () => {
            // Lấy thời lượng khóa học để làm mặc định cho số buổi của lớp
            const { data: courseData } = await supabase.from('courses').select('duration').eq('id', courseId).single();
            if (courseData) setCourseDuration(courseData.duration);

            if (isDirectClass) {
                const { data } = await supabase.from('classes').select('*').eq('id', courseId).single();
                if (data) setSelectedClass(data);
            } else {
                // Lấy danh sách lớp
                const { data: classData } = await supabase.from('classes').select('*').eq('course_id', courseId).order('created_at', {ascending: false});
                if (classData) setClasses(classData);

                // Lấy danh sách GV
                const { data: staffData } = await supabase.from('staffs').select('id, name').eq('role', 'teacher');
                if (staffData) setTeachers(staffData);

                // Lấy danh sách HV đã nhập học
                const { data: studentData } = await supabase.from('students').select('id, full_name').eq('status', 'ĐANG HỌC');
                if (studentData) setStudents(studentData);
            }
        };
        fetchInitialData();

        // Lắng nghe thay đổi lớp học Real-time
        const channel = supabase.channel('classes_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchInitialData).subscribe();
        return () => { channel.unsubscribe(); };
    }, [courseId, isDirectClass]);

    // Lấy danh sách buổi học của lớp được chọn
    useEffect(() => {
        if (selectedClass?.id) {
            const fetchSessions = async () => {
                const { data } = await supabase.from('sessions').select('*').eq('class_id', selectedClass.id).order('date', { ascending: true });
                if (data) setSessions(data);
            };
            fetchSessions();
            const sub = supabase.channel('sessions_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `class_id=eq.${selectedClass.id}` }, fetchSessions).subscribe();
            return () => { sub.unsubscribe(); };
        }
    }, [selectedClass?.id]);

    // --- 3. HANDLERS ---
    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('classes').insert([{
                ...newClass,
                course_id: courseId,
                total_sessions: courseDuration // Kế thừa số buổi từ khóa học
            }]);
            if (error) throw error;
            setShowCreateModal(false);
            setNewClass({ class_name: '', teacher_id: '', teacher_name: '', student_id: '', student_name: '', start_date: '', zoom_link: '', status: 'Đang mở' });
            alert("Mở lớp học thành công!");
        } catch (e) { alert("Lỗi khi tạo lớp!"); }
    };

    const handleUpdateSessionStatus = async (sid: string, status: string) => {
        await supabase.from('sessions').update({ status }).eq('id', sid);
    };

    const copyBookingLink = (id: string) => {
        const link = `${window.location.origin}/booking/${id}`;
        navigator.clipboard.writeText(link);
        alert("Đã copy link chọn lịch gửi cho học viên!");
    };

    // --- 4. RENDER ---
    if (view === 'sessions' && selectedClass) {
        // View Chi tiết buổi học (Điểm danh)
        return (
            <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in slide-in-from-right">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => isDirectClass ? onBack() : setView('list')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-orange-50 transition-all text-orange-600">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase italic leading-tight">{selectedClass.class_name}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
                            Tiến độ: <span className="text-orange-600">{sessions.filter(s => s.status !== 'Chưa diễn ra').length}/{selectedClass.total_sessions || courseDuration}</span> buổi
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* SIDEBAR TRÁI */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4 border-b pb-6 border-slate-50">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-blue-100 uppercase">{selectedClass.student_name?.charAt(0)}</div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Học viên</p><p className="font-black text-slate-800 text-lg">{selectedClass.student_name}</p></div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4"><div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><UserCheck size={20}/></div><div><p className="text-[9px] font-black text-slate-400 uppercase">Giảng viên</p><p className="font-bold text-slate-700 text-sm">{selectedClass.teacher_name}</p></div></div>
                                <a href={selectedClass.zoom_link} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-500 hover:text-white transition-all group border border-blue-100"><div className="flex items-center gap-3"><Video size={18}/><div><p className="text-[9px] font-black uppercase opacity-60">Phòng Zoom</p><p className="font-bold text-sm">Vào lớp học</p></div></div><ExternalLink size={16}/></a>
                                <button onClick={() => copyBookingLink(selectedClass.id)} className="w-full flex items-center justify-between p-4 bg-orange-50 text-orange-600 rounded-2xl hover:bg-orange-500 hover:text-white transition-all group border border-orange-100"><div className="flex items-center gap-3"><LinkIcon size={18}/><div><p className="text-[9px] font-black uppercase opacity-60">Lịch chọn</p><p className="font-bold text-sm">Gửi link cho HV</p></div></div><Copy size={16}/></button>
                            </div>
                        </div>
                    </div>

                    {/* LỘ TRÌNH PHẢI */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 font-black text-xs uppercase flex items-center gap-2 tracking-[0.1em]">
                            <FileText size={18} className="text-orange-500"/> Lộ trình chi tiết theo lịch học viên đã đặt
                        </div>
                        <div className="divide-y divide-slate-50">
                            {sessions.length === 0 ? (
                                <div className="p-20 text-center text-slate-400 font-medium italic">Chưa có buổi học nào được đặt.</div>
                            ) : (
                                sessions.map((s, idx) => (
                                    <div key={s.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center"><span className="text-[8px] font-black uppercase opacity-60">Buổi</span><span className="text-lg font-black">{idx + 1}</span></div>
                                            <div>
                                                <p className="font-black text-slate-700 uppercase text-sm">{new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
                                                <p className="text-[11px] font-bold text-orange-500 mt-1 italic tracking-tight">{s.start_time} – {s.end_time}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {s.status === 'Chưa diễn ra' ? (
                                                <>
                                                    <button onClick={() => handleUpdateSessionStatus(s.id, 'Đã điểm danh')} className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-xl hover:bg-emerald-600 transition-all">Điểm danh</button>
                                                    <button onClick={() => handleUpdateSessionStatus(s.id, 'Vắng')} className="px-4 py-2 bg-red-500 text-white text-[10px] font-black rounded-xl hover:bg-red-600 transition-all">Báo vắng</button>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border ${s.status === 'Đã điểm danh' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{s.status}</span>
                                                    {s.date === today && <button onClick={() => handleUpdateSessionStatus(s.id, 'Chưa diễn ra')} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // View Danh sách bảng cho Admin
    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-orange-50 transition-all text-orange-600"><ArrowLeft size={20}/></button>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight">Lớp 1-1: {courseTitle}</h2>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2 active:scale-95">+ Mở lớp học mới</button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead><tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest"><th className="p-6">LỚP & KHAI GIẢNG</th><th className="p-6">HỌC VIÊN</th><th className="p-6">GIẢNG VIÊN</th><th className="p-6 text-center">THAO TÁC</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                        {classes.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase italic text-sm tracking-[0.2em]">Chưa có dữ liệu lớp học.</td></tr>
                        ) : (
                            classes.map((cls) => (
                                <tr key={cls.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="p-6"><p className="font-black text-slate-800 uppercase text-sm leading-tight">{cls.class_name}</p><p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1 uppercase italic tracking-tighter"><CalendarIcon size={12}/> {cls.start_date || 'Chờ định ngày'}</p></td>
                                    <td className="p-6 font-bold text-slate-700">{cls.student_name}</td>
                                    <td className="p-6 font-black text-xs text-orange-600 uppercase italic">{cls.teacher_name}</td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => copyBookingLink(cls.id)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><LinkIcon size={18}/></button>
                                            <button onClick={() => { setSelectedClass(cls); setView('sessions'); }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-orange-600 text-[10px] font-black uppercase transition-all shadow-md">Chi tiết</button>
                                            <button onClick={async () => { if(window.confirm("Xóa lớp học này?")) await supabase.from('classes').delete().eq('id', cls.id) }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL MỞ LỚP HỌC (ĐẦY ĐỦ TRƯỜNG CŨ) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-orange-500 text-white flex justify-between items-center shadow-lg"><h3 className="text-2xl font-black italic uppercase tracking-tighter">Khởi tạo lớp học 1-1</h3><button onClick={() => setShowCreateModal(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-2xl"><X size={28} /></button></div>
                        <form onSubmit={handleCreateClass} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tên lớp học *</label><input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-orange-500/20 transition-all" value={newClass.class_name} onChange={e => setNewClass({...newClass, class_name: e.target.value})} placeholder="VD: IELTS-K01-TEN" /></div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Học viên *</label>
                                    <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" onChange={e => { const s = students.find(x => x.id === e.target.value); setNewClass({...newClass, student_id: s.id, student_name: s.full_name}); }}>
                                        <option value="">-- Chọn học viên --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Giảng viên *</label>
                                    <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" onChange={e => { const t = teachers.find(x => x.id === e.target.value); setNewClass({...newClass, teacher_id: t.id, teacher_name: t.name}); }}>
                                        <option value="">-- Chọn GV --</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Ngày khai giảng dự kiến</label><input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={newClass.start_date} onChange={e => setNewClass({...newClass, start_date: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Link Zoom cố định</label><input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={newClass.zoom_link} onChange={e => setNewClass({...newClass, zoom_link: e.target.value})} placeholder="zoom.us/j/..." /></div>
                            </div>
                            <button type="submit" className="w-full py-5 bg-orange-500 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-orange-600 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-lg mt-4">Xác nhận mở lớp</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; } `}</style>
        </div>
    );
};

export default ClassManagement;