import React, { useState, useEffect } from 'react';
import {
    UserPlus, Search, Mail, Phone, X, MapPin, DollarSign,
    Calendar, User, Users, CheckCircle2, AlertCircle, ChevronRight
} from 'lucide-react';
import { Role } from '../context/AuthContext';
import { createStaff, subscribeToStaffs, StaffData } from '../services/staffService';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';

const StaffManagement = () => {
    const [staffList, setStaffList] = useState<StaffData[]>([]);
    const [requests, setRequests] = useState<any[]>([]); // Danh sách chờ duyệt
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<StaffData>({
        name: '', email: '', phone: '', address: '',
        gender: 'Male', position: 'teacher', salary: 0,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active'
    });

    useEffect(() => {
        // 1. Theo dõi danh sách nhân viên
        const unsubscribeStaff = subscribeToStaffs((data) => setStaffList(data));

        // 2. Theo dõi yêu cầu đổi lịch đang chờ (Status = pending)
        const qReq = query(collection(db, "scheduleRequests"), where("status", "==", "pending"));
        const unsubscribeReq = onSnapshot(qReq, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubscribeStaff(); unsubscribeReq(); };
    }, []);

    // Hàm phê duyệt yêu cầu
    const handleApprove = async (req: any) => {
        try {
            // Cập nhật lịch mới vào bảng staffs
            await updateDoc(doc(db, "staffs", req.teacherId), {
                fixedSchedule: req.newSchedule
            });
            // Cập nhật trạng thái yêu cầu thành approved
            await updateDoc(doc(db, "scheduleRequests", req.id), {
                status: 'approved'
            });
            alert("Đã phê duyệt lịch giảng dạy mới cho " + req.teacherName);
        } catch (e) {
            alert("Lỗi khi phê duyệt yêu cầu.");
        }
    };

    // Hàm từ chối yêu cầu
    const handleReject = async (reqId: string) => {
        if (window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) {
            try {
                await updateDoc(doc(db, "scheduleRequests", reqId), {
                    status: 'rejected'
                });
            } catch (e) { alert("Lỗi!"); }
        }
    };

    // Hàm thêm nhân viên mới
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isTalemyEmail = formData.email.endsWith('@talemy.edu');
        const isTesterEmail = formData.email === 'nguyennhathuy083@gmail.com';

        if (!isTalemyEmail && !isTesterEmail) {
            return alert("Email phải có đuôi @talemy.edu!");
        }

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
        } catch (err) {
            alert("Lỗi hệ thống!");
        } finally {
            setLoading(false);
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen overflow-y-auto">

            {/* --- PHẦN 1: DUYỆT ĐỔI LỊCH (CHỈ HIỆN KHI CÓ YÊU CẦU) --- */}
            {requests.length > 0 && (
                <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2 mb-6">
                        <AlertCircle className="text-orange-500" /> Phê duyệt thay đổi lịch ({requests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-orange-100 shadow-xl shadow-orange-100/10 flex flex-col gap-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-orange-200">{req.teacherName.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm leading-tight">{req.teacherName}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Yêu cầu đổi lịch rảnh</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(req)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"><CheckCircle2 size={16}/></button>
                                        <button onClick={() => handleReject(req.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 p-3 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 line-through italic text-center leading-relaxed">
                                        {req.oldSchedule?.length > 0 ? req.oldSchedule.join(", ") : "Chưa có"}
                                    </div>
                                    <ChevronRight size={16} className="text-orange-300 shrink-0" />
                                    <div className="flex-1 p-3 bg-orange-50 rounded-2xl text-[10px] font-black text-orange-600 text-center leading-relaxed shadow-inner border border-orange-100">
                                        {req.newSchedule.join(", ")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PHẦN 2: HEADER & DANH SÁCH NHÂN VIÊN --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Đội ngũ Talemy</h2>
                    <p className="text-slate-500 text-sm font-medium italic">Quản lý hồ sơ nhân sự và quyền truy cập</p>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Tìm tên, email..." className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm outline-none border border-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm transition-all" onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center gap-2 text-sm active:scale-95">
                        <UserPlus size={18} /> Thêm nhân viên
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStaff.map((staff) => (
                    <div key={staff.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 -mr-4 -mt-4 rounded-full"></div>
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-orange-500 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-500 uppercase">{staff.name.charAt(0)}</div>
                        <h3 className="font-black text-slate-800 truncate leading-tight">{staff.name}</h3>
                        <p className="text-[10px] font-black uppercase text-orange-500 mb-4 tracking-[0.1em] mt-1">{staff.position}</p>
                        <div className="space-y-2 text-[12px] text-slate-500 font-medium">
                            <p className="flex items-center gap-2 truncate"><Mail size={14} className="text-slate-300 shrink-0"/> {staff.email}</p>
                            <p className="flex items-center gap-2"><Phone size={14} className="text-slate-300 shrink-0"/> {staff.phone}</p>
                            <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-300 shrink-0"/> <span className="truncate">{staff.address}</span></p>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- PHẦN 3: MODAL THÊM NHÂN VIÊN --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-orange-500 text-white flex justify-between items-center shadow-lg shadow-orange-200/50 relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black italic tracking-tighter uppercase">Khởi tạo Hồ sơ Nhân sự</h3>
                                <p className="text-orange-100 text-xs font-bold mt-1 opacity-80 uppercase tracking-widest italic">Nhập dữ liệu nhân viên mới vào hệ thống</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="relative z-10 hover:rotate-90 transition-all p-2 bg-white/10 rounded-2xl"><X size={28} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và Tên *</label>
                                <div className="relative group"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18}/><input required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Công ty *</label>
                                <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18}/><input required type="email" placeholder="ten.role@talemy.edu" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số Điện Thoại *</label>
                                <div className="relative group"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18}/><input required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mức Lương (VNĐ) *</label>
                                <div className="relative group"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18}/><input required type="number" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none font-black text-slate-800 transition-all" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} /></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giới Tính</label>
                                <div className="relative"><Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><select className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold appearance-none" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="Male">Nam</option><option value="Female">Nữ</option><option value="Other">Khác</option></select></div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày Vào Làm</label>
                                <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="date" className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa Chỉ Thường Trú *</label>
                                <div className="relative group"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18}/><input required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 transition-all" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-orange-500">Phân Quyền Chức Vụ</label>
                                <select className="w-full px-5 py-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl font-black outline-none text-orange-600 appearance-none shadow-inner" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value as any})}>
                                    <option value="admin">QUẢN TRỊ VIÊN (ADMIN)</option>
                                    <option value="teacher">GIẢNG VIÊN (TEACHER)</option>
                                    <option value="pt">TRỢ GIẢNG (PT)</option>
                                    <option value="sale">TƯ VẤN (SALE)</option>
                                    <option value="finance">KẾ TOÁN (FINANCE)</option>
                                </select>
                            </div>

                            <button disabled={loading} type="submit" className="md:col-span-2 bg-orange-500 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-orange-600 transition-all active:scale-[0.98] mt-4 uppercase tracking-[0.2em] text-lg disabled:opacity-70">
                                {loading ? "ĐANG LƯU DỮ LIỆU..." : "XÁC NHẬN TẠO HỒ SƠ"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;