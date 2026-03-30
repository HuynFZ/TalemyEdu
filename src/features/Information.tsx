import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffProfile } from '../services/staffService';
import { supabase } from '../supabaseClient';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Shield,
    Clock, Lock, Key, Eye, EyeOff, Check, Sunrise, Sunset,
    Loader2, CalendarRange, Trash2, Plus,
    ChevronRight, AlertCircle, Info, Sparkles, CheckCircle2
} from 'lucide-react';

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const Information = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // tempSchedule lưu dạng: { "Thứ 2": [{start: "08:00", end: "10:00"}], ... }
    const [tempSchedule, setTempSchedule] = useState<any>({});
    const [busySlots, setBusySlots] = useState<any[]>([]);

    // Password states
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [pendingPwdRequest, setPendingPwdRequest] = useState<any>(null);

    useEffect(() => {
        if (user?.email) fetchData();
    }, [user]);

    const fetchData = async () => {
        const data = await getStaffProfile(user!.email);
        if (data) {
            setProfile(data);

            // KIỂM TRA DỮ LIỆU ĐẦU VÀO - Nếu không phải object hoặc mảng thì reset về {}
            // Để tránh lỗi crash khi gặp dữ liệu định dạng cũ
            const rawSchedule = data.fixed_schedule;
            if (rawSchedule && typeof rawSchedule === 'object' && !Array.isArray(rawSchedule)) {
                setTempSchedule(rawSchedule);
            } else {
                setTempSchedule({});
            }

            const { data: pReq } = await supabase
                .from('password_requests')
                .select('*')
                .eq('user_id', data.user_id)
                .eq('status', 'pending')
                .maybeSingle();
            setPendingPwdRequest(pReq);

            if (data.role === 'teacher') {
                const { data: sessions } = await supabase
                    .from('sessions')
                    .select('date, start_time, end_time')
                    .eq('teacher_id', data.id)
                    .eq('status', 'Chưa diễn ra');

                if (sessions) {
                    const busy = sessions.map(s => {
                        const date = new Date(s.date);
                        return {
                            day: DAYS_OF_WEEK[(date.getDay() + 6) % 7],
                            start: s.start_time,
                            end: s.end_time
                        };
                    });
                    setBusySlots(busy);
                }
            }
        }
        setLoading(false);
    };

    const updateSchedule = async (newSched: any) => {
        setIsSavingSchedule(true);
        try {
            const { error } = await supabase
                .from('staffs')
                .update({ fixed_schedule: newSched })
                .eq('id', profile.id);
            if (error) throw error;
            setTempSchedule(newSched);
        } catch (err) {
            alert("Lỗi khi lưu lịch trình!");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const addTimeSlot = (day: string) => {
        const newSched = { ...tempSchedule };
        // Đảm bảo khởi tạo mảng nếu chưa có
        if (!Array.isArray(newSched[day])) newSched[day] = [];

        newSched[day].push({ start: "08:00", end: "10:00" });
        newSched[day].sort((a: any, b: any) => a.start.localeCompare(b.start));
        updateSchedule(newSched);
    };

    const removeTimeSlot = (day: string, index: number) => {
        if (!Array.isArray(tempSchedule[day])) return;

        const slotToRemove = tempSchedule[day][index];
        const isBusy = busySlots.some(b =>
            b.day === day && b.start >= slotToRemove.start && b.end <= slotToRemove.end
        );

        if (isBusy) return alert("Khung giờ này đang có lớp học!");

        const newSched = { ...tempSchedule };
        newSched[day].splice(index, 1);
        updateSchedule(newSched);
    };

    const handleTimeChange = (day: string, index: number, field: 'start' | 'end', value: string) => {
        const newSched = { ...tempSchedule };
        const slot = newSched[day][index];

        if (field === 'start' && value >= slot.end) return alert("Giờ bắt đầu phải nhỏ hơn kết thúc!");
        if (field === 'end' && value <= slot.start) return alert("Giờ kết thúc phải lớn hơn bắt đầu!");

        newSched[day][index][field] = value;
        newSched[day].sort((a: any, b: any) => a.start.localeCompare(b.start));
        updateSchedule(newSched);
    };

    const handleVerifyOldPassword = async () => {
        if (!oldPassword) return;
        setVerifying(true);
        try {
            const { data: userData } = await supabase.from('users').select('password').eq('id', profile.user_id).single();
            if (userData?.password === oldPassword) setIsVerified(true);
            else setPwdError('Mật khẩu không đúng!');
        } catch (e) { setPwdError('Lỗi xác thực!'); }
        finally { setVerifying(false); }
    };

    const handleSubmitPasswordRequest = async () => {
        if (newPassword.length < 6) return alert("Tối thiểu 6 ký tự!");
        setSubmittingPwd(true);
        try {
            await supabase.from('password_requests').insert([{
                user_id: profile.user_id, user_name: profile.name, user_email: profile.email,
                new_password: newPassword, status: 'pending', type: 'CHANGE_PASSWORD'
            }]);
            setIsVerified(false); setOldPassword(''); setNewPassword('');
            alert("Đã gửi yêu cầu tới Admin!");
            fetchData();
        } finally { setSubmittingPwd(false); }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400">ĐANG TẢI...</div>;

    return (
        <div className="p-4 md:p-10 bg-[#f8fafc] min-h-screen font-sans text-slate-900">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* --- PROFILE HEADER --- */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
                    <div className="w-36 h-36 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-[2.5rem] flex items-center justify-center text-white text-6xl font-black shadow-2xl">
                        {profile?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight">{profile?.name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="px-4 py-1 bg-orange-50 text-orange-600 font-bold text-[11px] rounded-full border border-orange-100 uppercase tracking-widest">{profile?.role}</span>
                        </div>
                    </div>
                </div>

                {/* --- QUẢN LÝ KHUNG GIỜ RẢNH --- */}
                {profile?.role === 'teacher' && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                                    <CalendarRange size={24} className="text-orange-500" /> Thiết lập khung giờ rảnh
                                </h3>
                                <p className="text-slate-400 text-xs font-medium mt-1">Vui lòng thêm các khung giờ bạn có thể nhận lớp (Dạng 24h).</p>
                            </div>
                            {isSavingSchedule && <Loader2 className="animate-spin text-orange-500" />}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {DAYS_OF_WEEK.map((day) => (
                                <div key={day} className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 flex flex-col min-h-[220px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-black uppercase text-xs tracking-widest text-slate-800">{day}</span>
                                        <button onClick={() => addTimeSlot(day)} className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg">
                                            <Plus size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        {/* FIX LỖI TẠI ĐÂY: Thêm check Array.isArray */}
                                        {(!tempSchedule[day] || !Array.isArray(tempSchedule[day]) || tempSchedule[day].length === 0) ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                                <Clock size={20} />
                                                <span className="text-[8px] font-black uppercase mt-1">Trống</span>
                                            </div>
                                        ) : (
                                            tempSchedule[day].map((slot: any, index: number) => (
                                                <div key={index} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                                                    <div className="flex-1 flex items-center gap-1">
                                                        <input
                                                            type="time"
                                                            className="w-full bg-slate-50 border-none rounded-lg text-[10px] font-black p-1 outline-none"
                                                            value={slot.start}
                                                            onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)}
                                                        />
                                                        <span className="text-slate-300 text-[10px]">-</span>
                                                        <input
                                                            type="time"
                                                            className="w-full bg-slate-50 border-none rounded-lg text-[10px] font-black p-1 outline-none"
                                                            value={slot.end}
                                                            onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)}
                                                        />
                                                    </div>
                                                    <button onClick={() => removeTimeSlot(day, index)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* THÔNG TIN CƠ BẢN */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3"><User size={20} className="text-orange-500" /> Thông tin cá nhân</h3>
                        <div className="space-y-6">
                            <InfoItem icon={<Mail />} label="Email công việc" value={profile?.email} />
                            <InfoItem icon={<Phone />} label="Số điện thoại" value={profile?.phone} />
                            <InfoItem icon={<MapPin />} label="Địa chỉ hiện tại" value={profile?.address} />
                        </div>
                    </div>

                    {/* BẢO MẬT & ĐỔI PASS */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm space-y-8">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3"><Lock size={20} className="text-orange-500" /> Bảo mật tài khoản</h3>
                        {pendingPwdRequest ? (
                            <div className="bg-blue-50 border border-blue-100 p-10 rounded-[2rem] flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                                    <Clock className="text-blue-500 animate-spin" size={32} />
                                </div>
                                <p className="text-blue-800 font-black text-xs uppercase tracking-widest">Đang chờ phê duyệt mật khẩu mới</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {!isVerified ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Xác thực mật khẩu hiện tại</label>
                                            <input type="password" placeholder="••••••••" className={`w-full px-6 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm transition-all ${pwdError ? 'border-red-200' : 'border-transparent focus:border-orange-500/10'}`} value={oldPassword} onChange={(e) => {setOldPassword(e.target.value); setPwdError('');}} />
                                            {pwdError && <p className="text-[10px] text-red-500 font-bold ml-2">{pwdError}</p>}
                                        </div>
                                        <button disabled={verifying || !oldPassword} onClick={handleVerifyOldPassword} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all text-xs uppercase shadow-xl active:scale-95 disabled:opacity-50">
                                            {verifying ? "ĐANG KIỂM TRA..." : "XÁC THỰC DANH TÍNH"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-5 animate-in slide-in-from-right duration-300">
                                        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-black uppercase"><CheckCircle2 size={20}/> Xác thực thành công</div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mật khẩu mới</label>
                                            <div className="relative">
                                                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                <input type={showPassword ? "text" : "password"} className="w-full pl-12 pr-14 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-bold text-slate-700 text-sm shadow-inner" placeholder="Nhập pass mới..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                                            </div>
                                        </div>
                                        <button disabled={submittingPwd || !newPassword} onClick={handleSubmitPasswordRequest} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all text-xs uppercase shadow-xl shadow-orange-100">GỬI YÊU CẦU DUYỆT</button>
                                        <button onClick={() => setIsVerified(false)} className="w-full text-[10px] font-black text-slate-300 uppercase hover:text-slate-500">Quay lại</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CÔNG VIỆC & LƯƠNG */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3"><Briefcase size={20} className="text-orange-500" /> Chi tiết công tác & Lương</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <InfoItem icon={<Calendar />} label="Ngày gia nhập" value={profile?.hire_date} />
                        <InfoItem icon={<Shield />} label="Quyền hạn hệ thống" value={profile?.role?.toUpperCase()} />
                        <div className="flex items-start gap-5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black shadow-lg shadow-orange-100">$</div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lương cơ bản</p>
                                <p className="font-black text-slate-800 text-lg mt-1">{profile?.salary?.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">VND</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value }: any) => (
    <div className="flex items-start gap-5 p-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-sm shrink-0 border border-slate-100">{React.cloneElement(icon, { size: 20 })}</div>
        <div className="overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="font-black text-slate-700 truncate text-sm italic">{value || '---'}</p>
        </div>
    </div>
);

export default Information;