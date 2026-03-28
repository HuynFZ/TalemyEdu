import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffProfile } from '../services/staffService';
import { supabase } from '../supabaseClient';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Shield,
    CheckCircle2, Clock, Send, Lock, AlertCircle, Info, Key, Eye, EyeOff, Check
} from 'lucide-react';

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAYS_MAP: { [key: string]: number } = {
    'Chủ Nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6
};

const Information = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submittingSchedule, setSubmittingSchedule] = useState(false);
    const [submittingPwd, setSubmittingPwd] = useState(false);

    // --- STATES ĐỔI LỊCH (DÀNH CHO GIẢNG VIÊN) ---
    const [tempSchedule, setTempSchedule] = useState<string[]>([]);
    const [activeDays, setActiveDays] = useState<string[]>([]);
    const [pendingScheduleRequest, setPendingScheduleRequest] = useState<any>(null);

    // --- STATES ĐỔI MẬT KHẨU ---
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [pendingPwdRequest, setPendingPwdRequest] = useState<any>(null);

    useEffect(() => {
        if (user?.email) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        const data = await getStaffProfile(user!.email);
        if (data) {
            setProfile(data);
            setTempSchedule(data.fixed_schedule || []);

            // 1. Theo dõi yêu cầu đổi lịch (Teacher)
            const fetchScheduleReq = async () => {
                const { data: sReq } = await supabase
                    .from('schedule_requests')
                    .select('*')
                    .eq('teacher_id', data.id)
                    .eq('status', 'pending')
                    .maybeSingle();
                setPendingScheduleRequest(sReq);
            };

            // 2. Theo dõi yêu cầu đổi mật khẩu
            const fetchPwdReq = async () => {
                const { data: pReq } = await supabase
                    .from('password_requests')
                    .select('*')
                    .eq('user_id', data.user_id)
                    .eq('status', 'pending')
                    .maybeSingle();
                setPendingPwdRequest(pReq);
            };

            // 3. Kiểm tra các thứ đang có lớp dạy (Chỉ GV mới check)
            if (data.role === 'teacher') {
                const { data: classes } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('teacher_id', data.id);

                if (classes && classes.length > 0) {
                    const classIds = classes.map(c => c.id);
                    const { data: sessions } = await supabase
                        .from('sessions')
                        .select('date')
                        .in('class_id', classIds)
                        .eq('status', 'Chưa diễn ra');

                    const daysInUse: string[] = [];
                    sessions?.forEach(s => {
                        const date = new Date(s.date);
                        const dayName = Object.keys(DAYS_MAP).find(key => DAYS_MAP[key] === date.getDay());
                        if (dayName && !daysInUse.includes(dayName)) daysInUse.push(dayName);
                    });
                    setActiveDays(daysInUse);
                }
            }

            await fetchScheduleReq();
            await fetchPwdReq();

            // Thiết lập Realtime lắng nghe trạng thái yêu cầu
            supabase.channel('info-requests')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'password_requests' }, fetchPwdReq)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_requests' }, fetchScheduleReq)
                .subscribe();
        }
        setLoading(false);
    };

    // --- LOGIC XỬ LÝ MẬT KHẨU ---
    const handleVerifyOldPassword = async () => {
        if (!oldPassword) return;
        setVerifying(true);
        setPwdError('');
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('password')
                .eq('id', profile.user_id)
                .single();

            if (userData && userData.password === oldPassword) {
                setIsVerified(true);
            } else {
                setPwdError('Mật khẩu cũ không chính xác!');
            }
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
            alert("Đã gửi yêu cầu đổi mật khẩu tới Admin!");
        } catch (error) { alert("Lỗi gửi yêu cầu!"); }
        finally { setSubmittingPwd(false); }
    };

    // --- LOGIC XỬ LÝ ĐỔI LỊCH (GIẢNG VIÊN) ---
    const toggleDay = (day: string) => {
        if (pendingScheduleRequest) return;
        const isCurrentlySelected = tempSchedule.includes(day);
        if (activeDays.includes(day) && isCurrentlySelected) {
            alert(`Bạn không thể bỏ ${day} vì đang có lớp học chưa hoàn thành vào thứ này!`);
            return;
        }
        setTempSchedule(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    const handleSubmitSchedule = async () => {
        if (tempSchedule.length < 2) return alert("Bạn phải chọn ít nhất 2 ngày rảnh!");
        setSubmittingSchedule(true);
        try {
            const { error } = await supabase.from('schedule_requests').insert([{
                teacher_id: profile.id,
                teacher_name: profile.name,
                old_schedule: profile.fixed_schedule || [],
                new_schedule: tempSchedule,
                status: 'pending'
            }]);

            if (error) throw error;
            alert("Đã gửi yêu cầu thay đổi lịch tới Admin!");
        } catch (error) { alert("Lỗi hệ thống!"); }
        finally { setSubmittingSchedule(false); }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase">Đang tải hồ sơ...</div>;

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={18} className="text-orange-500" /> Thông tin cơ bản</h3>
                        <InfoItem icon={<Mail />} label="Email công việc" value={profile?.email} />
                        <InfoItem icon={<Phone />} label="Số điện thoại" value={profile?.phone} />
                        <InfoItem icon={<MapPin />} label="Địa chỉ" value={profile?.address} />
                    </div>

                    {/* KHỐI 2: BẢO MẬT & ĐỔI PASS */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={18} className="text-orange-500" /> Đổi mật khẩu</h3>
                        {pendingPwdRequest ? (
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col items-center text-center gap-3">
                                <Clock className="text-blue-500 animate-spin" size={32} />
                                <p className="text-blue-800 font-black text-[10px] uppercase">Đang chờ Admin duyệt pass mới</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!isVerified ? (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Xác thực mật khẩu cũ</label>
                                            <input type="password" placeholder="••••••••" className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold text-sm transition-all ${pwdError ? 'border-red-200' : 'border-transparent focus:border-orange-500/10'}`} value={oldPassword} onChange={(e) => {setOldPassword(e.target.value); setPwdError('');}} />
                                            {pwdError && <p className="text-[10px] text-red-500 font-bold ml-1">{pwdError}</p>}
                                        </div>
                                        <button disabled={verifying || !oldPassword} onClick={handleVerifyOldPassword} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all text-xs uppercase shadow-lg disabled:opacity-50">
                                            {verifying ? "ĐANG KIỂM TRA..." : "XÁC THỰC MẬT KHẨU"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-right duration-300">
                                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase"><Check size={14}/> Xác thực thành công</div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mật khẩu mới</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                                <input type={showPassword ? "text" : "password"} className="w-full pl-11 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 rounded-2xl outline-none font-bold text-slate-700 text-sm" placeholder="Nhập pass mới..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                            </div>
                                        </div>
                                        <button disabled={submittingPwd || !newPassword} onClick={handleSubmitPasswordRequest} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all text-xs uppercase shadow-lg shadow-orange-100">GỬI YÊU CẦU DUYỆT</button>
                                        <button onClick={() => setIsVerified(false)} className="w-full text-[10px] font-black text-slate-400 uppercase">Quay lại</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* KHỐI 3: CÔNG VIỆC & LƯƠNG */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Briefcase size={18} className="text-orange-500" /> Công việc & Lương</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InfoItem icon={<Calendar />} label="Ngày gia nhập" value={profile?.hire_date} />
                        <InfoItem icon={<Shield />} label="Quyền hạn" value={profile?.role?.toUpperCase()} />
                        <div className="flex items-start gap-4 p-2 overflow-hidden">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-orange-500 shrink-0 font-black">$</div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lương cơ bản</p>
                                <p className="font-bold text-slate-700 text-sm">{profile?.salary?.toLocaleString()} VND</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KHỐI 4: CHỌN LỊCH RẢNH (CHỈ GIẢNG VIÊN) */}
                {profile?.role === 'teacher' && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm animate-in zoom-in duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={18} className="text-orange-500" /> Lịch giảng dạy cố định
                                </h3>
                                {pendingScheduleRequest && (
                                    <p className="text-orange-500 text-[10px] font-black uppercase mt-1 animate-pulse flex items-center gap-1">
                                        <AlertCircle size={12}/> Đang chờ Admin duyệt lịch mới...
                                    </p>
                                )}
                            </div>
                            {!pendingScheduleRequest && (
                                <button disabled={submittingSchedule} onClick={handleSubmitSchedule} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg">
                                    <Send size={16} /> GỬI LỊCH MỚI
                                </button>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8 flex gap-3 items-start">
                            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                Chọn ít nhất 2 ngày rảnh. Những thứ đang có lớp học sẽ không được bỏ chọn <Lock size={10} className="inline"/>.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                            {DAYS_OF_WEEK.map((day) => {
                                const isSelected = tempSchedule.includes(day);
                                const isInUse = activeDays.includes(day);
                                return (
                                    <button key={day} disabled={!!pendingScheduleRequest} onClick={() => toggleDay(day)} className={`relative p-5 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 ${isSelected ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-50 bg-slate-50/50'} ${pendingScheduleRequest ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>{day}</span>
                                        <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-orange-500' : 'bg-slate-200'}`}></div>
                                        {isInUse && <Lock size={12} className="absolute top-2 right-2 text-slate-300" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
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