import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffProfile } from '../services/staffService';
import { supabase } from '../supabaseClient';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Shield,
    CheckCircle2, Clock, Send, Lock, AlertCircle, Info, Key, Eye, EyeOff, Check, Sunrise, Sunset, Loader2
} from 'lucide-react';

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

// Định nghĩa 2 ca làm việc cố định
const SHIFTS = [
    { id: 'Sáng', label: '7h - 10h', icon: <Sunrise size={16} className="text-orange-400" /> },
    { id: 'Chiều', label: '1h - 4h', icon: <Sunset size={16} className="text-blue-400" /> }
];

const Information = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false); // Trạng thái lưu lịch tự động
    const [submittingPwd, setSubmittingPwd] = useState(false);

    // tempSchedule lưu mảng dạng: ["Thứ 2 - Sáng", "Thứ 3 - Chiều", ...]
    const [tempSchedule, setTempSchedule] = useState<string[]>([]);
    const [activeSlots, setActiveSlots] = useState<string[]>([]); // Lưu các ca đang có lớp dạy thực tế

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
            setTempSchedule(data.fixed_schedule || []);

            // 1. Theo dõi yêu cầu đổi mật khẩu (VẪN CẦN PHÊ DUYỆT)
            const fetchPwdReq = async () => {
                const { data: pReq } = await supabase
                    .from('password_requests')
                    .select('*')
                    .eq('user_id', data.user_id)
                    .eq('status', 'pending')
                    .maybeSingle();
                setPendingPwdRequest(pReq);
            };

            // 2. Kiểm tra các ca đang có lớp dạy thực tế (Để chặn đổi lịch)
            if (data.role === 'teacher') {
                const { data: sessions } = await supabase
                    .from('sessions')
                    .select('date, start_time')
                    .eq('teacher_id', data.id)
                    .eq('status', 'Chưa diễn ra');

                const busySlots: string[] = [];
                sessions?.forEach(s => {
                    const date = new Date(s.date);
                    const dayIdx = (date.getDay() + 6) % 7;
                    const dayName = DAYS_OF_WEEK[dayIdx];

                    const hour = parseInt(s.start_time?.split(':')[0]);
                    let shift = "";
                    if (hour >= 7 && hour < 12) shift = "Sáng";
                    else if (hour >= 13 && hour < 18) shift = "Chiều";

                    if (shift) busySlots.push(`${dayName} - ${shift}`);
                });
                setActiveSlots(Array.from(new Set(busySlots)));
            }

            await fetchPwdReq();

            // Realtime lắng nghe khi Admin duyệt mật khẩu
            supabase.channel('info-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'password_requests' }, () => fetchPwdReq())
                .subscribe();
        }
        setLoading(false);
    };

    // --- LOGIC MẬT KHẨU (PHẢI DUYỆT) ---
    const handleVerifyOldPassword = async () => {
        if (!oldPassword) return;
        setVerifying(true);
        setPwdError('');
        try {
            const { data: userData } = await supabase.from('users').select('password').eq('id', profile.user_id).single();
            if (userData?.password === oldPassword) setIsVerified(true);
            else setPwdError('Mật khẩu hiện tại không đúng!');
        } catch (e) { setPwdError('Lỗi xác thực!'); }
        finally { setVerifying(false); }
    };

    const handleSubmitPasswordRequest = async () => {
        if (newPassword.length < 6) return alert("Mật khẩu mới tối thiểu 6 ký tự!");
        setSubmittingPwd(true);
        try {
            const { error } = await supabase.from('password_requests').insert([{
                user_id: profile.user_id,
                user_name: profile.name,
                user_email: profile.email,
                new_password: newPassword,
                status: 'pending',
                type: 'CHANGE_PASSWORD'
            }]);
            if (error) throw error;
            setNewPassword(''); setOldPassword(''); setIsVerified(false);
            alert("Yêu cầu đổi mật khẩu đã được gửi tới Admin phê duyệt!");
            fetchData();
        } catch (error) { alert("Lỗi gửi yêu cầu!"); }
        finally { setSubmittingPwd(false); }
    };

    // --- LOGIC LỊCH DẠY (LƯU TRỰC TIẾP - KHÔNG DUYỆT) ---
    const toggleShift = async (day: string, shiftId: string) => {
        const slotKey = `${day} - ${shiftId}`;
        const isCurrentlySelected = tempSchedule.includes(slotKey);

        // Chặn nếu ca đó đang có lớp học mà GV muốn hủy
        if (activeSlots.includes(slotKey) && isCurrentlySelected) {
            alert(`Ca ${slotKey} đang có lớp học thực tế, bạn không thể bỏ chọn ca này!`);
            return;
        }

        const newSchedule = isCurrentlySelected
            ? tempSchedule.filter(s => s !== slotKey)
            : [...tempSchedule, slotKey];

        setIsSavingSchedule(true);
        try {
            const { error } = await supabase
                .from('staffs')
                .update({ fixed_schedule: newSchedule })
                .eq('id', profile.id);

            if (error) throw error;
            setTempSchedule(newSchedule);
        } catch (err) {
            alert("Lỗi lưu lịch dạy!");
        } finally {
            setIsSavingSchedule(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Đang tải hồ sơ...</div>;

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* --- HEADER --- */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-xl shrink-0 uppercase">
                        {profile?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black text-slate-800 mb-2">{profile?.name}</h2>
                        <span className="px-4 py-1.5 bg-orange-50 text-orange-600 font-black text-[10px] rounded-full border border-orange-100 uppercase tracking-widest">{profile?.role}</span>
                    </div>
                </div>

                {/* --- LỊCH TRÌNH CA DẠY (TỰ ĐỘNG LƯU) --- */}
                {profile?.role === 'teacher' && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Clock size={18} className="text-orange-500" /> Lịch dạy cố định (Lưu tự động)
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-1 italic">Tích chọn các ca rảnh của bạn. Thay đổi sẽ có hiệu lực ngay lập tức cho Sale xem.</p>
                            </div>
                            {isSavingSchedule && (
                                <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] animate-pulse uppercase">
                                    <Loader2 size={16} className="animate-spin" /> Đang đồng bộ...
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {DAYS_OF_WEEK.map((day) => (
                                <div key={day} className="flex flex-col gap-3">
                                    <div className="text-center py-2 bg-slate-900 rounded-xl border border-slate-800 shadow-inner">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{day}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {SHIFTS.map((shift) => {
                                            const slotKey = `${day} - ${shift.id}`;
                                            const isSelected = tempSchedule.includes(slotKey);
                                            const isBusy = activeSlots.includes(slotKey);

                                            return (
                                                <button
                                                    key={shift.id}
                                                    disabled={isSavingSchedule}
                                                    onClick={() => toggleShift(day, shift.id)}
                                                    className={`
                                                        relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5
                                                        ${isSelected
                                                        ? 'border-orange-500 bg-orange-50 shadow-md scale-[1.02]'
                                                        : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {shift.icon}
                                                        <span className={`text-[11px] font-black uppercase ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>
                                                            {shift.id}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[9px] font-bold ${isSelected ? 'text-orange-400' : 'text-slate-300'}`}>
                                                        {shift.label}
                                                    </span>

                                                    {isBusy && isSelected && (
                                                        <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                                                            <Lock size={10} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex gap-6 text-[10px] font-bold text-slate-400 uppercase italic">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Đã chọn</div>
                            <div className="flex items-center gap-2"><Lock size={12}/> Đang có lớp (không thể hủy)</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* THÔNG TIN CƠ BẢN */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={18} className="text-orange-500" /> Thông tin cơ bản</h3>
                        <div className="space-y-4">
                            <InfoItem icon={<Mail />} label="Email công việc" value={profile?.email} />
                            <InfoItem icon={<Phone />} label="Số điện thoại" value={profile?.phone} />
                            <InfoItem icon={<MapPin />} label="Địa chỉ" value={profile?.address} />
                        </div>
                    </div>

                    {/* BẢO MẬT & ĐỔI PASS (PHẢI DUYỆT) */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={18} className="text-orange-500" /> Bảo mật tài khoản</h3>
                        {pendingPwdRequest ? (
                            <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl flex flex-col items-center text-center gap-3">
                                <Clock className="text-blue-500 animate-spin" size={32} />
                                <p className="text-blue-800 font-black text-[10px] uppercase tracking-widest">Yêu cầu đổi Pass đang chờ Admin duyệt</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!isVerified ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mật khẩu hiện tại</label>
                                            <input type="password" placeholder="••••••••" className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm transition-all ${pwdError ? 'border-red-200' : 'border-transparent focus:border-orange-500/10'}`} value={oldPassword} onChange={(e) => {setOldPassword(e.target.value); setPwdError('');}} />
                                            {pwdError && <p className="text-[10px] text-red-500 font-bold ml-1">{pwdError}</p>}
                                        </div>
                                        <button disabled={verifying || !oldPassword} onClick={handleVerifyOldPassword} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all text-xs uppercase shadow-lg disabled:opacity-50 active:scale-95">
                                            {verifying ? "ĐANG KIỂM TRA..." : "XÁC THỰC"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-right">
                                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase"><Check size={14}/> Xác thực thành công</div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mật khẩu mới</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                <input type={showPassword ? "text" : "password"} className="w-full pl-11 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-bold text-slate-700 text-sm" placeholder="Nhập pass mới..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                            </div>
                                        </div>
                                        <button disabled={submittingPwd || !newPassword} onClick={handleSubmitPasswordRequest} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all text-xs uppercase shadow-lg active:scale-95">GỬI YÊU CẦU DUYỆT</button>
                                        <button onClick={() => setIsVerified(false)} className="w-full text-[10px] font-black text-slate-400 uppercase">Hủy bỏ</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CÔNG VIỆC & LƯƠNG */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Briefcase size={18} className="text-orange-500" /> Công việc & Lương</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <InfoItem icon={<Calendar />} label="Ngày gia nhập" value={profile?.hire_date} />
                        <InfoItem icon={<Shield />} label="Quyền hạn hệ thống" value={profile?.role?.toUpperCase()} />
                        <div className="flex items-start gap-4 p-2 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-orange-500 shrink-0 font-black">$</div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lương cơ bản</p>
                                <p className="font-bold text-slate-700 text-base">{profile?.salary?.toLocaleString()} VND</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value }: any) => (
    <div className="flex items-start gap-4 p-2 overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">{React.cloneElement(icon, { size: 18 })}</div>
        <div className="overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="font-bold text-slate-700 truncate text-sm">{value || '---'}</p>
        </div>
    </div>
);

export default Information;