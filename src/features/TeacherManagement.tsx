import React, { useState, useEffect } from 'react';
import { Search, Plus, X, User, Phone, Mail, MapPin, Briefcase, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { 
    subscribeToStaffByPosition, 
    createStaff, 
    updateStaff, 
    deleteStaff, 
    StaffData 
} from '../services/staffService';

const TeacherManagement = () => {
    const [teachers, setTeachers] = useState<StaffData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // State cho Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form data (QUAN TRỌNG: Luôn set cứng position là 'teacher' để khớp với database cũ và các chức năng khác)
    const initialFormState: StaffData & { password?: string } = {
        name: '', email: '', phone: '', address: '', gender: 'Male',
        position: 'teacher', // KHÔI PHỤC LẠI 'teacher'
        salary: 0, hireDate: new Date().toISOString().split('T')[0],
        status: 'active', cccd: '', bio: ''
    };
    
    const [formData, setFormData] = useState<StaffData & { password?: string }>(initialFormState);

    useEffect(() => {
        // KHÔI PHỤC LẠI: Lấy những staff có position là 'teacher'
        const unsubscribe = subscribeToStaffByPosition('teacher', setTeachers);
        return () => unsubscribe();
    }, []);

    // Lọc danh sách giảng viên
    const filteredTeachers = teachers.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.phone.includes(searchTerm) || 
                            (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchStatus = statusFilter === 'All' || t.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Mở form thêm mới
    const handleOpenAdd = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    // Mở form xem/sửa khi bấm vào Card
    const handleCardClick = (teacher: StaffData) => {
        setEditingId(teacher.id!);
        // Loại bỏ password cũ khi edit để tránh lỗi không mong muốn, form edit không cho đổi pass trực tiếp ở đây
        const editData = { ...teacher };
        setFormData(editData);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Khi update, loại bỏ field password nếu có (thường Firebase Auth quản lý pass riêng)
                const { password, id, ...updateData } = formData;
                await updateStaff(editingId, updateData);
                alert("Cập nhật thông tin giảng viên thành công!");
            } else {
                // Khi tạo mới, truyền toàn bộ formData (bao gồm cả password để auth)
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
        if (window.confirm("Bạn có chắc chắn muốn xóa giảng viên này không? Hành động này không thể hoàn tác!")) {
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
        <div className="p-8 max-w-[1600px] mx-auto">
            {/* --- HEADER & TOOLBAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                {/* Tiêu đề bên trái */}
                <div className="w-full md:w-auto shrink-0">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Giảng Viên</h1>
                    <p className="text-slate-500 font-medium mt-1">Quản lý hồ sơ và đội ngũ giảng dạy</p>
                </div>

                {/* Tìm kiếm & Bộ lọc ở giữa */}
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

                {/* Nút thêm mới bên phải */}
                <div className="w-full md:w-auto flex justify-end shrink-0">
                    <button onClick={handleOpenAdd} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 w-full md:w-auto">
                        <Plus size={20} /> <span className="hidden sm:inline">Thêm Giảng Viên</span>
                    </button>
                </div>
            </div>

            {/* --- DANH SÁCH THẺ GIẢNG VIÊN --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeachers.map(teacher => (
                    <div 
                        key={teacher.id} 
                        onClick={() => handleCardClick(teacher)}
                        className="bg-white rounded-[2rem] p-6 shadow-sm border-2 border-slate-100 cursor-pointer hover:border-blue-300 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                    >
                        {/* Status Badge */}
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
                            <div className="pr-20"> {/* Padding right to avoid overlap with status badge */}
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

            {/* --- MODAL THÊM / SỬA GIẢNG VIÊN --- */}
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
                            {/* Thông tin cơ bản */}
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

                            {/* Cài đặt chuyên môn & Hệ thống */}
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