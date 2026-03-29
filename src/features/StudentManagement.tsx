import React, { useState, useEffect } from 'react';
import {
    subscribeToStudents, createStudent, updateStudent, deleteStudent, StudentData
} from '../services/studentService';
import {
    Search, Plus, Edit, Trash2, X, Phone, Mail,
    GraduationCap, Users, UserCheck, Clock, Filter, MapPin, IdCard, BookOpen
} from 'lucide-react';

const StudentManagement = () => {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

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

    // Thống kê nhanh
    const totalStudents = students.length;
    const studyingStudents = students.filter(s => s.status === 'Đang học').length;
    const waitingStudents = students.filter(s => s.status === 'Chờ xếp lớp').length;

    const getStatusStyle = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ĐANG HỌC': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'NỢ HỌC PHÍ': return 'bg-red-100 text-red-700 border-red-200';
            case 'CHỜ XẾP LỚP': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CHỜ THANH TOÁN': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'ĐÃ TỐT NGHIỆP': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-hidden font-sans">

            {/* HEADER & THỐNG KÊ */}
            <div className="shrink-0 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase">
                            <GraduationCap className="text-orange-500" size={32} /> Quản lý học viên
                        </h2>
                        <p className="text-slate-500 text-sm font-medium mt-1">Danh sách hồ sơ học viên chính thức tại hệ thống</p>
                    </div>
                    <button onClick={handleOpenCreate} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-sm w-full md:w-auto">
                        <Plus size={20} /> Thêm học viên mới
                    </button>
                </div>

                {/* THẺ THỐNG KÊ NHANH */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500"><Users size={24} /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng học viên</p>
                            <h3 className="text-2xl font-black text-slate-800">{totalStudents}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500"><UserCheck size={24} /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang học</p>
                            <h3 className="text-2xl font-black text-slate-800">{studyingStudents}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500"><Clock size={24} /></div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chờ xếp lớp</p>
                            <h3 className="text-2xl font-black text-slate-800">{waitingStudents}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* THANH TÌM KIẾM & LỌC */}
            <div className="flex flex-col md:flex-row gap-3 mb-6 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text" placeholder="Tìm kiếm theo tên, SĐT, Mã HV..."
                        className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 text-sm font-semibold transition-all shadow-sm"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                        className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 text-sm font-semibold transition-all shadow-sm appearance-none cursor-pointer"
                        value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value="Chờ xếp lớp">Chờ xếp lớp</option>
                        <option value="Đang học">Đang học</option>
                        <option value="Bảo lưu">Bảo lưu</option>
                        <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                        <option value="Nợ học phí">Nợ học phí</option>
                    </select>
                </div>
            </div>

            {/* BẢNG DỮ LIỆU */}
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredStudents.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                                <tr>
                                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Học viên</th>
                                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Thông tin liên hệ</th>
                                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
                                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                    <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-8">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border border-blue-200/50 shrink-0">
                                                    {student.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">{student.full_name}</h3>
                                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Mã: <span className="text-slate-500">{student.student_code}</span></p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1.5">
                                                <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center"><Phone size={12} className="text-slate-500"/></div>
                                                    {student.phone}
                                                </p>
                                                {student.email && (
                                                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                        <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center"><Mail size={12} className="text-slate-500"/></div>
                                                        {student.email}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-medium text-slate-600 line-clamp-2 max-w-[200px] flex items-start gap-2">
                                                {student.note ? <><BookOpen size={16} className="text-slate-400 mt-0.5 shrink-0"/> {student.note}</> : <span className="text-slate-400 italic">Không có</span>}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${getStatusStyle(student.status)} inline-flex items-center gap-1.5`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                                                {student.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenEdit(student)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl transition-all" title="Chỉnh sửa">
                                                    <Edit size={18}/>
                                                </button>
                                                <button onClick={() => deleteStudent(student.id!)} className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Xóa">
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Search size={40} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy học viên</h3>
                            <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">{editingId ? 'Cập nhật hồ sơ' : 'Thêm học viên mới'}</h2>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Điền đầy đủ các thông tin bắt buộc (*)</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cột trái */}
                                <div className="space-y-5">
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                        <IdCard size={18} className="text-orange-500"/> Thông tin cơ bản
                                    </h3>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Mã học viên <span className="text-red-500">*</span></label>
                                        <input required className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.student_code} onChange={e => setFormData({...formData, student_code: e.target.value})} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Họ và tên <span className="text-red-500">*</span></label>
                                        <input required placeholder="VD: Nguyễn Văn A" className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Số điện thoại <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                                <input required className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Số CCCD</label>
                                            <input className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                {/* Cột phải */}
                                <div className="space-y-5">
                                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                        <BookOpen size={18} className="text-orange-500"/> Thông tin bổ sung
                                    </h3>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Email cá nhân</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                            <input type="email" placeholder="email@example.com" className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600 ml-1">Địa chỉ thường trú</label>
                                        <div className="relative">
                                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                            <input className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Trạng thái</label>
                                            <select className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 cursor-pointer shadow-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as string})}>
                                                <option value="Chờ xếp lớp">Chờ xếp lớp</option>
                                                <option value="Đang học">Đang học</option>
                                                <option value="Bảo lưu">Bảo lưu</option>
                                                <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                                                <option value="Nợ học phí">Nợ học phí</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-600 ml-1">Ghi chú thêm</label>
                                            <input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-xl outline-none font-semibold text-slate-700 transition-all shadow-sm" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="..." />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                        
                        <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                Hủy bỏ
                            </button>
                            <button onClick={handleSubmit} className="px-8 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">
                                {editingId ? 'Lưu cập nhật' : 'Xác nhận thêm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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