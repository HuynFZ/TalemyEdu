import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Trash2, Phone, Mail, UserCheck, AlertCircle, Clock, GraduationCap, ShieldAlert } from 'lucide-react';
import { subscribeToStudents, createStudent, updateStudent, deleteStudent, StudentData } from '../services/studentService';

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
        const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.phone.includes(searchTerm) || s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({
            studentCode: `HV${Math.floor(Math.random() * 10000)}`, fullName: '', phone: '', email: '', cccd: '', address: '', 
            enrolledCourse: '', totalFee: 0, paidAmount: 0, status: 'CHỜ THANH TOÁN', note: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (student: StudentData) => {
        setEditingId(student.id!);
        setFormData({ ...student });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa hồ sơ học viên này?")) {
            try { await deleteStudent(id); } catch (error) { alert("Lỗi khi xóa!"); }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateStudent(editingId, formData);
                alert("Cập nhật thành công!");
            } else {
                await createStudent(formData);
                alert("Thêm học viên thành công!");
            }
            setIsModalOpen(false);
        } catch (error) { alert("Có lỗi xảy ra!"); }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const renderStatus = (status: string) => {
        switch(status) {
            case 'CHỜ THANH TOÁN': return <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black w-max"><Clock size={12}/> CHỜ THANH TOÁN</span>;
            case 'NỢ HỌC PHÍ': return <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-black w-max"><ShieldAlert size={12}/> NỢ HỌC PHÍ</span>;
            case 'ĐANG HỌC': return <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-black w-max"><UserCheck size={12}/> ĐANG HỌC</span>;
            case 'BẢO LƯU': return <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg text-[10px] font-black w-max"><AlertCircle size={12}/> BẢO LƯU</span>;
            case 'ĐÃ TỐT NGHIỆP': return <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[10px] font-black w-max"><GraduationCap size={12}/> ĐÃ TỐT NGHIỆP</span>;
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col relative bg-slate-50 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <UserCheck className="text-orange-500" size={32} /> Quản lý Học viên
                    </h2>
                    <p className="text-slate-500 text-sm italic mt-1">Theo dõi tình trạng học tập và học phí của học viên chính thức</p>
                </div>
                <div className="w-full xl:max-w-2xl flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Tìm tên, SĐT, Mã HV..." className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <select className="px-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none font-bold text-slate-700 text-sm cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">Tất cả trạng thái</option>
                        <option value="CHỜ THANH TOÁN">Chờ thanh toán</option>
                        <option value="NỢ HỌC PHÍ">Nợ học phí</option>
                        <option value="ĐANG HỌC">Đang học</option>
                        <option value="BẢO LƯU">Bảo lưu</option>
                        <option value="ĐÃ TỐT NGHIỆP">Đã tốt nghiệp</option>
                    </select>
                    <button onClick={openCreateModal} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center justify-center gap-2 text-sm whitespace-nowrap">
                        <Plus size={20} /> Thêm HV
                    </button>
                </div>
            </div>

            {/* Bảng Học Viên */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Học Viên</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Khóa Học</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Tiến Độ Học Phí</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Trạng Thái</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((student) => {
                                const feePercent = student.totalFee > 0 ? Math.min((student.paidAmount / student.totalFee) * 100, 100) : 0;
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50/50 group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-orange-100 text-orange-600 font-black rounded-xl flex items-center justify-center shrink-0">
                                                    {student.fullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{student.fullName} <span className="text-xs text-slate-400 font-normal">({student.studentCode})</span></p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{student.phone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 font-bold text-slate-700 text-sm">{student.enrolledCourse}</td>
                                        <td className="p-5">
                                            <div className="w-full max-w-[200px]">
                                                <div className="flex justify-between text-[10px] font-bold mb-1">
                                                    <span className="text-slate-500">Đã đóng: {formatCurrency(student.paidAmount)}</span>
                                                    <span className={feePercent === 100 ? 'text-emerald-500' : 'text-orange-500'}>{Math.round(feePercent)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className={`h-full rounded-full ${feePercent === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${feePercent}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">Tổng: {formatCurrency(student.totalFee)}</p>
                                            </div>
                                        </td>
                                        <td className="p-5">{renderStatus(student.status)}</td>
                                        <td className="p-5">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(student)} className="p-2 bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white rounded-xl"><Edit size={16}/></button>
                                                <button onClick={() => handleDelete(student.id!)} className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Thêm/Sửa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 bg-orange-500 text-white flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-black">{editingId ? 'Cập nhật Học viên' : 'Thêm Học viên mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-xl"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mã Học Viên</label>
                                    <input type="text" disabled className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500" value={formData.studentCode} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái *</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                        <option value="CHỜ THANH TOÁN">Chờ thanh toán</option>
                                        <option value="NỢ HỌC PHÍ">Nợ học phí</option>
                                        <option value="ĐANG HỌC">Đang học</option>
                                        <option value="BẢO LƯU">Bảo lưu</option>
                                        <option value="ĐÃ TỐT NGHIỆP">Đã tốt nghiệp</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên *</label>
                                <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số điện thoại *</label>
                                    <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Khóa học đăng ký *</label>
                                    <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.enrolledCourse} onChange={e => setFormData({...formData, enrolledCourse: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tổng Học Phí (VNĐ) *</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800" value={formData.totalFee} onChange={e => setFormData({...formData, totalFee: Number(e.target.value)})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Đã Thanh Toán (VNĐ) *</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-orange-600" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: Number(e.target.value)})} />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg hover:bg-orange-600 transition-all active:scale-[0.98] mt-4 uppercase">
                                {editingId ? 'LƯU THAY ĐỔI' : 'TẠO HỒ SƠ HỌC VIÊN'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;