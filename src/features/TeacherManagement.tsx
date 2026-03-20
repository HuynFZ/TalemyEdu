import React, { useState, useEffect } from 'react';
import { 
    Search, Plus, X, User, Phone, Mail, 
    MapPin, Briefcase, FileText, CheckCircle2, XCircle,
    AlertCircle, ChevronRight 
} from 'lucide-react';
import { 
    subscribeToStaffByPosition, 
    createStaff, 
    updateStaff, 
    deleteStaff, 
    StaffData 
} from '../services/staffService';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const TeacherManagement = () => {
    // --- STATES ---
    const [teachers, setTeachers] = useState<StaffData[]>([]);
    const [requests, setRequests] = useState<any[]>([]); // Danh sách yêu cầu đổi lịch chờ duyệt (Từ main)
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // State cho Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form data (Luôn set cứng position là 'teacher')
    const initialFormState: StaffData & { password?: string } = {
        name: '', email: '', phone: '', address: '', gender: 'Male',
        position: 'teacher', // Giữ nguyên 'teacher' để tương thích dữ liệu
        salary: 0, hireDate: new Date().toISOString().split('T')[0],
        status: 'active', cccd: '', bio: ''
    };
    
    const [formData, setFormData] = useState<StaffData & { password?: string }>(initialFormState);

    // --- EFFECTS ---
    useEffect(() => {
        // 1. Theo dõi danh sách giáo viên
        const unsubscribeTeachers = subscribeToStaffByPosition('teacher', setTeachers);

        // 2. Theo dõi yêu cầu đổi lịch đang chờ (Status = pending) (Từ main)
        const qReq = query(collection(db, "scheduleRequests"), where("status", "==", "pending"));
        const unsubscribeReq = onSnapshot(qReq, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubscribeTeachers();
            unsubscribeReq();
        };
    }, []);

    // --- LỌC DANH SÁCH GIẢNG VIÊN ---
    const filteredTeachers = teachers.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.phone.includes(searchTerm) || 
                            (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // --- XỬ LÝ PHÊ DUYỆT LỊCH (TỪ MAIN) ---
    const handleApproveSchedule = async (req: any) => {
        try {
            await updateDoc(doc(db, "staffs", req.teacherId), { fixedSchedule: req.newSchedule });
            await updateDoc(doc(db, "scheduleRequests", req.id), { status: 'approved' });
            alert("Đã phê duyệt lịch mới cho GV " + req.teacherName);
        } catch (e) {
            alert("Lỗi khi phê duyệt!");
        }
    };

    const handleRejectSchedule = async (reqId: string) => {
        if (window.confirm("Từ chối yêu cầu đổi lịch này?")) {
            await updateDoc(doc(db, "scheduleRequests", reqId), { status: 'rejected' });
        }
    };

    // --- MODAL HANDLERS ---
    const handleOpenAdd = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleCardClick = (teacher: StaffData) => {
        setEditingId(teacher.id!);
        const editData = { ...teacher };
        setFormData(editData);
        setIsModalOpen(true);
    };

    // --- CRUD HANDLERS ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { password, id, ...updateData } = formData;
                await updateStaff(editingId, updateData);
                alert("Cập nhật thông tin giảng viên thành công!");
            } else {
                await createStaff(formData as any);
                alert("Thêm giảng viên mới thành công!");
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa giảng viên này không? Dữ liệu hợp đồng liên quan có thể bị ảnh hưởng.")) {
            try {
                await deleteStaff(id);
                setIsModalOpen(false);
            } catch (error) {
                console.error(error);
                alert("Không thể xóa giảng viên!");
            }
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar max-w-[1600px] mx-auto">
            
            {/* --- PHẦN 1: DUYỆT ĐỔI LỊCH (TỪ MAIN) --- */}
            {requests.length > 0 && (
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2 mb-5">
                        <AlertCircle className="text-orange-500" size={18} /> Phê duyệt yêu cầu đổi lịch ({requests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-[2rem] border-2 border-orange-100 shadow-xl shadow-orange-100/10 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black">{req.teacherName?.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm leading-tight">{req.teacherName}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Yêu cầu đổi lịch rảnh</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveSchedule(req)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"><CheckCircle2 size={16}/></button>
                                        <button onClick={() => handleRejectSchedule(req.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                    <div className="flex-1 text-[9px] font-bold text-slate-400 line-through text-center leading-relaxed">
                                        {req.oldSchedule?.length > 0 ? req.oldSchedule.join(", ") : "Trống"}
                                    </div>
                                    <ChevronRight size={14} className="text-orange-300 shrink-0" />
                                    <div className="flex-1 text-[9px] font-black text-orange-600 text-center uppercase italic leading-relaxed">
                                        {req.newSchedule?.join(", ")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PHẦN 2: HEADER & TOOLBAR (GIAO DIỆN HEAD) --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="w-full md:w-auto shrink-0">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Giảng Viên</h1>
                    <p className="text-slate-500 font-medium mt-1">Quản lý hồ sơ và đội ngũ giảng dạy</p>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-2xl mx-auto">
                    <div className="relative w-full flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo tên, SĐT, Email..." 
                            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    <select 
                        className="w-full sm:w-48 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 focus:outline-none focus:border-blue-400 transition-all shadow-sm cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value="active">Đang giảng dạy</option>
                        <option value="inactive">Tạm nghỉ</option>
                    </select>
                </div>

                <div className="w-full md:w-auto flex justify-end shrink-0">
                    <button onClick={handleOpenAdd} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 w-full md:w-auto">
                        <Plus size={20} /> <span className="hidden sm:inline">Thêm Giảng Viên</span>
                    </button>
                </div>
            </div>

            {/* --- PHẦN 3: DANH SÁCH THẺ GIẢNG VIÊN (GIAO DIỆN HEAD) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeachers.map(teacher => (
                    <div 
                        key={teacher.id} 
                        onClick={() => handleCardClick(teacher)}
                        className="bg-white rounded-[2rem] p-6 shadow-sm border-2 border-slate-100 cursor-pointer hover:border-blue-300 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                    >
                        <div className="absolute top-6 right-6">
                            {teacher.status === 'active' ? (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-100">
                                    <CheckCircle2 size={12}/> Đang dạy
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200">
                                    <XCircle size={12}/> Tạm nghỉ
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 flex items-center justify-center font-black text-2xl shadow-inner border border-blue-100 group-hover:scale-110 transition-transform duration-300">
                                {teacher.name.charAt(0)}
                            </div>
                            <div className="pr-20">
                                <h3 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">{teacher.name}</h3>
                                <p className="text-sm font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                                    <Briefcase size={14}/> Giảng Viên
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                                    <Phone size={14} className="text-slate-400"/>
                                </div>
                                {teacher.phone || 'Chưa cập nhật SĐT'}
                            </div>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                                    <Mail size={14} className="text-slate-400"/>
                                </div>
                                <span className="truncate">{teacher.email || 'Chưa cập nhật Email'}</span>
                            </div>
                        </div>
                    </div>
                ))}
                
                {filteredTeachers.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                        <User className="mx-auto text-slate-300 mb-3" size={48}/>
                        <p className="text-slate-500 font-bold">Không tìm thấy giảng viên nào phù hợp.</p>
                    </div>
                )}
            </div>

            {/* --- MODAL THÊM / SỬA GIẢNG VIÊN (GIAO DIỆN HEAD) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">{editingId ? 'Hồ Sơ Giảng Viên' : 'Thêm Giảng Viên Mới'}</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Thông tin chi tiết</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20}/></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Họ và Tên *</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" required className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Số Điện Thoại *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="tel" required className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="email" required className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">CCCD / CMND</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Địa chỉ</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ngày vào làm</label>
                                    <input type="date" required className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Trạng thái hoạt động</label>
                                    <select className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}>
                                        <option value="active">Đang giảng dạy</option>
                                        <option value="inactive">Tạm nghỉ</option>
                                    </select>
                                </div>
                                {!editingId && (
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mật khẩu đăng nhập hệ thống *</label>
                                        <input type="password" required className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Nhập mật khẩu cho tài khoản giảng viên..." />
                                    </div>
                                )}
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tiểu sử học thuật (Bio) - Sẽ hiện trên Website/Profile</label>
                                    <textarea className="w-full p-4 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold text-slate-700 focus:border-blue-400 focus:bg-blue-50/30 transition-all outline-none min-h-[100px]" placeholder="VD: IELTS 8.0, Cựu sinh viên FTU..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-center">
                                {editingId ? (
                                    <button type="button" onClick={() => handleDelete(editingId)} className="w-full md:w-auto px-6 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors uppercase text-sm tracking-widest">
                                        Xóa Giảng Viên
                                    </button>
                                ) : <div />} 
                                
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors uppercase text-sm tracking-widest">
                                        Đóng
                                    </button>
                                    <button type="submit" className="flex-1 md:flex-none px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl hover:shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all active:scale-[0.98] uppercase text-sm tracking-widest">
                                        {editingId ? 'LƯU THAY ĐỔI' : 'TẠO MỚI'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; } 
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default TeacherManagement;