import React, { useState, useEffect } from 'react';
import { subscribeToStudents, createStudent, updateStudent, deleteStudent, StudentData } from '../services/studentService';
import { Search, Plus, Edit, Trash2, X, Phone, Mail, GraduationCap, MapPin, CreditCard, Filter, UserCheck } from 'lucide-react';
const StudentManagement = () => {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<StudentData, 'id' | 'createdAt'>>({
        studentCode: '', fullName: '', phone: '', email: '', cccd: '', address: '', 
        enrolledCourse: '', totalFee: 0, paidAmount: 0, status: 'CHỜ THANH TOÁN', note: ''
    });

    useEffect(() => {
        const unsubscribe = subscribeToStudents(setStudents);
        return () => unsubscribe();
    }, []);

    const filteredStudents = students.filter(s => {
        const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.phone.includes(searchTerm) || 
                            s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            studentCode: `HV${Math.floor(Math.random() * 10000)}`, // Tự render mã random
            fullName: '', phone: '', email: '', cccd: '', address: '', 
            enrolledCourse: '', totalFee: 0, paidAmount: 0, status: 'CHỜ THANH TOÁN', note: ''
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (student: StudentData) => {
        setEditingId(student.id!);
        // @ts-ignore
        setFormData({ ...student });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa hồ sơ học viên này? Hành động này không thể hoàn tác.')) {
            try {
                await deleteStudent(id);
                alert('Xóa thành công!');
            } catch (error) {
                alert('Lỗi khi xóa!');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateStudent(editingId, formData);
                alert('Cập nhật thành công!');
            } else {
                await createStudent(formData);
                alert('Tạo học viên thành công!');
            }
            setIsModalOpen(false);
        } catch (error) {
            alert('Có lỗi xảy ra, vui lòng thử lại!');
        }
    };

    // Hàm format tiền tệ
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Hàm tô màu Badge trạng thái
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'CHỜ THANH TOÁN': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'NỢ HỌC PHÍ': 'bg-red-100 text-red-700 border-red-200',
            'ĐANG HỌC': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'BẢO LƯU': 'bg-slate-100 text-slate-700 border-slate-200',
            'ĐÃ TỐT NGHIỆP': 'bg-blue-100 text-blue-700 border-blue-200'
        };
        return <span className={`px-3 py-1 text-xs font-bold rounded-full border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
    };

    return (
        // Sử dụng h-full và overflow-hidden cho container gốc để khóa cuộn toàn trang
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-hidden">
            
            {/* HEADER & CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <GraduationCap className="text-orange-500" size={32} /> Quản lý Học viên
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Tổng số: <strong className="text-slate-800">{filteredStudents.length}</strong> học viên</p>
                </div>
                
                <div className="flex w-full md:w-auto gap-3 flex-wrap md:flex-nowrap">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" placeholder="Tìm tên, SĐT, Mã HV..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-sm font-medium transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    
                    <div className="relative flex-1 md:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 text-sm font-medium cursor-pointer appearance-none"
                            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Tất cả trạng thái</option>
                            <option value="CHỜ THANH TOÁN">Chờ thanh toán</option>
                            <option value="NỢ HỌC PHÍ">Nợ học phí</option>
                            <option value="ĐANG HỌC">Đang học</option>
                            <option value="BẢO LƯU">Bảo lưu</option>
                            <option value="ĐÃ TỐT NGHIỆP">Đã tốt nghiệp</option>
                        </select>
                    </div>

                    <button onClick={handleOpenCreate} className="bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full md:w-auto">
                        <Plus size={18} /> Thêm Học Viên
                    </button>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU CÓ THANH CUỘN (Scrollable Table) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        {/* thead có thuộc tính sticky để ghim chặt trên cùng khi cuộn xuống */}
                        <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Học Viên</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Liên hệ</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Khóa học & Học phí</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-slate-500 font-medium">
                                        Không tìm thấy học viên nào.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black text-lg shrink-0">
                                                    {student.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{student.fullName}</h3>
                                                    <p className="text-xs font-semibold text-slate-400">Mã: {student.studentCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1 text-sm font-medium">
                                                <p className="flex items-center gap-2 text-slate-700"><Phone size={14} className="text-slate-400"/> {student.phone}</p>
                                                <p className="flex items-center gap-2 text-slate-500"><Mail size={14} className="text-slate-400"/> {student.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 mb-1">{student.enrolledCourse || 'Chưa xếp lớp'}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-slate-500">Đã nộp:</span>
                                                    <span className="font-bold text-emerald-600">{formatCurrency(student.paidAmount)}</span>
                                                    <span className="text-slate-400">/</span>
                                                    <span className="font-bold text-slate-800">{formatCurrency(student.totalFee)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(student.status)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenEdit(student)} className="p-2 bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors tooltip" title="Chỉnh sửa">
                                                    <Edit size={16}/>
                                                </button>
                                                <button onClick={() => handleDelete(student.id!)} className="p-2 bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Xóa">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL THÊM / SỬA HỌC VIÊN */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-orange-500 text-white flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black">{editingId ? 'Cập nhật Hồ sơ Học viên' : 'Thêm Học viên Mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* CỘT 1: THÔNG TIN CÁ NHÂN */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2"><UserCheck size={18} className="text-orange-500"/> Thông tin cá nhân</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Mã Học Viên *</label>
                                            <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.studentCode} onChange={e => setFormData({...formData, studentCode: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên *</label>
                                            <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Số Điện Thoại *</label>
                                            <input type="tel" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Số CCCD</label>
                                            <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                                        <input type="email" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ thường trú</label>
                                        <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                    </div>
                                </div>

                                {/* CỘT 2: THÔNG TIN HỌC TẬP & HỌC PHÍ */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2"><CreditCard size={18} className="text-orange-500"/> Khóa học & Học phí</h3>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Khóa Đang Học</label>
                                        <input type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="VD: IELTS Intensive..." value={formData.enrolledCourse} onChange={e => setFormData({...formData, enrolledCourse: e.target.value})} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Tổng Học Phí (VNĐ)</label>
                                            <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={formData.totalFee} onChange={e => setFormData({...formData, totalFee: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Đã Thanh Toán (VNĐ)</label>
                                            <input type="number" required className="w-full p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold outline-emerald-500" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: Number(e.target.value)})} />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng Thái Học Viên</label>
                                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-orange-500 cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                            <option value="CHỜ THANH TOÁN">⏳ Chờ thanh toán</option>
                                            <option value="NỢ HỌC PHÍ">⚠️ Nợ học phí</option>
                                            <option value="ĐANG HỌC">✅ Đang học</option>
                                            <option value="BẢO LƯU">⏸️ Bảo lưu</option>
                                            <option value="ĐÃ TỐT NGHIỆP">🎓 Đã tốt nghiệp</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú thêm</label>
                                        <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium h-20 resize-none" placeholder="Nhập ghi chú (nếu có)..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex gap-3 justify-end mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                                <button type="submit" className="px-8 py-3 bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95">
                                    {editingId ? 'LƯU THAY ĐỔI' : 'TẠO HỒ SƠ HỌC VIÊN'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSS Tùy chỉnh thanh cuộn cho bảng */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default StudentManagement;