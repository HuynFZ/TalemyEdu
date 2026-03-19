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
    const [requests, setRequests] = useState<any[]>([]); // Yêu cầu đổi lịch
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
        const unsubscribeStaff = subscribeToStaffs((data) => setStaffList(data));

        // Lắng nghe yêu cầu đổi lịch đang chờ duyệt (Pending)
        const qReq = query(collection(db, "scheduleRequests"), where("status", "==", "pending"));
        const unsubscribeReq = onSnapshot(qReq, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubscribeStaff(); unsubscribeReq(); };
    }, []);

    const handleApprove = async (req: any) => {
        try {
            await updateDoc(doc(db, "staffs", req.teacherId), { fixedSchedule: req.newSchedule });
            await updateDoc(doc(db, "scheduleRequests", req.id), { status: 'approved' });
            alert("Đã duyệt lịch mới!");
        } catch (e) { alert("Lỗi khi duyệt!"); }
    };

    const handleReject = async (reqId: string) => {
        if (window.confirm("Từ chối yêu cầu này?")) {
            await updateDoc(doc(db, "scheduleRequests", reqId), { status: 'rejected' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isTalemyEmail = formData.email.endsWith('@talemy.edu');
        const isTesterEmail = formData.email === 'nguyennhathuy083@gmail.com';
        if (!isTalemyEmail && !isTesterEmail) return alert("Email sai định dạng!");

        setLoading(true);
        try {
            await createStaff(formData);
            setIsModalOpen(false);
        } catch (err) { alert("Lỗi!"); } finally { setLoading(false); }
    };

    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen overflow-y-auto">
            {/* 1. KHU VỰC DUYỆT YÊU CẦU (CHỈ HIỆN KHI CÓ REQUEST) */}
            {requests.length > 0 && (
                <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2 mb-6">
                        <AlertCircle className="text-orange-500" /> Yêu cầu đổi lịch rảnh ({requests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-orange-100 shadow-xl shadow-orange-100/20 flex flex-col gap-5">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-black">{req.teacherName.charAt(0)}</div>
                                        <div><p className="font-black text-slate-800 text-sm leading-tight">{req.teacherName}</p><p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Đề xuất lịch mới</p></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(req)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"><CheckCircle2 size={16}/></button>
                                        <button onClick={() => handleReject(req.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 p-3 bg-slate-50 rounded-2xl text-[10px] font-bold text-slate-400 line-through italic text-center leading-relaxed">{req.oldSchedule.join(", ")}</div>
                                    <ChevronRight size={16} className="text-orange-300" />
                                    <div className="flex-1 p-3 bg-orange-50 rounded-2xl text-[10px] font-black text-orange-600 text-center leading-relaxed shadow-inner border border-orange-100">{req.newSchedule.join(", ")}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. DANH SÁCH NHÂN VIÊN */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Đội ngũ Talemy</h2>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Tìm tên, email..." className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm outline-none border border-slate-200" onChange={e => setSearchTerm(e.target.value)} /></div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center gap-2 text-sm"><UserPlus size={18} /> Thêm nhân viên</button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStaff.map((staff) => (
                    <div key={staff.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-orange-500 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">{staff.name.charAt(0)}</div>
                        <h3 className="font-black text-slate-800 truncate">{staff.name}</h3>
                        <p className="text-[10px] font-black uppercase text-orange-500 mb-4 tracking-widest">{staff.position}</p>
                        <div className="space-y-2 text-[12px] text-slate-500 font-medium">
                            <p className="flex items-center gap-2"><Mail size={14} className="text-slate-300"/> {staff.email}</p>
                            <p className="flex items-center gap-2"><Phone size={14} className="text-slate-300"/> {staff.phone}</p>
                            <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-300"/> <span className="truncate">{staff.address}</span></p>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL THÊM NHÂN VIÊN GIỮ NGUYÊN ... */}
        </div>
    );
};

export default StaffManagement;