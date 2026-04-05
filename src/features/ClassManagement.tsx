// --- FILE: src/features/ClassManagement.tsx ---
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    UserCheck, Plus, ArrowLeft, X, Edit,
    Trash2, Clock, FileText, Video,
    ExternalLink, CheckCircle2, Calendar as CalendarIcon, RotateCcw, Users, Save
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
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'create' | 'edit'>('create');

    const [classes, setClasses] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [assistants, setAssistants] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [courseDuration, setCourseDuration] = useState<number>(0);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        teacher_id: '',
        assistant_id: '',
        student_id: '',
        start_date: '',
        status: 'Đang mở'
    });

    const today = new Date().toISOString().split('T')[0];

    // --- Hàm định dạng dữ liệu Lớp ---
    const formatClassData = (cls: any) => {
        const enrolledStudents = cls.contracts
            ? cls.contracts.map((c: any) => c.student?.full_name).filter(Boolean)
            : [];

        return {
            ...cls,
            teacher_name: cls.teacher?.name || 'Chưa phân công',
            assistant_name: cls.assistant?.name || 'Chưa có trợ giảng',
            student_name: enrolledStudents.length > 0 ? enrolledStudents.join(', ') : 'Chưa có học viên'
        };
    };

    const canAttend = (session: any) => {
        const now = new Date();
        
        // Tạo đối tượng Date cho thời điểm bắt đầu và kết thúc của buổi học
        // Giả sử session.date có định dạng 'YYYY-MM-DD' và time là 'HH:mm'
        const startTime = new Date(`${session.date}T${session.start_time}`);
        const endTime = new Date(`${session.date}T${session.end_time}`);
        
        // Thời gian khóa là sau khi kết thúc 10 phút
        const lockTime = new Date(endTime.getTime() + 10 * 60000);

        // Trả về true nếu "bây giờ" nằm trong khoảng [Bắt đầu] -> [Kết thúc + 10ph]
        return now >= startTime && now <= lockTime;
    };

    // --- 2. EFFECTS (DATA FETCHING) ---
    const fetchInitialData = async () => {
        const { data: courseData } = await supabase.from('courses').select('duration').eq('id', courseId).single();
        if (courseData) setCourseDuration(courseData.duration);

        // Join lấy Teacher và Assistant thông qua Foreign Key cụ thể
        const querySelect = `
            *,
            teacher:staffs!classes_teacher_id_fkey(name),
            assistant:staffs!classes_assistant_id_fkey(name),
            contracts(student:students(full_name))
        `;

        if (isDirectClass) {
            const { data } = await supabase.from('classes').select(querySelect).eq('id', courseId).single();
            if (data) setSelectedClass(formatClassData(data));
        } else {
            const { data: classData } = await supabase.from('classes').select(querySelect).eq('course_id', courseId).order('created_at', {ascending: false});
            if (classData) setClasses(classData.map(formatClassData));

            const { data: teacherData } = await supabase.from('staffs').select('id, name').eq('role', 'teacher');
            if (teacherData) setTeachers(teacherData);

            const { data: ptData } = await supabase.from('staffs').select('id, name').eq('role', 'pt');
            if (ptData) setAssistants(ptData);

            const { data: studentData } = await supabase.from('students').select('id, full_name').eq('status', 'ĐANG HỌC');
            if (studentData) setStudents(studentData);
        }
    };

    useEffect(() => {
        fetchInitialData();
        const channel = supabase.channel('class_mgmt_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchInitialData).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [courseId, isDirectClass]);

    useEffect(() => {
        if (selectedClass?.id) {
            const fetchSessions = async () => {
                const { data } = await supabase.from('sessions').select('*').eq('class_id', selectedClass.id).order('date', { ascending: true }).order('start_time', { ascending: true });
                if (data) setSessions(data);
            };
            fetchSessions();
            const sub = supabase.channel('sess_mgmt_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `class_id=eq.${selectedClass.id}` }, fetchSessions).subscribe();
            return () => { supabase.removeChannel(sub); };
        }
    }, [selectedClass?.id]);

    // --- 3. HANDLERS ---
    const handleOpenCreate = () => {
        setModalType('create');
        setFormData({ id: '', name: '', teacher_id: '', assistant_id: '', student_id: '', start_date: '', status: 'Đang mở' });
        setShowModal(true);
    };

        // --- LOGIC KIỂM TRA THỜI GIAN VÀO PHÒNG HỌC (Trước 10ph -> Kết thúc) ---
    const canEnterMeet = (session: any) => {
        const now = new Date();
        const startTime = new Date(`${session.date}T${session.start_time}`);
        const endTime = new Date(`${session.date}T${session.end_time}`);
        
        // Mốc thời gian mở cửa phòng học: Trước giờ bắt đầu 10 phút
        const openTime = new Date(startTime.getTime() - 10 * 60000);

        // Cho phép vào từ lúc Open đến khi Kết thúc buổi học
        return now >= openTime && now <= endTime;
    };

    const handleOpenEdit = (cls: any) => {
        setModalType('edit');
        setFormData({
            id: cls.id,
            name: cls.name,
            teacher_id: cls.teacher_id || '',
            assistant_id: cls.assistant_id || '',
            student_id: '', // Không sửa HV ở đây
            start_date: cls.start_date || '',
            status: cls.status
        });
        setShowModal(true);
    };

    const handleSaveClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalType === 'create') {
                const { data: newCls, error } = await supabase.from('classes').insert([{
                    name: formData.name,
                    course_id: courseId,
                    teacher_id: formData.teacher_id || null,
                    assistant_id: formData.assistant_id || null,
                    start_date: formData.start_date || null,
                    status: formData.status
                }]).select().single();
                if (error) throw error;

                if (newCls && formData.student_id) {
                    await supabase.from('contracts').insert([{
                        contract_code: `HD_NHANH_${Date.now().toString().slice(-6)}`,
                        student_id: formData.student_id,
                        class_id: newCls.id,
                        total_fee: 0,
                        status: 'ĐANG HIỆU LỰC'
                    }]);
                }
            } else {
                const { error } = await supabase.from('classes').update({
                    name: formData.name,
                    teacher_id: formData.teacher_id || null,
                    assistant_id: formData.assistant_id || null,
                    start_date: formData.start_date || null,
                    status: formData.status
                }).eq('id', formData.id);
                if (error) throw error;
            }
            setShowModal(false);
            fetchInitialData();
            alert("Thành công!");
        } catch (e) { alert("Lỗi xử lý!"); }
    };

    const getCompletedSessionsCount = () => {
        return sessions.filter(s => s.status !== 'Chưa diễn ra').length;
    };

    const handleUpdateSessionStatus = async (sid: string, status: string, session: any) => {
        // Kiểm tra lại một lần nữa trước khi cập nhật (bảo mật phía client)
        if (!canAttend(session) && status !== 'Chưa diễn ra') {
            alert("Ngoài thời gian cho phép điểm danh (Chỉ được thao tác từ lúc bắt đầu đến sau khi kết thúc 10 phút)");
            return;
        }
        await supabase.from('sessions').update({ status }).eq('id', sid);
    };

    // --- 4. RENDER ---
    if (view === 'sessions' && selectedClass) {
        return (
            <div className="p-4 md:p-8 bg-slate-50 min-h-screen animate-in slide-in-from-right">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => isDirectClass ? onBack() : setView('list')} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-orange-50 transition-all text-orange-600">
                            <ArrowLeft size={20}/>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase italic leading-tight">{selectedClass.name}</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
                                Tiến độ: <span className="text-orange-600">{getCompletedSessionsCount()}/{courseDuration}</span> buổi
                            </p>
                        </div>
                    </div>
                    {/* Nút sửa nhanh trợ giảng/giáo viên ngay tại trang chi tiết */}
                    <button onClick={() => handleOpenEdit(selectedClass)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Edit size={14}/> Chỉnh sửa thông tin lớp
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* SIDEBAR TRÁI */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4 border-b pb-6 border-slate-50">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-blue-100 uppercase">{selectedClass.student_name?.charAt(0) || '?'}</div>
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Học viên</p><p className="font-black text-slate-800 text-lg line-clamp-2">{selectedClass.student_name}</p></div>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><UserCheck size={20}/></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">Giảng viên</p><p className="font-bold text-slate-700 text-sm">{selectedClass.teacher_name}</p></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center"><Users size={20}/></div>
                                    <div><p className="text-[9px] font-black text-slate-400 uppercase">Trợ giảng</p><p className="font-bold text-slate-700 text-sm">{selectedClass.assistant_name}</p></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LỘ TRÌNH PHẢI */}
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden text-sm">
                        <div className="p-6 bg-slate-50/50 border-b border-slate-100 font-black text-xs uppercase flex items-center gap-2 tracking-[0.1em]">
                            <FileText size={18} className="text-orange-500"/> Nhật ký lộ trình & Link Google Meet
                        </div>
                        <div className="divide-y divide-slate-50">
                            {sessions.length === 0 ? (
                                <div className="p-20 text-center text-slate-400 font-medium italic">Chưa có buổi học nào được đặt lịch.</div>
                            ) : (
                                sessions.map((s, idx) => {
                                    const isTimeForAttendance = canAttend(s);
                                    const isTimeForMeet = canEnterMeet(s);
                                    
                                    return (
                                        <div key={s.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-slate-50/50 transition-all group gap-4">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center group-hover:bg-orange-500 transition-colors shadow-sm">
                                                    <span className="text-[8px] font-black uppercase opacity-60">Buổi</span>
                                                    <span className="text-lg font-black">{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-700 uppercase text-sm">{new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
                                                    <p className="text-[11px] font-bold text-orange-500 mt-1 italic tracking-tight flex items-center gap-1"><Clock size={12}/> {s.start_time?.slice(0,5)} – {s.end_time?.slice(0,5)}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-end">
                                            {/* LOGIC NÚT VÀO PHÒNG HỌC */}
                                            {s.meet_link ? (
                                                isTimeForMeet ? (
                                                    <a href={s.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase border border-blue-500 hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                                        <Video size={14}/> Vào phòng học
                                                    </a>
                                                ) : (
                                                    <span className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase border border-slate-300 cursor-not-allowed">
                                                        <Video size={14}/> Vào phòng học
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-300 uppercase italic px-3 border border-dashed border-slate-200 py-2 rounded-xl">Chưa có link Meet</span>
                                            )}

                                                {/* LOGIC ĐIỂM DANH / BÁO VẮNG */}
                                                {s.status === 'Chưa diễn ra' ? (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            disabled={!isTimeForAttendance}
                                                            onClick={() => handleUpdateSessionStatus(s.id, 'Đã điểm danh', s)} 
                                                            className={`px-4 py-2.5 text-[10px] font-black rounded-xl transition-all shadow-sm 
                                                                ${isTimeForAttendance 
                                                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                        >
                                                            Điểm danh
                                                        </button>
                                                        <button 
                                                            disabled={!isTimeForAttendance}
                                                            onClick={() => handleUpdateSessionStatus(s.id, 'Vắng', s)} 
                                                            className={`px-4 py-2.5 text-[10px] font-black rounded-xl transition-all shadow-sm 
                                                                ${isTimeForAttendance 
                                                                    ? 'bg-red-500 text-white hover:bg-red-600' 
                                                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                        >
                                                            Báo vắng
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border shadow-sm ${s.status === 'Đã điểm danh' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                            {s.status}
                                                        </span>
                                                        
                                                        {/* Nút Reset chỉ hiện nếu trong khung giờ cho phép */}
                                                        {isTimeForAttendance && (
                                                            <button 
                                                                onClick={() => handleUpdateSessionStatus(s.id, 'Chưa diễn ra', s)} 
                                                                className="p-2 text-slate-300 hover:text-orange-500 transition-all" 
                                                                title="Sửa lại"
                                                            >
                                                                <RotateCcw size={18}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
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
                    <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-orange-50 transition-all text-orange-600"><ArrowLeft size={20}/></button>
                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-800">Lớp 1-1: {courseTitle}</h2>
                </div>
                <button onClick={handleOpenCreate} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center gap-2"><Plus size={20}/> Mở lớp học mới</button>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead><tr className="bg-slate-50/50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest"><th className="p-6">LỚP & KHAI GIẢNG</th><th className="p-6">HỌC VIÊN</th><th className="p-6">GIẢNG VIÊN / TRỢ GIẢNG</th><th className="p-6 text-center">THAO TÁC</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                        {classes.length === 0 ? (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase italic text-sm tracking-[0.2em]">Chưa có dữ liệu lớp học.</td></tr>
                        ) : (
                            classes.map((cls) => (
                                <tr key={cls.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="p-6">
                                        <p className="font-black text-slate-800 uppercase text-sm leading-tight">{cls.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1 uppercase italic tracking-tighter"><CalendarIcon size={12}/> {cls.start_date || 'Chờ định ngày'}</p>
                                    </td>
                                    <td className="p-6 font-bold text-slate-700">{cls.student_name}</td>
                                    <td className="p-6">
                                        <div className="space-y-1">
                                            <p className="font-black text-xs text-blue-600 uppercase italic">GV: {cls.teacher_name}</p>
                                            <p className="font-bold text-[10px] text-orange-500 uppercase tracking-tighter">TG: {cls.assistant_name}</p>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleOpenEdit(cls)} className="p-2.5 text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"><Edit size={18}/></button>
                                            <button onClick={() => { setSelectedClass(cls); setView('sessions'); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-orange-600 text-[10px] font-black uppercase transition-all shadow-md">Vào chi tiết</button>
                                            <button onClick={async () => { if(window.confirm("Xóa lớp?")) await supabase.from('classes').delete().eq('id', cls.id) }} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL MỞ / SỬA LỚP HỌC */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[120] p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                                {modalType === 'create' ? 'Khởi tạo lớp học 1-1' : 'Cập nhật thông tin lớp'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-2xl"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleSaveClass} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tên lớp học *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500/20 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: IELTS-K01-TEN" />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Học viên *</label>
                                    <select disabled={modalType === 'edit'} required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 disabled:opacity-50" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})}>
                                        <option value="">-- Chọn học viên --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Ngày khai giảng</label>
                                    <input type="date" required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Giảng viên chính *</label>
                                    <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})}>
                                        <option value="">-- Chọn Giảng viên --</option>
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Trợ giảng (PT) *</label>
                                    <select required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.assistant_id} onChange={e => setFormData({...formData, assistant_id: e.target.value})}>
                                        <option value="">-- Chọn Trợ giảng --</option>
                                        {assistants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-lg mt-4 flex items-center justify-center gap-2">
                                <Save size={20}/> {modalType === 'create' ? 'Xác nhận mở lớp' : 'Lưu thay đổi'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassManagement;