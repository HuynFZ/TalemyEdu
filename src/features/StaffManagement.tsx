import React, { useState, useEffect } from 'react';
import {
    UserPlus, Search, Mail, Phone, X, MapPin, DollarSign,
    Calendar, User, Users, CheckCircle2, AlertCircle,
    Edit, Trash2, Key, ShieldCheck, XCircle, Plus
} from 'lucide-react';
import {
    createStaff,
    updateStaff,
    deleteStaff,
    StaffData
} from '../services/staffService';
import { db } from '../firebase';
import {
    collection, query, where, onSnapshot,
    updateDoc, doc, serverTimestamp
} from 'firebase/firestore';

const StaffManagement = () => {
    // --- STATES ---
    const [staffList, setStaffList] = useState<StaffData[]>([]);
    const [passwordRequests, setPasswordRequests] = useState<any[]>([]); // Chỉ giữ lại duyệt mật khẩu

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const initialForm: StaffData = {
        name: '', email: '', phone: '', address: '',
        gender: 'Male', position: 'sale', salary: 0,
        hireDate: new Date().toISOString().split('T')[0],
        status: 'active'
    };
    const [formData, setFormData] = useState<StaffData>(initialForm);

    // --- EFFECTS ---
    useEffect(() => {
        // 1. Lấy danh sách nhân sự (Lọc loại trừ teacher và pt)
        const qStaff = query(collection(db, "staffs"), where("position", "not-in", ["teacher", "pt"]));
        const unsubscribeStaff = onSnapshot(qStaff, (snap) => {
            setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })) as StaffData[]);
        });

        // 2. Theo dõi yêu cầu đổi mật khẩu (pending)
        const qPwd = query(collection(db, "passwordRequests"), where("status", "==", "pending"));
        const unsubscribePwd = onSnapshot(qPwd, (snap) => {
            setPasswordRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubscribeStaff(); unsubscribePwd(); };
    }, []);

    // --- HANDLERS (PHÊ DUYỆT MẬT KHẨU) ---
    const handleApprovePassword = async (req: any) => {
        if (!window.confirm(`Xác nhận cấp mật khẩu mới cho ${req.userName}?`)) return;
        try {
            const userRef = doc(db, "users", req.userId);
            await updateDoc(userRef, { password: req.newPassword });
            await updateDoc(doc(db, "passwordRequests", req.id), {
                status: 'approved',
                approvedAt: serverTimestamp()
            });
            alert("Đã cập nhật mật khẩu thành công!");
        } catch (e) { alert("Lỗi hệ thống!"); }
    };

    // --- HANDLERS (CRUD) ---
    const handleOpenEdit = (staff: StaffData) => {
        setEditingStaffId(staff.id!);
        setFormData({ ...staff });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingStaffId) {
                await updateStaff(editingStaffId, formData);
                alert("Cập nhật thông tin thành công!");
            } else {
                await createStaff(formData);
                alert("Thêm nhân sự mới thành công!");
            }
            setIsModalOpen(false);
            setEditingStaffId(null);
            setFormData(initialForm);
        } catch (err) {
            alert("Lỗi xử lý dữ liệu!");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa nhân sự này? Quyền truy cập hệ thống sẽ bị thu hồi.")) {
            try {
                await deleteStaff(id);
                alert("Đã xóa nhân sự.");
            } catch (e) { alert("Lỗi khi xóa!"); }
        }
    };

    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen overflow-y-auto font-sans">

            {/* --- PHẦN 1: PHÊ DUYỆT MẬT KHẨU --- */}
            {passwordRequests.length > 0 && (
                <div className="mb-12 space-y-6 animate-in fade-in duration-500">
                    <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                        <ShieldCheck className="text-blue-500" size={20} /> Yêu cầu cấp lại mật khẩu
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {passwordRequests.map(req => (
                            <div key={req.id} className="bg-white p-5 rounded-[2rem] border-2 border-blue-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200"><Key size={20} /></div>
                                    <div>
                                        <p className="font-black text-slate-800 text-sm leading-none">{req.userName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tighter">Pass mới: <span className="text-blue-600 font-mono bg-blue-50 px-2 rounded">{req.newPassword}</span></p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleApprovePassword(req)} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md"><CheckCircle2 size={18} /></button>
                                    <button onClick={() => updateDoc(doc(db, "passwordRequests", req.id), { status: 'rejected' })} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><XCircle size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PHẦN 2: HEADER & NÚT THÊM MỚI --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Bộ phận Vận hành</h2>
                    <p className="text-slate-500 text-sm font-medium italic">Quản trị viên, Tư vấn viên & Kế toán (Ngoại trừ đào tạo)</p>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm tên, email..."
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm outline-none border border-slate-200 focus:ring-2 focus:ring-orange-500/20 shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => { setEditingStaffId(null); setFormData(initialForm); setIsModalOpen(true); }}
                        className="bg-[#ff6600] text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-[#e65c00] transition-all flex items-center gap-2 text-sm active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={20} strokeWidth={3} />
                        <span>Thêm nhân viên</span>
                    </button>
                </div>
            </div>

            {/* --- DANH SÁCH CARD NHÂN VIÊN --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStaff.map((staff) => (
                    <div key={staff.id} className="bg-white rounded-[2.5rem] p-7 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl uppercase shadow-lg group-hover:rotate-6 transition-transform">
                                {staff.name.charAt(0)}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <button onClick={() => handleOpenEdit(staff)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(staff.id!)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <h3 className="font-black text-slate-800 truncate text-lg leading-tight">{staff.name}</h3>
                        <p className="text-[10px] font-black uppercase text-orange-500 mb-5 tracking-[0.1em] mt-1 bg-orange-50 inline-block px-3 py-1 rounded-full">{staff.position}</p>

                        <div className="space-y-2.5 border-t pt-5 border-slate-50">
                            <p className="flex items-center gap-3 text-xs text-slate-500 font-medium truncate"><Mail size={14} className="text-slate-300" /> {staff.email}</p>
                            <p className="flex items-center gap-3 text-xs text-slate-500 font-medium"><Phone size={14} className="text-slate-300" /> {staff.phone}</p>
                            <p className="flex items-center gap-3 text-xs text-slate-500 font-medium truncate"><MapPin size={14} className="text-slate-300" /> {staff.address}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL THÊM & SỬA --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shadow-lg">
                            <div>
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase">
                                    {editingStaffId ? 'Cập nhật hồ sơ' : 'Khởi tạo nhân sự'}
                                </h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest italic opacity-70">Lưu trữ thông tin đội ngũ vận hành</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-all p-3 bg-white/10 rounded-2xl"><X size={28} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và Tên *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-bold text-slate-700" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Công ty *</label>
                                <input
                                    required
                                    type="email"
                                    disabled={!!editingStaffId}
                                    className={`w-full px-6 py-4 border-2 border-transparent rounded-2xl outline-none font-bold text-slate-700 ${editingStaffId ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-slate-50 focus:border-orange-500/10'}`}
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số Điện Thoại *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lương Thỏa Thuận (VNĐ) *</label>
                                <input required type="number" className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-black text-orange-600" value={formData.salary} onChange={e => setFormData({ ...formData, salary: Number(e.target.value) })} />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa Chỉ Thường Trú *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-bold text-slate-700" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">Bộ phận công tác</label>
                                <select
                                    className="w-full px-6 py-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl font-black outline-none text-orange-600 appearance-none shadow-inner"
                                    value={formData.position}
                                    onChange={e => setFormData({ ...formData, position: e.target.value as any })}
                                >
                                    <option value="admin">QUẢN TRỊ VIÊN (ADMIN)</option>
                                    <option value="sale">TƯ VẤN VIÊN (SALE)</option>
                                    <option value="finance">KẾ TOÁN (FINANCE)</option>
                                </select>
                                <p className="text-[9px] text-slate-400 italic mt-2 ml-1">* Teacher và PT được quản lý riêng tại trang Giáo viên để đảm bảo tính chuyên môn đào tạo.</p>
                            </div>

                            <button
                                disabled={loading}
                                type="submit"
                                className="md:col-span-2 bg-orange-500 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-orange-600 transition-all active:scale-[0.98] mt-4 uppercase tracking-[0.2em] text-lg disabled:opacity-70"
                            >
                                {loading ? "ĐANG XỬ LÝ..." : (editingStaffId ? "CẬP NHẬT HỒ SƠ" : "XÁC NHẬN TẠO HỒ SƠ")}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default StaffManagement;