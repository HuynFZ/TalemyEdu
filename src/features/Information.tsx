import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffProfile } from '../services/staffService';
import { supabase } from '../supabaseClient';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Shield,
    Clock, Lock, Key, Eye, EyeOff, Check, Sunrise, Sunset,
    Loader2, CalendarRange, Trash2, Plus, Save,
    ChevronRight, AlertCircle, Info, Sparkles, CheckCircle2, CalendarDays
} from 'lucide-react';

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const Information = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const [tempSchedule, setTempSchedule] = useState<any>({});
    const [busySlots, setBusySlots] = useState<any[]>([]);

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

    const timeToMins = (t: string, isEndTime: boolean = false) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        const mins = h * 60 + m;
        if (isEndTime && mins === 0) return 1440;
        return mins;
    };

    const checkOverlap = (slots: any[], newSlot: any, currentIndex: number = -1) => {
        const nS = timeToMins(newSlot.start);
        const nE = timeToMins(newSlot.end, true);
        return slots.some((s, idx) => {
            if (idx === currentIndex) return false;
            const eS = timeToMins(s.start);
            const eE = timeToMins(s.end, true);
            return nS < eE && nE > eS;
        });
    };

    const fetchData = async () => {
        const data = await getStaffProfile(user!.email);
        if (data) {
            setProfile(data);
            const rawSchedule = data.fixed_schedule;
            setTempSchedule(rawSchedule && typeof rawSchedule === 'object' && !Array.isArray(rawSchedule) ? rawSchedule : {});

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
                    const busy = sessions.map(s => ({
                        day: DAYS_OF_WEEK[(new Date(s.date).getDay() + 6) % 7],
                        start: s.start_time,
                        end: s.end_time
                    }));
                    setBusySlots(busy);
                }
            }
        }
        setLoading(false);
    };

    const addTimeSlot = (day: string) => {
        const newSched = { ...tempSchedule };
        if (!Array.isArray(newSched[day])) newSched[day] = [];
        const lastSlot = newSched[day][newSched[day].length - 1];
        let newStart = "08:00", newEnd = "10:00";
        if (lastSlot) {
            const lastEndMins = timeToMins(lastSlot.end, true);
            if (lastEndMins + 60 < 1440) {
                const h = Math.floor((lastEndMins + 30) / 60);
                const m = (lastEndMins + 30) % 60;
                newStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const endMins = Math.min(lastEndMins + 150, 1440);
                newEnd = `${String(Math.floor(endMins / 60) === 24 ? 0 : Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
            }
        }
        const newSlot = { start: newStart, end: newEnd };
        if (checkOverlap(newSched[day], newSlot)) return alert("Bị trùng với khung giờ hiện có!");
        newSched[day].push(newSlot);
        newSched[day].sort((a: any, b: any) => a.start.localeCompare(b.start));
        setTempSchedule(newSched);
        setHasChanges(true);
    };

    const handleConfirmSaveSchedule = async () => {
        for (const day of Object.keys(tempSchedule)) {
            const slots = tempSchedule[day];
            if (!Array.isArray(slots)) continue;
            for (let i = 0; i < slots.length; i++) {
                const s1 = slots[i];
                const s1Start = timeToMins(s1.start), s1End = timeToMins(s1.end, true);
                if (s1End <= s1Start) return alert(`Lỗi ở ${day}: Giờ kết thúc phải lớn hơn bắt đầu!`);
                for (let j = i + 1; j < slots.length; j++) {
                    const s2 = slots[j];
                    if (s1Start < timeToMins(s2.end, true) && s1End > timeToMins(s2.start)) return alert(`Lỗi ở ${day}: Khung giờ bị chồng chéo!`);
                }
                const classesInDay = busySlots.filter(b => b.day === day);
                for (const b of classesInDay) {
                    const isCovered = slots.some(s => timeToMins(s.start) <= timeToMins(b.start) && timeToMins(s.end, true) >= timeToMins(b.end, true));
                    if (!isCovered) return alert(`Lỗi ở ${day}: Bạn đang có lớp dạy ${b.start}-${b.end}. Hãy bao phủ khung giờ này!`);
                }
            }
        }
        setIsSavingSchedule(true);
        try {
            const { error } = await supabase.from('staffs').update({ fixed_schedule: tempSchedule }).eq('id', profile.id);
            if (error) throw error;
            setHasChanges(false);
            alert("Đã cập nhật lịch rảnh!");
        } finally { setIsSavingSchedule(false); }
    };

    const handleVerifyOldPassword = async () => {
        if (!oldPassword) return;
        setVerifying(true);
        try {
            const { data: userData } = await supabase.from('users').select('password').eq('id', profile.user_id).single();
            if (userData?.password === oldPassword) setIsVerified(true);
            else setPwdError('Mật khẩu không đúng!');
        } finally { setVerifying(false); }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 text-sm">ĐANG TẢI HỒ SƠ...</div>;

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">

                {/* --- HEADER --- */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-28 h-28 bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-xl uppercase">
                            {profile?.name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-xl shadow-lg border border-slate-50">
                            <Sparkles className="text-orange-500" size={18} />
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">{profile?.name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="px-4 py-1 bg-orange-50 text-orange-600 font-bold text-[10px] rounded-full border border-orange-100 uppercase tracking-widest">{profile?.role}</span>
                            <span className="px-4 py-1 bg-slate-100 text-slate-500 font-bold text-[10px] rounded-full border border-slate-200 uppercase tracking-widest">ID: {profile?.id?.slice(0,8)}</span>
                        </div>
                    </div>
                </div>

                {/* --- KHUNG GIỜ RẢNH --- */}
                {profile?.role === 'teacher' && (
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 relative">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-50 pb-6 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-100">
                                    <CalendarRange size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Lịch rảnh cố định</h3>
                                    <p className="text-slate-400 text-[11px] font-medium italic">Thiết lập ca dạy hàng tuần để Sale xếp lớp.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleConfirmSaveSchedule}
                                disabled={!hasChanges || isSavingSchedule}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-lg active:scale-95 ${
                                    hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {isSavingSchedule ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Lưu thay đổi
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {DAYS_OF_WEEK.map((day) => (
                                <div key={day} className="bg-slate-50/50 border border-slate-200/60 rounded-[1.5rem] p-5 flex flex-col min-h-[220px] transition-all hover:bg-white hover:shadow-md">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="font-black uppercase text-[11px] tracking-widest text-slate-800">{day}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => setFullDay(day)} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm" title="Cả ngày"><CalendarDays size={14} /></button>
                                            <button onClick={() => addTimeSlot(day)} className="p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-sm"><Plus size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                        {(!tempSchedule[day] || tempSchedule[day].length === 0) ? (
                                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                                                <Clock size={24} />
                                                <span className="text-[9px] font-black uppercase mt-1">Trống</span>
                                            </div>
                                        ) : (
                                            tempSchedule[day].map((slot: any, index: number) => (
                                                <div key={index} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2 group animate-in zoom-in duration-200">
                                                    <div className="flex-1 flex flex-col gap-1.5">
                                                        <input type="time" className="bg-slate-50 border-none rounded-lg text-[10px] font-black p-1 outline-none focus:ring-1 focus:ring-orange-500 text-slate-700" value={slot.start} onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)} />
                                                        <input type="time" className="bg-slate-50 border-none rounded-lg text-[10px] font-black p-1 outline-none focus:ring-1 focus:ring-orange-500 text-slate-700" value={slot.end} onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)} />
                                                    </div>
                                                    <button onClick={() => { const newSched = { ...tempSchedule }; newSched[day].splice(index, 1); setTempSchedule(newSched); setHasChanges(true); }} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* THÔNG TIN CƠ BẢN */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={18} className="text-orange-500" /> Thông tin cá nhân</h3>
                        <div className="space-y-4">
                            <InfoItem icon={<Mail />} label="Email công việc" value={profile?.email} />
                            <InfoItem icon={<Phone />} label="Số điện thoại" value={profile?.phone} />
                            <InfoItem icon={<MapPin />} label="Địa chỉ liên hệ" value={profile?.address} />
                        </div>
                    </div>

                    {/* BẢO MẬT */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Lock size={18} className="text-orange-500" /> Bảo mật</h3>
                        {pendingPwdRequest ? (
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col items-center text-center gap-3 animate-pulse">
                                <Clock className="text-blue-500 animate-spin" size={32} />
                                <p className="text-blue-800 font-black text-[10px] uppercase">Chờ duyệt mật khẩu mới</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!isVerified ? (
                                    <div className="space-y-3">
                                        <input type="password" placeholder="Mật khẩu hiện tại" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-xl outline-none font-bold text-sm shadow-inner transition-all" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                                        <button onClick={handleVerifyOldPassword} className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl hover:bg-orange-600 transition-all shadow-lg text-[11px] uppercase tracking-widest">Xác thực</button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-in slide-in-from-right">
                                        <input type="password" placeholder="Mật khẩu mới" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-xl outline-none font-bold text-sm shadow-inner" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        <button onClick={() => handleSubmitPasswordRequest()} className="w-full bg-orange-500 text-white font-black py-3.5 rounded-xl shadow-lg text-[11px] uppercase tracking-widest">Đổi mật khẩu</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* CÔNG TÁC & LƯƠNG */}
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Briefcase size={18} className="text-orange-500" /> Công tác & Lương</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InfoItem icon={<Calendar />} label="Ngày gia nhập" value={profile?.hire_date} />
                        <InfoItem icon={<Shield />} label="Quyền hạn" value={profile?.role?.toUpperCase()} />
                        <div className="flex items-start gap-4 p-3 rounded-2xl bg-slate-50/50 border border-slate-100 shadow-inner">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black shadow-md text-sm">$</div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Lương cơ bản</p>
                                <p className="font-black text-slate-800 text-base">{profile?.salary?.toLocaleString()} <span className="text-[10px]">VND</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value }: any) => (
    <div className="flex items-start gap-4 p-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner shrink-0 border border-slate-50">{React.cloneElement(icon, { size: 18 })}</div>
        <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="font-black text-slate-700 truncate text-sm italic">{value || '---'}</p>
        </div>
    </div>
);

export default Information;