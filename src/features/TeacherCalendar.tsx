import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    ChevronLeft, ChevronRight, Plus, Clock, User,
    Video, Calendar as CalendarIcon, Info, Trash2, CheckCircle2
} from 'lucide-react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // Từ 7:00 đến 22:00
const DAYS = [
    { label: 'Chủ Nhật', value: 0 },
    { label: 'Thứ 2', value: 1 },
    { label: 'Thứ 3', value: 2 },
    { label: 'Thứ 4', value: 3 },
    { label: 'Thứ 5', value: 4 },
    { label: 'Thứ 6', value: 5 },
    { label: 'Thứ 7', value: 6 },
];

const TeacherCalendar = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [availability, setAvailability] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Quản lý việc chọn Giảng viên (Dành cho Sale/Admin)
    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    useEffect(() => {
        fetchInitialData();
    }, [user]);

    useEffect(() => {
        if (selectedTeacherId) {
            fetchTeacherCalendar(selectedTeacherId);
        }
    }, [selectedTeacherId]);

    const fetchInitialData = async () => {
        const { data: staff } = await supabase.from('staffs').select('*').eq('email', user?.email).single();
        setProfile(staff);

        if (user?.role === 'teacher') {
            setSelectedTeacherId(staff.id);
        } else {
            const { data: teachers } = await supabase.from('staffs').select('id, name').eq('role', 'teacher');
            setAllTeachers(teachers || []);
        }
    };

    const fetchTeacherCalendar = async (tId: string) => {
        setLoading(true);
        // 1. Khung giờ rảnh (Mờ)
        const { data: avail } = await supabase.from('teacher_availability').select('*').eq('teacher_id', tId);
        setAvailability(avail || []);

        // 2. Lịch dạy chính thức (Đậm)
        const { data: sess } = await supabase.from('sessions')
            .select(`*, classes(name, student_name, zoom_link)`)
            .eq('teacher_id', tId);
        setSessions(sess || []);
        setLoading(false);
    };

    // Hàm thêm/xóa giờ rảnh (Chỉ dành cho Giảng viên)
    const handleCellClick = async (dayIdx: number, hour: number) => {
        if (user?.role !== 'teacher') return; // Admin/Sale không được click

        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

        const existing = availability.find(a => a.day_of_week === dayIdx && a.start_time.startsWith(startTime));

        if (existing) {
            // Nếu đã có thì xóa (Toggle)
            await supabase.from('teacher_availability').delete().eq('id', existing.id);
        } else {
            // Nếu chưa có thì thêm
            await supabase.from('teacher_availability').insert([{
                teacher_id: profile.id,
                day_of_week: dayIdx,
                start_time: startTime,
                end_time: endTime
            }]);
        }
        fetchTeacherCalendar(profile.id);
    };

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic uppercase tracking-tighter">
                        <CalendarIcon className="text-orange-500" size={28} />
                        Lịch Biểu Giảng Dạy
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                        {user?.role === 'teacher' ? 'Click vào ô trống để đăng ký khung giờ rảnh của bạn' : 'Xem lịch để tư vấn lộ trình cho Học viên'}
                    </p>
                </div>

                {(user?.role !== 'teacher') && (
                    <div className="flex flex-col gap-1 w-full md:w-64">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Chọn Giảng Viên</label>
                        <select
                            className="p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-orange-500 transition-all cursor-pointer"
                            value={selectedTeacherId}
                            onChange={(e) => setSelectedTeacherId(e.target.value)}
                        >
                            <option value="">-- Danh sách GV --</option>
                            {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* --- CALENDAR BODY --- */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">

                {/* Thứ trong tuần */}
                <div className="grid grid-cols-8 bg-slate-900 text-white shadow-lg z-10">
                    <div className="p-5 border-r border-white/5 flex items-center justify-center">
                        <Clock size={20} className="text-slate-500" />
                    </div>
                    {DAYS.map((day) => (
                        <div key={day.value} className="p-5 text-center border-r border-white/5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{day.label === 'Chủ Nhật' ? 'CN' : 'Thứ'}</p>
                            <p className="text-lg font-black italic">{day.label.replace('Thứ ', '')}</p>
                        </div>
                    ))}
                </div>

                {/* Grid Giờ */}
                <div className="relative overflow-y-auto max-h-[65vh] custom-scrollbar">
                    {HOURS.map(hour => (
                        <div key={hour} className="grid grid-cols-8 border-b border-slate-50 min-h-[100px]">
                            {/* Cột hiển thị giờ bên trái */}
                            <div className="bg-slate-50/50 border-r border-slate-100 p-4 flex flex-col items-end justify-start">
                                <span className="text-sm font-black text-slate-800">{hour}:00</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">GMT+7</span>
                            </div>

                            {/* 7 Cột ngày */}
                            {DAYS.map((day) => {
                                // Kiểm tra giờ rảnh (Availability - Mờ)
                                const isAvailable = availability.find(a =>
                                    a.day_of_week === day.value &&
                                    parseInt(a.start_time.split(':')[0]) === hour
                                );

                                // Kiểm tra lịch dạy (Sessions - Đậm)
                                const session = sessions.find(s => {
                                    const sDate = new Date(s.date);
                                    return sDate.getDay() === day.value && parseInt(s.start_time?.split(':')[0]) === hour;
                                });

                                return (
                                    <div
                                        key={day.value}
                                        onClick={() => handleCellClick(day.value, hour)}
                                        className={`relative border-r border-slate-50 p-1 transition-all group
                                            ${user?.role === 'teacher' ? 'cursor-pointer hover:bg-orange-50/30' : 'cursor-default'}
                                            ${isAvailable ? 'bg-orange-50/40' : ''}
                                        `}
                                    >
                                        {/* Hiển thị buổi học chính thức */}
                                        {session && (
                                            <div className="absolute inset-1.5 bg-blue-600 text-white rounded-2xl p-3 shadow-xl z-20 animate-in zoom-in duration-300 border-2 border-white flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase leading-none opacity-80 mb-1">{session.classes?.name}</p>
                                                    <p className="text-sm font-black leading-tight italic truncate">{session.classes?.student_name}</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-2 border-t border-white/20 pt-2">
                                                    <Video size={12} />
                                                    <span className="text-[9px] font-bold uppercase tracking-tighter">Đã chốt</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hiển thị gợi ý giờ rảnh (Mờ) */}
                                        {isAvailable && !session && (
                                            <div className="w-full h-full rounded-2xl border-2 border-dashed border-orange-200 flex items-center justify-center bg-white/50">
                                                <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <CheckCircle2 size={20} className="text-orange-500 mb-1" />
                                                    <span className="text-[8px] font-black text-orange-600 uppercase">Sẵn sàng</span>
                                                </div>
                                                {user?.role === 'teacher' && (
                                                    <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Hiển thị nút Plus khi hover (Chỉ Teacher) */}
                                        {!isAvailable && !session && user?.role === 'teacher' && (
                                            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- CHÚ THÍCH --- */}
            <div className="mt-8 flex flex-wrap gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-600 rounded-lg shadow-lg"></div>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Lịch đã xếp lớp</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-50 border-2 border-dashed border-orange-200 rounded-lg"></div>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Giờ GV đang rảnh</span>
                </div>
                <div className="flex items-center gap-3 border-l pl-6 border-slate-100 ml-auto">
                    <Info size={16} className="text-blue-500" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                        Lưu ý: Lịch này hiển thị khung giờ cố định hàng tuần.
                    </p>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default TeacherCalendar;