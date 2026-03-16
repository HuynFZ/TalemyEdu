import React, { useState, useEffect } from 'react';
import {
    UserPlus, Search, Filter, Mail, Phone,
    MoreVertical, X, MapPin, DollarSign, Calendar, User, Users
} from 'lucide-react';
import { Role } from '../context/AuthContext';
import { createStaff, subscribeToStaffs, StaffData } from '../services/staffService';

const StaffManagement = () => {
    const [staffList, setStaffList] = useState<StaffData[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'All' | Role>('All');

    const [formData, setFormData] = useState<StaffData>({
        name: '', email: '', phone: '', address: '',
        gender: 'Male', position: 'teacher', salary: 0,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active'
    });

    useEffect(() => {
        const unsubscribe = subscribeToStaffs((data) => setStaffList(data));
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.endsWith('@talemy.edu')) return alert("Email phải là @talemy.edu");
        setLoading(true);
        try {
            await createStaff(formData);
            setIsModalOpen(false);
            setFormData({
                name: '', email: '', phone: '', address: '',
                gender: 'Male', position: 'teacher', salary: 0,
                hireDate: new Date().toISOString().split('T')[0],
                status: 'active'
            });
        } catch (err) { alert("Lỗi hệ thống!"); } finally { setLoading(false); }
    };

    const filteredStaff = staffList.filter(s =>
        (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterRole === 'All' || s.position === filterRole)
    );

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen overflow-y-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-2xl font-black text-slate-800">Đội ngũ Talemy</h2>
                <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg">
                    <UserPlus size={20} className="inline mr-2" /> Thêm nhân viên
                </button>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStaff.map((staff) => (
                    <div key={staff.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm relative">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-orange-600 mb-4 uppercase">{staff.name.charAt(0)}</div>
                        <h3 className="font-black text-slate-800">{staff.name}</h3>
                        <p className="text-[10px] font-black uppercase text-orange-500 mb-4">{staff.position}</p>
                        <div className="space-y-2 text-[12px] text-slate-500">
                            <p className="flex items-center gap-2"><Mail size={14} /> {staff.email}</p>
                            <p className="flex items-center gap-2"><Phone size={14} /> {staff.phone}</p>
                            <p className="flex items-center gap-2"><MapPin size={14} /> {staff.address}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* FULL FORM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-[2.5rem] shadow-2xl flex flex-col">
                        <div className="p-6 bg-orange-500 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">Hồ Sơ Nhân Sự Đầy Đủ</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={28} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto max-h-[80vh]">
                            {/* Thông tin chính */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên *</label>
                                <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input required className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Doanh Nghiệp *</label>
                                <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input required type="email" placeholder="ten.role@talemy.edu" className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số Điện Thoại *</label>
                                <div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input required className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mức Lương (VND) *</label>
                                <div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input required type="number" className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} /></div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới Tính</label>
                                <div className="relative"><Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><select className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                                    <option value="Male">Nam</option><option value="Female">Nữ</option><option value="Other">Khác</option>
                                </select></div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày Vào Làm</label>
                                <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="date" className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none font-bold" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} /></div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa Chỉ Thường Trú *</label>
                                <div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input required className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức Vụ Hệ Thống</label>
                                <select className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-orange-100" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value as any})}>
                                    <option value="admin">Quản trị viên (Admin)</option>
                                    <option value="teacher">Giảng viên (Teacher)</option>
                                    <option value="pt">Trợ giảng (PT)</option>
                                    <option value="sale">Tư vấn (Sale)</option>
                                    <option value="finance">Kế toán (Finance)</option>
                                </select>
                            </div>

                            <button disabled={loading} type="submit" className="md:col-span-2 bg-orange-500 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-orange-600 transition-all active:scale-95 mt-4">
                                {loading ? "ĐANG ĐỒNG BỘ CLOUD..." : "LƯU HỒ SƠ NHÂN SỰ"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;