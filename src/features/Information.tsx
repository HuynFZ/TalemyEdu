import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffProfile } from '../services/staffService';
import { db } from '../firebase';
import {
    doc, collection, addDoc, serverTimestamp,
    query, where, getDocs, onSnapshot
} from 'firebase/firestore';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Shield,
    CheckCircle2, Clock, Send, Lock, AlertCircle, Info
} from 'lucide-react';

const DAYS_OF_WEEK = ['Thứ 2', 'Thứ Ba', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const DAYS_MAP: { [key: string]: number } = {
    'Chủ Nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6
};

const Information = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [tempSchedule, setTempSchedule] = useState<string[]>([]);
    const [activeDays, setActiveDays] = useState<string[]>([]);
    const [pendingRequest, setPendingRequest] = useState<any>(null);

    useEffect(() => {
        if (user?.email) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        const data = await getStaffProfile(user!.email);
        if (data) {
            setProfile(data);
            setTempSchedule(data.fixedSchedule || []);

            // 1. Kiểm tra yêu cầu đang chờ duyệt
            const qReq = query(
                collection(db, "scheduleRequests"),
                where("teacherId", "==", data.id),
                where("status", "==", "pending")
            );
            onSnapshot(qReq, (snap) => {
                if (!snap.empty) setPendingRequest({ id: snap.docs[0].id, ...snap.docs[0].data() });
                else setPendingRequest(null);
            });

            // 2. Kiểm tra các thứ đang có lớp dạy (sessions chưa diễn ra)
            const qClasses = query(collection(db, "classes"), where("teacherId", "==", data.id));
            const classSnap = await getDocs(qClasses);

            const daysInUse: string[] = [];
            for (const classDoc of classSnap.docs) {
                const qSessions = query(
                    collection(db, "sessions"),
                    where("classId", "==", classDoc.id),
                    where("status", "==", "Chưa diễn ra")
                );
                const sessionSnap = await getDocs(qSessions);
                sessionSnap.forEach(s => {
                    const date = new Date(s.data().date);
                    const dayNum = date.getDay();
                    const dayName = Object.keys(DAYS_MAP).find(key => DAYS_MAP[key] === dayNum);
                    if (dayName && !daysInUse.includes(dayName)) daysInUse.push(dayName);
                });
            }
            setActiveDays(daysInUse);
        }
        setLoading(false);
    };

    const toggleDay = (day: string) => {
        if (pendingRequest) return; // Nếu đang chờ duyệt thì không cho chỉnh sửa tiếp

        const isCurrentlySelected = tempSchedule.includes(day);
        const isInUseByClass = activeDays.includes(day);

        if (isInUseByClass && isCurrentlySelected) {
            alert(`Bạn không thể bỏ ${day} vì đang có lớp học chưa hoàn thành vào thứ này!`);
            return;
        }

        setTempSchedule(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSubmitRequest = async () => {
        if (tempSchedule.length < 2) return alert("Bạn phải chọn ít nhất 2 ngày rảnh!");

        setSubmitting(true);
        try {
            await addDoc(collection(db, "scheduleRequests"), {
                teacherId: profile.id,
                teacherName: profile.name,
                oldSchedule: profile.fixedSchedule || [],
                newSchedule: tempSchedule,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            alert("Đã gửi yêu cầu thay đổi lịch tới Admin!");
        } catch (error) {
            alert("Lỗi hệ thống!");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400 uppercase">Đang tải hồ sơ...</div>;

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* HEADER HỒ SƠ */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-orange-200 shrink-0">
                        {profile?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black text-slate-800 mb-2">{profile?.name}</h2>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="px-4 py-1.5 bg-orange-50 text-orange-600 font-black text-[10px] rounded-full border border-orange-100 uppercase tracking-widest">{user?.role}</span>
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 font-black text-[10px] rounded-full border border-emerald-100 uppercase tracking-widest">Đang hoạt động</span>
                        </div>
                    </div>
                </div>

                {/* THÔNG TIN CHI TIẾT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><User size={18} className="text-orange-500" /> Thông tin cơ bản</h3>
                        <div className="space-y-6">
                            <InfoItem icon={<Mail />} label="Email công việc" value={user?.email} />
                            <InfoItem icon={<Phone />} label="Số điện thoại" value={profile?.phone} />
                            <InfoItem icon={<MapPin />} label="Địa chỉ" value={profile?.address} />
                        </div>
                    </div>
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Briefcase size={18} className="text-orange-500" /> Công việc & Lương</h3>
                        <div className="space-y-6">
                            <InfoItem icon={<Calendar />} label="Ngày gia nhập" value={profile?.hireDate} />
                            <InfoItem icon={<DollarSign label="Lương" />} label="Lương cơ bản" value={`${profile?.salary?.toLocaleString()} VND`} />
                            <InfoItem icon={<Shield />} label="Quyền hạn" value={user?.role.toUpperCase()} />
                        </div>
                    </div>
                </div>

                {/* PHẦN ĐỀ XUẤT LỊCH (CHỈ GIẢNG VIÊN) */}
                {user?.role === 'teacher' && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={18} className="text-orange-500" /> Thay đổi lịch rảnh cố định
                                </h3>
                                {pendingRequest && (
                                    <p className="text-orange-500 text-[10px] font-black uppercase mt-1 animate-pulse flex items-center gap-1">
                                        <AlertCircle size={12}/> Đang chờ Admin duyệt yêu cầu...
                                    </p>
                                )}
                            </div>

                            {!pendingRequest && (
                                <button
                                    disabled={submitting}
                                    onClick={handleSubmitRequest}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                                >
                                    <Send size={16} /> {submitting ? "ĐANG GỬI..." : "GỬI YÊU CẦU DUYỆT"}
                                </button>
                            )}
                        </div>

                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8 flex gap-3 items-start">
                            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                                Quy định: Chọn ít nhất 2 ngày rảnh/tuần. Những thứ đang có lớp dạy sẽ bị khóa <Lock size={10} className="inline"/>.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                            {DAYS_OF_WEEK.map((day) => {
                                const isSelected = tempSchedule.includes(day);
                                const isInUse = activeDays.includes(day);
                                return (
                                    <button
                                        key={day}
                                        disabled={!!pendingRequest}
                                        onClick={() => toggleDay(day)}
                                        className={`relative p-5 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-3 ${
                                            isSelected ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-slate-50 bg-slate-50/50'
                                        } ${pendingRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
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

const DollarSign = ({ label }: any) => <span className="font-bold text-lg">$</span>;

export default Information;