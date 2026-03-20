import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Edit, Trash2, X, User, Phone, Mail,
    MapPin, Briefcase, FileText, AlertCircle, CheckCircle2, ChevronRight
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
    const [teachers, setTeachers] = useState<StaffData[]>([]);
    const [requests, setRequests] = useState<any[]>([]); // Danh sách yêu cầu đổi lịch chờ duyệt
    const [searchTerm, setSearchTerm] = useState('');

    // State cho Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState<StaffData & { password?: string }>({
        name: '', email: '', phone: '', address: '', gender: 'Male',
        position: 'teacher', salary: 0, hireDate: new Date().toISOString().split('T')[0],
        status: 'active', cccd: '', bio: ''
    });

    useEffect(() => {
        // 1. Theo dõi danh sách giáo viên
        const unsubscribeTeachers = subscribeToStaffByPosition('teacher', setTeachers);

        // 2. Theo dõi yêu cầu đổi lịch đang chờ (Status = pending)
        const qReq = query(collection(db, "scheduleRequests"), where("status", "==", "pending"));
        const unsubscribeReq = onSnapshot(qReq, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubscribeTeachers();
            unsubscribeReq();
        };
    }, []);

    // --- XỬ LÝ PHÊ DUYỆT LỊCH ---
    const handleApproveSchedule = async (req: any) => {
        try {
            // Cập nhật lịch mới vào thông tin cá nhân của GV
            await updateDoc(doc(db, "staffs", req.teacherId), {
                fixedSchedule: req.newSchedule
            });
            // Đánh dấu yêu cầu là đã duyệt
            await updateDoc(doc(db, "scheduleRequests", req.id), {
                status: 'approved'
            });
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

    // --- XỬ LÝ CRUD GIÁO VIÊN ---
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
            status: 'active', cccd: '', bio: '', password: '123'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (teacher: StaffData) => {
        setEditingId(teacher.id!);
        setFormData({ ...teacher });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Xóa giáo viên này? Dữ liệu hợp đồng liên quan có thể bị ảnh hưởng.")) {
            try { await deleteStaff(id); } catch (e) { alert("Lỗi!"); }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { password, id, ...updateData } = formData;
                await updateStaff(editingId, updateData);
            } else {
                await createStaff(formData);
            }
            setIsModalOpen(false);
        } catch (error) { alert("Lỗi hệ thống!"); }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar">

            {/* --- PHẦN 1: DUYỆT ĐỔI LỊCH (CHỈ HIỆN KHI CÓ YÊU CẦU) --- */}
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

            {/* --- PHẦN 2: HEADER & QUẢN LÝ --- */}
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
                    <button onClick={handleOpenCreate} className="bg-blue-500 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-blue-600 flex items-center gap-2 text-sm active:scale-95 transition-all">
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
                                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xl uppercase">
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
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL THÊM / SỬA GIÁO VIÊN GIỮ NGUYÊN --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-blue-500 text-white flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">{editingId ? 'Cập nhật Giáo Viên' : 'Thêm Giáo Viên Mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b pb-2">1. Thông tin cơ bản</h3>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Họ và Tên *</label>
                                        <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Số điện thoại *</label>
                                        <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email *</label>
                                        <input required type="email" disabled={!!editingId} className={`w-full p-3 border rounded-xl font-bold ${editingId ? 'bg-slate-100 cursor-not-allowed' : 'bg-slate-50'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 border-b pb-2">2. Hành chính</h3>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Số CCCD *</label>
                                        <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Địa chỉ thường trú *</label>
                                        <input required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Lương CB</label>
                                            <input type="number" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Trạng thái</label>
                                            <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={teacher.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="active">Đang dạy</option><option value="inactive">Tạm nghỉ</option></select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-all uppercase">{editingId ? 'LƯU THAY ĐỔI' : 'TẠO GIÁO VIÊN MỚI'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherManagement;