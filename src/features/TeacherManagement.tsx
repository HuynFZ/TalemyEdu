import React, { useState, useEffect } from 'react';
import {
    Search, Plus, X, Phone, Mail, MapPin, Briefcase, FileText,
    CheckCircle2, XCircle, AlertCircle, ChevronRight, User, Lock,
    CreditCard, UserPlus, Trash2, Edit, GraduationCap, Users, BookOpen
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
    const [staffs, setStaffs] = useState<StaffData[]>([]);
    const [requests, setRequests] = useState<any[]>([]); // Danh sách yêu cầu đổi lịch
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [roleFilter, setRoleFilter] = useState('All'); // Lọc GV hoặc PT

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
        role: 'teacher', // Mặc định là teacher, có thể đổi thành pt
        salary: 0,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        bio: '',
        fixed_schedule: []
    };

    const [formData, setFormData] = useState<StaffData>(initialFormState);

    // --- 2. EFFECTS (REALTIME) ---
    useEffect(() => {
        fetchData();

        // Lắng nghe thay đổi realtime
        const channel = supabase
            .channel('training_center_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_requests' }, () => fetchPendingRequests())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        // Lấy toàn bộ staffs có role là teacher hoặc pt
        const { data, error } = await supabase
            .from('staffs')
            .select('*')
            .in('role', ['teacher', 'pt'])
            .order('role', { ascending: false }) // Teacher lên trước
            .order('name', { ascending: true });

        if (!error && data) setStaffs(data);
        fetchPendingRequests();
    };

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

    const handleOpenEdit = (item: StaffData) => {
        setEditingId(item.id!);
        setFormData(item);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await updateStaff(editingId, formData);
                alert("Cập nhật thành công!");
            } else {
                await createStaff(formData);
                alert(`Thêm ${formData.role === 'teacher' ? 'Giảng viên' : 'Trợ giảng'} thành công! Tài khoản đã được khởi tạo.`);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Lỗi dữ liệu: Vui lòng kiểm tra email trùng lặp hoặc các trường bắt buộc.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("CẢNH BÁO: Xóa nhân sự này sẽ xóa luôn tài khoản đăng nhập của họ. Tiếp tục?")) {
            setLoading(true);
            try {
                await deleteStaff(id);
                setIsModalOpen(false);
                fetchData();
            } catch (error) {
                alert("Lỗi khi xóa nhân sự!");
            } finally {
                setLoading(false);
            }
        }
    };

    // --- 4. FILTER LOGIC ---
    const filteredItems = staffs.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        const matchRole = roleFilter === 'All' || s.role === roleFilter;
        return matchSearch && matchStatus && matchRole;
    });

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar">

            {/* --- PHẦN 1: DUYỆT ĐỔI LỊCH (GIỮ NGUYÊN) --- */}
            {requests.length > 0 && (
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="font-black text-slate-800 uppercase text-xs flex items-center gap-2 mb-5">
                        <AlertCircle className="text-blue-500" size={18} /> Yêu cầu phê duyệt lịch ({requests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-[2rem] border-2 border-blue-100 shadow-xl shadow-blue-100/10 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">{req.teacher_name?.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm leading-none">{req.teacher_name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Đổi lịch giảng dạy</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveSchedule(req)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"><CheckCircle2 size={16}/></button>
                                        <button onClick={() => supabase.from('schedule_requests').update({ status: 'rejected' }).eq('id', req.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
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
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Đội ngũ đào tạo</h1>
                    <p className="text-slate-500 text-sm font-medium italic">Quản lý Giảng viên & Trợ giảng chuyên môn</p>
                </div>

                <div className="flex flex-1 flex-col lg:flex-row items-center gap-3 w-full max-w-4xl">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text" placeholder="Tìm kiếm tên, email..."
                            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:border-blue-400 shadow-sm"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full lg:w-40 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
                        value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="All">Tất cả vai trò</option>
                        <option value="teacher">Giảng viên</option>
                        <option value="pt">Trợ giảng</option>
                    </select>
                    <select
                        className="w-full lg:w-40 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none cursor-pointer"
                        value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value="active">Đang làm việc</option>
                        <option value="inactive">Tạm nghỉ</option>
                    </select>
                </div>

                <button onClick={handleOpenAdd} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap">
                    <UserPlus size={20} /> Thêm nhân sự mới
                </button>
            </div>

            {/* --- TABLE LIST --- */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto h-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-black border-b border-slate-100">
                            <th className="p-5">Họ và Tên</th>
                            <th className="p-5">Vai trò</th>
                            <th className="p-5">Liên hệ</th>
                            <th className="p-5 text-center">Trạng thái</th>
                            <th className="p-5 text-center">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-inner border uppercase ${item.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                            {item.name?.charAt(0)}
                                        </div>
                                        <h3 className="font-black text-slate-800 text-sm">{item.name}</h3>
                                    </div>
                                </td>
                                <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border flex items-center gap-1.5 w-fit ${item.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                            {item.role === 'teacher' ? <GraduationCap size={12}/> : <Users size={12}/>}
                                            {item.role === 'teacher' ? 'Giảng viên' : 'Trợ giảng'}
                                        </span>
                                </td>
                                <td className="p-5 text-sm font-medium text-slate-600">
                                    <div className="flex flex-col gap-1">
                                        <span className="flex items-center gap-2 font-bold"><Phone size={12} className="text-slate-400"/> {item.phone || 'N/A'}</span>
                                        <span className="flex items-center gap-2 opacity-70"><Mail size={12} className="text-slate-400"/> {item.email}</span>
                                    </div>
                                </td>
                                <td className="p-5 text-center">
                                        <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg border ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {item.status === 'active' ? 'Đang dạy' : 'Tạm nghỉ'}
                                        </span>
                                </td>
                                <td className="p-5">
                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition-all"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(item.id!)} className="p-2 text-red-500 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL ADD/EDIT --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-blue-600 text-white flex justify-between items-center shadow-lg">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">
                                {editingId ? 'Hồ Sơ Nhân Sự Đào Tạo' : 'Khởi tạo Nhân Sự & Tài Khoản'}
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Vai trò nhân sự *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setFormData({...formData, role: 'teacher'})} className={`py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${formData.role === 'teacher' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>Giảng viên</button>
                                        <button type="button" onClick={() => setFormData({...formData, role: 'pt'})} className={`py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${formData.role === 'pt' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-blue-200'}`}>Trợ giảng (PT)</button>
                                    </div>
                                </div>

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
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Lương cơ bản (VNĐ) *</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                                        <input required type="number" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-blue-600" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            {/* NHÓM 3: CÔNG TÁC & BIO */}
                            <div className="md:col-span-2 space-y-4 pt-4">
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                                    <Briefcase size={16}/> Thông tin công tác & Bio
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ngày nhận việc</label>
                                        <input type="date" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700" value={formData.hire_date} onChange={e => setFormData({...formData, hire_date: e.target.value})} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Trạng thái công tác</label>
                                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                            <option value="active">Đang làm việc</option>
                                            <option value="inactive">Tạm nghỉ / Đã nghỉ</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tiểu sử học thuật (Bio)</label>
                                    <textarea className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium h-24 resize-none shadow-inner" placeholder="Chứng chỉ IELTS, kinh nghiệm giảng dạy..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                                </div>
                            </div>

                            <div className="md:col-span-2 pt-8 flex flex-col sm:flex-row gap-3">
                                {editingId && (
                                    <button type="button" disabled={loading} onClick={() => handleDelete(editingId)} className="flex-1 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"><Trash2 size={16}/> Xóa vĩnh viễn</button>
                                )}
                                <button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 active:scale-95">
                                    {loading ? "ĐANG XỬ LÝ..." : editingId ? "Lưu thay đổi hồ sơ" : "Xác nhận tạo hồ sơ & tài khoản"}
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
