import React, { useState, useEffect } from 'react';
import {
    subscribeToStudents, createStudent, updateStudent, deleteStudent, StudentData
} from '../services/studentService';
import {
    Search, Plus, Edit, Trash2, X, Phone, Mail,
    GraduationCap
} from 'lucide-react';

const StudentManagement = () => {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Đã xóa các trường enrolled_course, total_fee, paid_amount để chuẩn hóa với Interface
    const initialForm: Omit<StudentData, 'id' | 'created_at'> = {
        student_code: '',
        full_name: '',
        phone: '',
        email: '',
        cccd: '',
        address: '',
        status: 'Chờ xếp lớp', 
        note: ''
    };
    
    const [formData, setFormData] = useState<any>(initialForm);

    useEffect(() => {
        let channel: any;
        subscribeToStudents((data) => {
            setStudents(data);
        });
        // Sửa lại đoạn cleanup realtime cho chuẩn
        return () => { if (typeof channel === 'function') channel(); };
    }, []);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ ...initialForm, student_code: `HV${Math.floor(1000 + Math.random() * 9000)}` });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (student: StudentData) => {
        setEditingId(student.id!);
        setFormData({ ...student });
        setIsModalOpen(true);
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
            alert('Lỗi hệ thống!');
        }
    };

    const filteredStudents = students.filter(s => {
        const matchSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.phone?.includes(searchTerm) ||
            s.student_code?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ĐANG HỌC': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'NỢ HỌC PHÍ': return 'bg-red-50 text-red-600 border-red-100';
            case 'CHỜ THANH TOÁN': return 'bg-orange-50 text-orange-600 border-orange-100';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-hidden font-sans">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase italic">
                        <GraduationCap className="text-orange-500" size={32} /> Quản lý học viên
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-1">Danh sách học viên chính thức tại hệ thống</p>
                </div>

                <div className="flex w-full md:w-auto gap-3 flex-wrap md:flex-nowrap">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text" placeholder="Tìm tên, SĐT, Mã HV..."
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-orange-500/10 text-sm font-bold transition-all shadow-sm"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button onClick={handleOpenCreate} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm whitespace-nowrap w-full md:w-auto">
                        <Plus size={20} /> Thêm học viên
                    </button>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
                        <tr className="border-b border-slate-100">
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Học viên</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Liên hệ</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ghi chú</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-blue-100">
                                            {student.full_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-sm leading-tight">{student.full_name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">ID: {student.student_code}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="space-y-1">
                                        <p className="flex items-center gap-2 text-xs font-bold text-slate-700"><Phone size={12} className="text-slate-300"/> {student.phone}</p>
                                        <p className="flex items-center gap-2 text-xs font-medium text-slate-400"><Mail size={12} className="text-slate-300"/> {student.email}</p>
                                    </div>
                                </td>
                                <td className="p-6">
                                    {/* Thay cột Học phí bằng Ghi chú */}
                                    <p className="text-xs font-medium text-slate-500 line-clamp-2">{student.note || '---'}</p>
                                </td>
                                <td className="p-6">
                                        <span className={`px-3 py-1 text-[9px] font-black rounded-lg border uppercase tracking-widest ${getStatusStyle(student.status)}`}>
                                            {student.status}
                                        </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenEdit(student)} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                                            <Edit size={16}/>
                                        </button>
                                        <button onClick={() => deleteStudent(student.id!)} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 bg-orange-500 text-white flex justify-between items-center shadow-lg">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">{editingId ? 'Cập nhật hồ sơ' : 'Khởi tạo học viên'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-2xl transition-all"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                            <div className="space-y-4">
                                <h3 className="font-black text-slate-800 border-b pb-2 text-xs uppercase tracking-widest text-orange-500">Thông tin định danh</h3>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mã học viên *</label>
                                    <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.student_code} onChange={e => setFormData({...formData, student_code: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Họ và tên *</label>
                                    <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Số điện thoại *</label>
                                        <input required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Số CCCD</label>
                                        <input className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Địa chỉ thường trú</label>
                                    <input className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-black text-slate-800 border-b pb-2 text-xs uppercase tracking-widest text-orange-500">Thông tin bổ sung</h3>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Email cá nhân</label>
                                    <input required type="email" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ghi chú thêm</label>
                                    <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Ghi chú về học viên..." />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Trạng thái học viên</label>
                                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-slate-700 cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as string})}>
                                        <option value="Chờ xếp lớp">Chờ xếp lớp</option>
                                        <option value="Đang học">Đang học</option>
                                        <option value="Bảo lưu">Bảo lưu</option>
                                        <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                                        <option value="Nợ học phí">Nợ học phí</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="md:col-span-2 py-5 bg-orange-500 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-orange-600 transition-all uppercase tracking-[0.2em] mt-4">
                                {editingId ? 'Lưu thay đổi hồ sơ' : 'Xác nhận khởi tạo học viên'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default StudentManagement;