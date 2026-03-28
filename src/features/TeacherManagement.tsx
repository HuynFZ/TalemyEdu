import React, { useState, useEffect } from 'react';
import {
    Search, Plus, X, Phone, Mail, MapPin, Briefcase, FileText,
    CheckCircle2, XCircle, AlertCircle, ChevronRight, User, Lock,
    CreditCard, UserPlus, Trash2
} from 'lucide-react';
import {
    subscribeToStaffByPosition,
    createStaff,
    updateStaff,
    deleteStaff,
    StaffData
} from '../services/staffService';
import { supabase } from '../supabaseClient';

const TeacherManagement = () => {
    // --- 1. STATES ---
    const [teachers, setTeachers] = useState<StaffData[]>([]);
    const [requests, setRequests] = useState<any[]>([]); // Danh sách yêu cầu đổi lịch
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const initialFormState: StaffData = {
        name: '',
        email: '',
        phone: '',
        cccd: '',
        address: '',
        gender: 'male',
        position: 'teacher', // Mặc định cho trang này
        salary: 0,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        bio: '',
        fixed_schedule: []
    };

    const [formData, setFormData] = useState<StaffData>(initialFormState);

    // --- 2. EFFECTS (REALTIME SUBSCRIPTION) ---
    useEffect(() => {
        let teacherChannel: any;

        const setupSubscriptions = async () => {
            // Đăng ký theo dõi danh sách giáo viên (theo position 'teacher')
            teacherChannel = await subscribeToStaffByPosition('teacher', setTeachers);
            fetchPendingRequests();
        };

        const requestChannel = supabase
            .channel('schedule_requests_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_requests' }, () => {
                fetchPendingRequests();
            })
            .subscribe();

        setupSubscriptions();

        return () => {
            if (teacherChannel) teacherChannel.unsubscribe();
            if (requestChannel) requestChannel.unsubscribe();
        };
    }, []);

    const fetchPendingRequests = async () => {
        const { data } = await supabase
            .from('schedule_requests')
            .select('*')
            .eq('status', 'pending');
        if (data) setRequests(data);
    };

    // --- 3. HANDLERS ---
    const handleOpenAdd = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (teacher: StaffData) => {
        setEditingId(teacher.id!);
        setFormData(teacher);
        setIsModalOpen(true);
    };

    const handleApproveSchedule = async (req: any) => {
        try {
            await updateStaff(req.teacher_id, { fixed_schedule: req.new_schedule });
            await supabase.from('schedule_requests').update({ status: 'approved' }).eq('id', req.id);
            alert("Đã phê duyệt lịch mới!");
            fetchPendingRequests();
        } catch (e) {
            alert("Lỗi khi phê duyệt!");
        }
    };

    const handleRejectSchedule = async (reqId: string) => {
        if (window.confirm("Từ chối yêu cầu này?")) {
            await supabase.from('schedule_requests').update({ status: 'rejected' }).eq('id', reqId);
            fetchPendingRequests();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await updateStaff(editingId, formData);
                alert("Cập nhật thành công!");
            } else {
                // createStaff trong service đã xử lý tạo User + Staff
                await createStaff(formData);
                alert("Thêm giảng viên & tạo tài khoản thành công! (Mật khẩu mặc định: 123456)");
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra, vui lòng kiểm tra email trùng lặp!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("CẢNH BÁO: Xóa giảng viên này sẽ xóa luôn tài khoản đăng nhập của họ. Bạn chắc chắn chứ?")) {
            setLoading(true);
            try {
                await deleteStaff(id);
                setIsModalOpen(false);
                alert("Đã xóa vĩnh viễn giảng viên và tài khoản liên quan.");
            } catch (error) {
                alert("Lỗi khi xóa dữ liệu!");
            } finally {
                setLoading(false);
            }
        }
    };

    // --- 4. FILTER LOGIC ---
    const filteredTeachers = teachers.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.phone?.includes(searchTerm) ||
            t.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar">

            {/* --- PHẦN 1: DUYỆT ĐỔI LỊCH --- */}
            {requests.length > 0 && (
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="font-black text-slate-800 uppercase text-xs flex items-center gap-2 mb-5">
                        <AlertCircle className="text-blue-500" size={18} /> Yêu cầu đổi lịch ({requests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-[2.5rem] border-2 border-blue-100 shadow-xl shadow-blue-100/10 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">{req.teacher_name?.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm leading-tight">{req.teacher_name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Yêu cầu đổi lịch rảnh</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveSchedule(req)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"><CheckCircle2 size={16}/></button>
                                        <button onClick={() => handleRejectSchedule(req.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[10px]">
                                    <div className="flex-1 text-slate-400 line-through text-center">{req.old_schedule?.join(", ") || "Trống"}</div>
                                    <ChevronRight size={14} className="text-blue-300 shrink-0" />
                                    <div className="flex-1 text-blue-600 font-black text-center uppercase italic">{req.new_schedule?.join(", ")}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PHẦN 2: HEADER & TOOLBAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Quản lý giảng viên</h1>
                    <p className="text-slate-500 text-sm font-medium">Đội ngũ giảng dạy chuyên môn & Hệ thống tài khoản</p>
                </div>

                <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full max-w-2xl">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text" placeholder="Tìm kiếm giáo viên..."
                            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-400 shadow-sm transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full sm:w-48 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:border-blue-400 transition-all cursor-pointer shadow-sm"
                        value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">Tất cả</option>
                        <option value="active">Đang giảng dạy</option>
                        <option value="inactive">Tạm nghỉ</option>
                    </select>
                </div>

                <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap">
                    <UserPlus size={20} /> Thêm Giảng Viên
                </button>
            </div>

            {/* --- PHẦN 3: DANH SÁCH THẺ --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeachers.map(teacher => (
                    <div
                        key={teacher.id}
                        onClick={() => handleOpenEdit(teacher)}
                        className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 cursor-pointer hover:border-blue-300 hover:shadow-xl transition-all duration-300 group flex flex-col"
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl shadow-inner border border-blue-100 shrink-0 group-hover:scale-105 transition-transform uppercase">
                                {teacher.name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-slate-800 text-lg leading-tight truncate group-hover:text-blue-600 transition-colors">{teacher.name}</h3>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Briefcase size={12}/> Giảng Viên</p>
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${teacher.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {teacher.status === 'active' ? 'Đang dạy' : 'Tạm nghỉ'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 pt-5 border-t border-slate-50">
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                <Phone size={14} className="text-slate-400"/>
                                <span className="font-bold">{teacher.phone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                <Mail size={14} className="text-slate-400"/>
                                <span className="truncate">{teacher.email}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL ADD/EDIT --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">
                                {editingId ? 'Hồ Sơ Giảng Viên' : 'Khởi tạo Giảng Viên & Tài Khoản'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-white">

                            {/* NHÓM 1: THÔNG TIN CÁ NHÂN */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                                    <User size={16}/> Thông tin cá nhân
                                </h3>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Họ và Tên *</label>
                                    <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Giới tính</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Số CCCD / CMND</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Địa chỉ thường trú</label>
                                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                </div>
                            </div>

                            {/* NHÓM 2: LIÊN HỆ & TÀI KHOẢN */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                                    <Lock size={16}/> Liên hệ & Tài khoản
                                </h3>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email Công Việc (Username) *</label>
                                    <input required type="email" disabled={!!editingId} className={`w-full px-5 py-4 border border-slate-200 rounded-2xl outline-none font-bold ${editingId ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 focus:border-blue-500'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Số điện thoại *</label>
                                    <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Lương (VNĐ) *</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                        <input required type="number" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-blue-600" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            {/* NHÓM 3: CÔNG TÁC & BIO */}
                            <div className="md:col-span-2 space-y-4 pt-4">
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                                    <Briefcase size={16}/> Thông tin công tác
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ngày nhận việc</label>
                                        <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Trạng thái giảng dạy</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                            <option value="active">Đang giảng dạy</option>
                                            <option value="inactive">Tạm nghỉ / Đã nghỉ</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tiểu sử học thuật (Bio)</label>
                                    <textarea className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium h-24 resize-none" placeholder="Chứng chỉ IELTS, kinh nghiệm giảng dạy..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                                </div>
                            </div>

                            {/* BUTTONS */}
                            <div className="md:col-span-2 pt-8 flex flex-col sm:flex-row gap-3">
                                {editingId && (
                                    <button
                                        type="button"
                                        disabled={loading}
                                        onClick={() => handleDelete(editingId)}
                                        className="flex-1 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16}/> Xóa vĩnh viễn
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                >
                                    {loading ? "Đang xử lý..." : editingId ? "Lưu thay đổi hồ sơ" : "Xác nhận tạo hồ sơ & tài khoản"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherManagement;