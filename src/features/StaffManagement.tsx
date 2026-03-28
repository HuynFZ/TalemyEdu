import React, { useState, useEffect } from 'react';
import {
    Search, Mail, Phone, X, Edit, Trash2, Key, ShieldCheck,
    XCircle, Plus, Check, Lock, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
    createStaff,
    updateStaff,
    deleteStaff,
    StaffData
} from '../services/staffService';

const StaffManagement = () => {
    // --- STATES DỮ LIỆU ---
    const [staffList, setStaffList] = useState<any[]>([]);
    const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- STATES MODAL NHÂN VIÊN ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const initialForm = {
        name: '', email: '', phone: '', address: '',
        gender: 'Male', role: 'sale', salary: 0,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active'
    };
    const [formData, setFormData] = useState<any>(initialForm);

    // --- STATES MODAL PHÊ DUYỆT MẬT KHẨU ---
    const [isPwdApprovalModalOpen, setIsPwdApprovalModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [adminSetPassword, setAdminSetPassword] = useState('');

    // --- 1. LẤY DỮ LIỆU VÀ LẮNG NGHE REAL-TIME ---
    useEffect(() => {
        fetchData();

        // Lắng nghe thay đổi bảng staffs
        const staffChannel = supabase.channel('staff-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, () => fetchData())
            .subscribe();

        // Lắng nghe thay đổi bảng password_requests
        const pwdChannel = supabase.channel('pwd-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'password_requests' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(staffChannel);
            supabase.removeChannel(pwdChannel);
        };
    }, []);

    const fetchData = async () => {
        // Lấy danh sách nhân viên (loại trừ GV và PT)
        const { data: staffs } = await supabase
            .from('staffs')
            .select('*')
            .not('role', 'in', '("teacher","pt")')
            .order('name', { ascending: true });

        if (staffs) setStaffList(staffs);

        // Lấy danh sách yêu cầu mật khẩu đang chờ
        const { data: reqs } = await supabase
            .from('password_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (reqs) setPasswordRequests(reqs);
    };

    // --- 2. XỬ LÝ PHÊ DUYỆT MẬT KHẨU ---
    const openApprovalModal = (req: any) => {
        setSelectedRequest(req);
        // Nếu là yêu cầu đổi pass (nhân viên đã nhập pass mới), gợi ý luôn
        setAdminSetPassword(req.type === 'CHANGE_PASSWORD' ? req.new_password : '');
        setIsPwdApprovalModalOpen(true);
    };

    const handleFinalConfirmPassword = async () => {
        if (!adminSetPassword || adminSetPassword.length < 6) return alert("Mật khẩu tối thiểu 6 ký tự!");

        setLoading(true);
        try {
            // A. Cập nhật mật khẩu vào bảng users
            const { error: userError } = await supabase
                .from('users')
                .update({ password: adminSetPassword })
                .eq('id', selectedRequest.user_id);

            if (userError) throw userError;

            // B. Cập nhật trạng thái yêu cầu
            const { error: reqError } = await supabase
                .from('password_requests')
                .update({ status: 'approved' })
                .eq('id', selectedRequest.id);

            if (reqError) throw reqError;

            alert(`Đã cấp mật khẩu mới cho ${selectedRequest.user_email} thành công!`);
            setIsPwdApprovalModalOpen(false);
            setAdminSetPassword('');
        } catch (e) {
            alert("Lỗi hệ thống khi cập nhật!");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectRequest = async (id: string) => {
        if (window.confirm("Từ chối yêu cầu này?")) {
            await supabase.from('password_requests').update({ status: 'rejected' }).eq('id', id);
        }
    };

    // --- 3. CRUD NHÂN SỰ ---
    const handleOpenEdit = (staff: any) => {
        setEditingStaffId(staff.id);
        setFormData({ ...staff });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingStaffId) {
                await updateStaff(editingStaffId, formData);
                alert("Cập nhật thành công!");
            } else {
                await createStaff(formData);
                alert("Thêm nhân sự thành công! Pass mặc định: 123456");
            }
            setIsModalOpen(false);
            setEditingStaffId(null);
            setFormData(initialForm);
        } catch (err) {
            alert("Lỗi thao tác!");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStaff = async (id: string) => {
        if (window.confirm("Xóa nhân sự này? Tài khoản đăng nhập liên quan cũng sẽ bị ảnh hưởng.")) {
            await deleteStaff(id);
        }
    };

    // --- 4. FILTER LOGIC ---
    const filteredStaff = staffList.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen overflow-y-auto font-sans text-slate-900">

            {/* --- PHẦN 1: YÊU CẦU MẬT KHẨU --- */}
            {passwordRequests.length > 0 && (
                <div className="mb-12 space-y-6 animate-in fade-in duration-500">
                    <h3 className="font-black text-slate-800 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                        <ShieldAlert className="text-blue-500" size={20} /> Phê duyệt mật khẩu ({passwordRequests.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {passwordRequests.map(req => (
                            <div key={req.id} className={`bg-white p-5 rounded-[2rem] border-2 shadow-sm flex items-center justify-between ${req.type === 'FORGOT_PASSWORD' ? 'border-orange-100' : 'border-blue-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 text-white rounded-2xl flex items-center justify-center shadow-lg ${req.type === 'FORGOT_PASSWORD' ? 'bg-orange-500' : 'bg-blue-500'}`}>
                                        <Key size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-black text-slate-800 text-sm leading-none truncate">{req.user_email?.split('@')[0]}</p>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-2 inline-block ${req.type === 'FORGOT_PASSWORD' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {req.type === 'FORGOT_PASSWORD' ? 'Quên mật khẩu' : 'Đổi mật khẩu'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openApprovalModal(req)} className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"><Check size={18} /></button>
                                    <button onClick={() => handleRejectRequest(req.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><XCircle size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PHẦN 2: HEADER & TOOLBAR --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý nhân sự</h2>
                    <p className="text-slate-500 text-sm font-medium italic">Vận hành hệ thống: Admin, Tư vấn viên & Kế toán</p>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm tên, email..."
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm outline-none border border-slate-200 focus:border-orange-500/30 transition-all"
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => { setEditingStaffId(null); setFormData(initialForm); setIsModalOpen(true); }}
                        className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center gap-2 text-sm active:scale-95 whitespace-nowrap"
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
                            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl uppercase">{staff.name.charAt(0)}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => handleOpenEdit(staff)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteStaff(staff.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <h3 className="font-black text-slate-800 truncate text-lg leading-tight">{staff.name}</h3>
                        <p className="text-[10px] font-black uppercase text-orange-500 mb-5 tracking-[0.1em] mt-1 bg-orange-50 inline-block px-3 py-1 rounded-full">{staff.role}</p>
                        <div className="space-y-2.5 border-t pt-5 border-slate-50 text-xs text-slate-500">
                            <p className="truncate"><Mail size={14} className="inline mr-2 text-slate-300"/>{staff.email}</p>
                            <p><Phone size={14} className="inline mr-2 text-slate-300"/>{staff.phone}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL PHÊ DUYỆT MẬT KHẨU --- */}
            {isPwdApprovalModalOpen && selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 bg-emerald-500 text-white flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={24} />
                                <h3 className="font-black uppercase italic tracking-tighter">Phê duyệt mật khẩu</h3>
                            </div>
                            <button onClick={() => setIsPwdApprovalModalOpen(false)} className="p-2 bg-white/10 rounded-xl"><X size={20}/></button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Tài khoản yêu cầu:</p>
                                <p className="font-bold text-slate-700 mt-1">{selectedRequest.user_email}</p>
                                <p className="text-[9px] text-orange-500 font-bold mt-1 uppercase">Lý do: {selectedRequest.type === 'FORGOT_PASSWORD' ? 'Quên mật khẩu' : 'Đổi mật khẩu'}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nhập mật khẩu mới cấp cho nhân sự *</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl outline-none font-black text-slate-800"
                                        placeholder="Ví dụ: Talemy@2026"
                                        value={adminSetPassword}
                                        onChange={(e) => setAdminSetPassword(e.target.value)}
                                    />
                                </div>
                                <p className="text-[9px] text-slate-400 italic">* Mật khẩu có hiệu lực ngay sau khi xác nhận.</p>
                            </div>

                            <button
                                disabled={loading}
                                onClick={handleFinalConfirmPassword}
                                className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                            >
                                {loading ? "ĐANG XỬ LÝ..." : <><CheckCircle2 size={18}/> XÁC NHẬN CẤP PASS</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL THÊM & SỬA NHÂN VIÊN --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shadow-lg">
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                                {editingStaffId ? 'Cập nhật hồ sơ' : 'Khởi tạo nhân sự'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/10 rounded-2xl"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh] custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và Tên *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-orange-500/20" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Công ty *</label>
                                <input required type="email" disabled={!!editingStaffId} className={`w-full px-6 py-4 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 ${editingStaffId ? 'bg-slate-100' : 'bg-slate-50 focus:border-orange-500/20'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số Điện Thoại *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lương (VNĐ) *</label>
                                <input required type="number" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-black text-orange-600" value={formData.salary} onChange={e => setFormData({...formData, salary: Number(e.target.value)})} />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa Chỉ Thường Trú *</label>
                                <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-1">Bộ phận công tác</label>
                                <select className="w-full px-6 py-4 bg-orange-50/50 border-2 border-orange-100 rounded-2xl font-black outline-none text-orange-600 appearance-none shadow-inner" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                    <option value="admin">QUẢN TRỊ VIÊN (ADMIN)</option>
                                    <option value="sale">TƯ VẤN VIÊN (SALE)</option>
                                    <option value="finance">KẾ TOÁN (FINANCE)</option>
                                </select>
                            </div>
                            <button disabled={loading} type="submit" className="md:col-span-2 bg-orange-500 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-orange-600 transition-all uppercase mt-4">
                                {loading ? "ĐANG XỬ LÝ..." : (editingStaffId ? "CẬP NHẬT HỒ SƠ" : "XÁC NHẬN TẠO HỒ SƠ")}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; } `}</style>
        </div>
    );
};

export default StaffManagement;