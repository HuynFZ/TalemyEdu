import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit, Trash2, Mail, Phone, CreditCard, MapPin, UserCheck, UserMinus, GraduationCap } from 'lucide-react';
import { subscribeToTeachers, createTeacher, updateTeacher, deleteTeacher, TeacherData } from '../services/teacherService';

const TeacherManagement = () => {
    const [teachers, setTeachers] = useState<TeacherData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<TeacherData, 'id' | 'createdAt'>>({
        fullName: '',
        phone: '',
        email: '',
        cccd: '',
        address: '',
        status: 'ĐANG GIẢNG DẠY',
        note: ''
    });

    useEffect(() => {
        const unsubscribe = subscribeToTeachers(setTeachers);
        return () => unsubscribe();
    }, []);

    const filteredTeachers = teachers.filter(t => 
        t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.phone.includes(searchTerm) || 
        t.cccd.includes(searchTerm)
    );

    const openCreateModal = () => {
        setEditingId(null);
        setFormData({ fullName: '', phone: '', email: '', cccd: '', address: '', status: 'ĐANG GIẢNG DẠY', note: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (teacher: TeacherData) => {
        setEditingId(teacher.id!);
        setFormData({
            fullName: teacher.fullName, phone: teacher.phone, email: teacher.email,
            cccd: teacher.cccd, address: teacher.address, status: teacher.status, note: teacher.note || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa giảng viên này?")) {
            try { await deleteTeacher(id); } 
            catch (error) { alert("Lỗi khi xóa!"); }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateTeacher(editingId, formData);
                alert("Cập nhật thành công!");
            } else {
                await createTeacher(formData);
                alert("Thêm giảng viên thành công!");
            }
            setIsModalOpen(false);
        } catch (error) {
            alert("Có lỗi xảy ra, vui lòng thử lại!");
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col relative bg-slate-50 overflow-y-auto custom-scrollbar">
            {/* Header & Công cụ */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <GraduationCap className="text-orange-500" size={32} /> Quản lý Giảng viên
                    </h2>
                    <p className="text-slate-500 text-sm italic mt-1">Quản lý hồ sơ và thông tin liên lạc của đội ngũ giáo viên</p>
                </div>
                <div className="w-full xl:max-w-xl flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Tìm tên, SĐT, CCCD..." className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 outline-none shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={openCreateModal} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center justify-center gap-2 text-sm transition-all active:scale-95 whitespace-nowrap">
                        <Plus size={20} /> Thêm Giảng viên
                    </button>
                </div>
            </div>

            {/* Lưới Danh sách Giảng viên */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeachers.map(teacher => (
                    <div key={teacher.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-orange-200 transition-all group relative">
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(teacher)} className="p-2 bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white rounded-xl transition-all"><Edit size={14}/></button>
                            <button onClick={() => handleDelete(teacher.id!)} className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={14}/></button>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 text-orange-600 font-black text-xl rounded-2xl flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                                {teacher.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800 text-lg group-hover:text-orange-600 transition-colors">{teacher.fullName}</h3>
                                {teacher.status === 'ĐANG GIẢNG DẠY' 
                                    ? <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 mt-1"><UserCheck size={10}/> ĐANG DẠY</span>
                                    : <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 mt-1"><UserMinus size={10}/> TẠM NGHỈ</span>
                                }
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="flex items-center gap-3 text-sm text-slate-600"><Phone size={16} className="text-slate-400"/> <strong>{teacher.phone}</strong></p>
                            <p className="flex items-center gap-3 text-sm text-slate-600"><Mail size={16} className="text-slate-400"/> {teacher.email}</p>
                            <p className="flex items-center gap-3 text-sm text-slate-600"><CreditCard size={16} className="text-slate-400"/> {teacher.cccd}</p>
                            <p className="flex items-start gap-3 text-sm text-slate-600"><MapPin size={16} className="text-slate-400 shrink-0 mt-0.5"/> <span className="line-clamp-2">{teacher.address}</span></p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Thêm/Sửa */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 bg-orange-500 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black">{editingId ? 'Cập nhật Giảng viên' : 'Thêm Giảng viên mới'}</h3>
                                <p className="text-xs opacity-90 mt-1">Thông tin này sẽ được dùng để in lên Hợp đồng học viên.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Họ và Tên *</label>
                                    <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái</label>
                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                        <option value="ĐANG GIẢNG DẠY">Đang giảng dạy</option>
                                        <option value="TẠM NGHỈ">Tạm nghỉ</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Số điện thoại *</label>
                                    <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                                    <input type="email" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Số CCCD / CMND (Dùng cho Hợp đồng) *</label>
                                <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ thường trú *</label>
                                <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú thêm</label>
                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm h-24" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
                            </div>

                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all active:scale-[0.98] mt-4 uppercase">
                                {editingId ? 'LƯU THAY ĐỔI' : 'TẠO GIẢNG VIÊN'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherManagement;