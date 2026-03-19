import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, User, Phone, Mail, MapPin, Briefcase, FileText } from 'lucide-react';
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

    // State cho Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form data (Luôn set cứng position là 'teacher')
    const [formData, setFormData] = useState<StaffData & { password?: string }>({
        name: '',
        email: '',
        phone: '',
        address: '',
        gender: 'Male',
        position: 'teacher', // QUAN TRỌNG: Cố định là teacher
        salary: 0,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active',
        cccd: '',
        bio: ''
    });

    useEffect(() => {
        // Chỉ lấy những staff có position là 'teacher'
        const unsubscribe = subscribeToStaffByPosition('teacher', setTeachers);
        return () => unsubscribe();
    }, []);

    const filteredTeachers = teachers.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.phone.includes(searchTerm) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            name: '', email: '', phone: '', address: '', gender: 'Male',
            position: 'teacher', salary: 0, hireDate: new Date().toISOString().split('T')[0],
            status: 'active', cccd: '', bio: '', password: '123' // Pass mặc định khi tạo mới
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (teacher: StaffData) => {
        setEditingId(teacher.id!);
        setFormData({ ...teacher });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa giáo viên này? Dữ liệu hợp đồng liên quan có thể bị ảnh hưởng.")) {
            try {
                await deleteStaff(id);
                alert("Xóa thành công!");
            } catch (error) {
                alert("Lỗi khi xóa giáo viên!");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Xóa thuộc tính password nếu có trước khi update
                const { password, id, ...updateData } = formData;
                await updateStaff(editingId, updateData);
                alert("Cập nhật thành công!");
            } else {
                await createStaff(formData);
                alert("Thêm giáo viên thành công!");
            }
            setIsModalOpen(false);
        } catch (error) {
            alert("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Briefcase className="text-blue-500" size={32} /> Quản lý Giáo viên
                    </h2>
                    <p className="text-slate-500 text-sm italic mt-1">Danh sách đội ngũ giảng viên học thuật</p>
                </div>
                
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" placeholder="Tìm tên, SĐT, Email..." 
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 outline-none focus:border-blue-500 text-sm font-medium"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    <button onClick={handleOpenCreate} className="bg-blue-500 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-blue-600 flex items-center gap-2 text-sm whitespace-nowrap">
                        <Plus size={18} /> Thêm Giáo Viên
                    </button>
                </div>
            </div>

            {/* DANH SÁCH GIÁO VIÊN */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xl">
                                    {teacher.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800">{teacher.name}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${teacher.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {teacher.status === 'active' ? 'ĐANG DẠY' : 'TẠM NGHỈ'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenEdit(teacher)} className="p-2 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16}/></button>
                                <button onClick={() => handleDelete(teacher.id!)} className="p-2 bg-slate-50 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </div>

                        <div className="space-y-2 mt-5 text-sm">
                            <p className="text-slate-600 flex items-center gap-3"><Phone size={16} className="text-slate-400"/> <strong>{teacher.phone}</strong></p>
                            <p className="text-slate-600 flex items-center gap-3"><Mail size={16} className="text-slate-400"/> {teacher.email}</p>
                            <p className="text-slate-600 flex items-center gap-3"><FileText size={16} className="text-slate-400"/> CCCD: {teacher.cccd || 'Chưa cập nhật'}</p>
                            {teacher.bio && (
                                <p className="text-slate-500 text-xs italic bg-slate-50 p-3 rounded-xl mt-3 line-clamp-2">"{teacher.bio}"</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL THÊM / SỬA GIÁO VIÊN */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-blue-500 text-white flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black">{editingId ? 'Cập nhật Giáo Viên' : 'Thêm Giáo Viên Mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* THÔNG TIN CƠ BẢN */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b pb-2">1. Thông tin cơ bản</h3>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên *</label>
                                        <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Số điện thoại *</label>
                                        <input type="tel" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Email (Dùng làm Username) *</label>
                                        <input type="email" required disabled={!!editingId} className={`w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold ${editingId ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-blue-500'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Giới tính</label>
                                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                                            <option value="Male">Nam</option><option value="Female">Nữ</option><option value="Other">Khác</option>
                                        </select>
                                    </div>
                                </div>

                                {/* THÔNG TIN HÀNH CHÍNH & TIỂU SỬ */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b pb-2">2. Hành chính & Tiểu sử</h3>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Số CCCD *</label>
                                        <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ thường trú *</label>
                                        <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Lương Cơ Bản</label>
                                            <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Ngày nhận việc</label>
                                            <input type="date" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái làm việc</label>
                                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                            <option value="active">Đang giảng dạy</option><option value="inactive">Tạm nghỉ / Đã nghỉ</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Bio / Tiểu sử học thuật (Sẽ hiện lên hợp đồng hoặc website)</label>
                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-medium h-24 resize-none" placeholder="VD: IELTS 8.0, Tốt nghiệp ĐH Ngoại Thương..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Hủy</button>
                                <button type="submit" className="px-8 py-3 bg-blue-500 text-white font-black rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-200">
                                    {editingId ? 'LƯU THAY ĐỔI' : 'TẠO GIÁO VIÊN MỚI'}
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