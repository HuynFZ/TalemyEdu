import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    ChevronLeft, ChevronRight, Plus, Clock, User,
    Video, Calendar as CalendarIcon, Info, Trash2, CheckCircle2, Loader2, X, Check, BookOpen, Repeat, Mic, PencilLine, FileSearch, Sunrise, Sunset
} from 'lucide-react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 -> 21:00
const DAYS_LABEL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const TeacherCalendar = () => {
    const { user } = useAuth();
    const [viewDate, setViewDate] = useState(new Date());
    const [profile, setProfile] = useState<any>(null);
    const [availability, setAvailability] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTimePos, setCurrentTimePos] = useState(0);

    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    // --- MODAL STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<any>(null);
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('08:00');
    const [focusType, setFocusType] = useState('Writing');
    const [formClassId, setFormClassId] = useState('');
    const [repeatMode, setRepeatMode] = useState('none');
    const [repeatWeeks, setRepeatWeeks] = useState(1);
    const [classLimitInfo, setClassLimitInfo] = useState({ total: 0, used: 0, remaining: 0 });
    const [isSaving, setIsSaving] = useState(false);

    // --- HELPERS ---
    const toDateString = (date: Date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const timeToMins = (t: string) => {
        if (!t) return 0;
        const parts = t.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    };

    const isPastDateTime = (dateStr: string, timeStr: string) => {
        const now = new Date();
        const target = new Date(`${dateStr}T${timeStr}`);
        return target < now;
    };

    const weekDays = (() => {
        const start = new Date(viewDate);
        start.setDate(viewDate.getDate() - viewDate.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    })();

    // Tự động tính giờ kết thúc
    useEffect(() => {
        if (!startTime) return;
        const [h, m] = startTime.split(':').map(Number);
        const duration = focusType === 'Speaking' ? 40 : 60;
        const total = h * 60 + m + duration;
        setEndTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
    }, [startTime, focusType]);

    // Check giới hạn buổi học
    useEffect(() => {
        if (formClassId) {
            const fetchLimit = async () => {
                const { data: classData } = await supabase.from('classes').select('*, courses(duration)').eq('id', formClassId).single();
                const { count } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('class_id', formClassId);
                const total = classData?.courses?.duration || 0;
                const used = count || 0;
                setClassLimitInfo({ total, used, remaining: total - used });
            };
            fetchLimit();
        }
    }, [formClassId]);

    // Initial load
    useEffect(() => {
        const fetchInitial = async () => {
            const { data: me } = await supabase.from('staffs').select('*').eq('email', user?.email).single();
            if (user?.role === 'teacher') {
                setProfile(me);
                setSelectedTeacherId(me?.id || '');
            } else {
                const { data: list } = await supabase.from('staffs').select('id, name').eq('role', 'teacher');
                setAllTeachers(list || []);
            }
        };
        fetchInitial();
    }, [user]);

    useEffect(() => {
        if (selectedTeacherId) {
            fetchTeacherCalendar(selectedTeacherId);
            fetchTeacherClasses(selectedTeacherId);
        }
    }, [selectedTeacherId, viewDate]);

    // Red line update
    useEffect(() => {
        const updateLine = () => {
            const now = new Date();
            if (now.getHours() >= 6 && now.getHours() <= 21) {
                const mins = (now.getHours() - 6) * 60 + now.getMinutes();
                setCurrentTimePos((mins / 60) * 100);
            }
        };
        updateLine();
        const timer = setInterval(updateLine, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchTeacherClasses = async (tId: string) => {
        const { data } = await supabase.from('classes').select('id, name').eq('teacher_id', tId).neq('status', 'Kết thúc');
        setTeacherClasses(data || []);
    };

    const fetchTeacherCalendar = async (tId: string) => {
        setLoading(true);
        const { data: tProfile } = await supabase.from('staffs').select('*').eq('id', tId).single();
        setProfile(tProfile);

        const { data: sessData, error } = await supabase
            .from('sessions')
            .select(`id, session_number, date, start_time, end_time, focus_type, is_recurring, class_id, classes!inner(id, name, teacher_id)`)
            .eq('classes.teacher_id', tId)
            .gte('date', toDateString(weekDays[0]))
            .lte('date', toDateString(weekDays[6]));

        if (!error) setSessions(sessData || []);
        setLoading(false);
    };

    // --- LOGIC HÀM KIỂM TRA LỊCH CỐ ĐỊNH ---
    const isShiftMatched = (dayIdx: number, hour: number) => {
        if (!profile?.fixed_schedule) return false;
        const dayName = DAYS_LABEL[dayIdx];
        if (hour >= 7 && hour < 10 && profile.fixed_schedule.includes(`${dayName} - Sáng`)) return true;
        if (hour >= 13 && hour < 16 && profile.fixed_schedule.includes(`${dayName} - Chiều`)) return true;
        return false;
    };

    const isSlotValid = (dateStr: string, start: string, end: string) => {
        if (!profile?.fixed_schedule) return false;
        const d = new Date(dateStr);
        const dayName = DAYS_LABEL[d.getDay()];
        const sMins = timeToMins(start);
        const eMins = timeToMins(end);
        const isMorning = sMins >= 420 && eMins <= 600 && profile.fixed_schedule.includes(`${dayName} - Sáng`);
        const isAfternoon = sMins >= 780 && eMins <= 960 && profile.fixed_schedule.includes(`${dayName} - Chiều`);
        return isMorning || isAfternoon;
    };

    const isOverlapping = (date: string, start: string, end: string, excludeId?: string) => {
        const newS = timeToMins(start);
        const newE = timeToMins(end);
        return sessions.some(s => {
            if (s.id === excludeId || s.date !== date) return false;
            return (newS < timeToMins(s.end_time) && newE > timeToMins(s.start_time));
        });
    };

    // --- HANDLERS ---
    const handleCellClick = (date: Date, hour: number) => {
        if (user?.role !== 'teacher') return;
        const dateStr = toDateString(date);
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        if (isPastDateTime(dateStr, timeStr)) return alert("Không thể thêm lịch vào quá khứ!");
        setEditingSession(null);
        setSelectedDate(dateStr);
        setStartTime(timeStr);
        setFormClassId('');
        setRepeatMode('none');
        setIsModalOpen(true);
    };

    const handleEditSession = (session: any) => {
        if (user?.role !== 'teacher') return;
        if (isPastDateTime(session.date, session.start_time)) return alert("Buổi học đã diễn ra, không thể sửa!");
        setEditingSession(session);
        setFormClassId(session.class_id);
        setSelectedDate(session.date);
        setStartTime(session.start_time.slice(0,5));
        setFocusType(session.focus_type || 'Writing');
        setIsModalOpen(true);
    };

    const handleDeleteSession = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa buổi học này?")) return;
        const { error } = await supabase.from('sessions').delete().eq('id', id);
        if (!error) {
            setIsModalOpen(false);
            fetchTeacherCalendar(selectedTeacherId);
            alert("Đã xóa buổi học thành công.");
        }
    };

    const handleSaveSession = async () => {
        if (!formClassId) return alert("Vui lòng chọn lớp!");
        if (!isSlotValid(selectedDate, startTime, endTime)) return alert("Vui lòng chọn giờ trong khung cố định (7-10h hoặc 13-16h)!");
        if (isPastDateTime(selectedDate, startTime)) return alert("Không thể lưu vào quá khứ!");
        if (isOverlapping(selectedDate, startTime, endTime, editingSession?.id)) return alert("Trùng lịch rồi!");

        setIsSaving(true);
        try {
            if (editingSession) {
                await supabase.from('sessions').update({
                    date: selectedDate, start_time: startTime, end_time: endTime, focus_type: focusType
                }).eq('id', editingSession.id);
            } else {
                let curr = new Date(selectedDate);
                const dates = [toDateString(curr)];
                if (repeatMode !== 'none') {
                    for (let i = 1; i < 100; i++) {
                        curr.setDate(curr.getDate() + 1);
                        const dStr = toDateString(curr);
                        if (repeatMode === 'daily') dates.push(dStr);
                        else if (repeatMode === 'weekly' && (curr.getDay() === new Date(selectedDate).getDay())) dates.push(dStr);
                        else if (repeatMode === 'weekdays' && curr.getDay() !== 0 && curr.getDay() !== 6) dates.push(dStr);
                        if ((repeatMode === 'weekly' && dates.length >= repeatWeeks) || (repeatMode === 'daily' && dates.length >= repeatWeeks * 7) || (repeatMode === 'weekdays' && dates.length >= repeatWeeks * 5)) break;
                    }
                }
                if (dates.length > classLimitInfo.remaining) return alert(`Lớp chỉ còn ${classLimitInfo.remaining} buổi!`);
                const toInsert = dates.map((d, i) => ({ class_id: formClassId, session_number: classLimitInfo.used + i + 1, date: d, start_time: startTime, end_time: endTime, focus_type: focusType, status: 'Chưa diễn ra', is_recurring: repeatMode !== 'none' }));
                await supabase.from('sessions').insert(toInsert);
            }
            setIsModalOpen(false);
            fetchTeacherCalendar(selectedTeacherId);
            alert("Thành công!");
        } catch (err: any) { alert(err.message); }
        finally { setIsSaving(false); }
    };

    const getSessionStyle = (session: any) => {
        const s = timeToMins(session.start_time);
        const e = timeToMins(session.end_time);
        const top = ((s - 360) / 60) * 100;
        const height = ((e - s) / 60) * 100;
        return { top: `${top}px`, height: `${height - 2}px` };
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
            {/* --- TOOLBAR --- */}
            <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-[60] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg"><CalendarIcon size={24} /></div>
                        <span className="text-xl font-black uppercase italic tracking-tighter">Lịch Đào Tạo</span>
                    </div>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setViewDate(new Date())} className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold transition-all hover:text-orange-500">Hôm nay</button>
                        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }} className="p-2 hover:bg-white rounded-lg transition-all ml-1"><ChevronLeft size={18}/></button>
                        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
                    </div>
                    <h3 className="text-lg font-black text-slate-700 ml-4">Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}</h3>
                </div>

                {user?.role !== 'teacher' && (
                    <select className="bg-orange-50 border border-orange-100 text-orange-600 font-black text-sm p-2 rounded-xl outline-none" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                        <option value="">Chọn giảng viên...</option>
                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                )}
            </div>

            {/* --- GRID --- */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-white">
                <div className="min-w-[1100px] relative">
                    <div className="flex sticky top-0 z-50 bg-white border-b border-slate-200">
                        <div className="w-20 shrink-0 border-r bg-white"></div>
                        {weekDays.map((day, i) => (
                            <div key={i} className="flex-1 p-3 text-center border-r last:border-r-0 bg-white">
                                <p className={`text-[10px] font-black uppercase ${toDateString(day) === toDateString(new Date()) ? 'text-orange-500' : 'text-slate-400'}`}>{DAYS_LABEL[i]}</p>
                                <div className={`mt-1 inline-flex w-9 h-9 items-center justify-center rounded-full text-lg font-black ${toDateString(day) === toDateString(new Date()) ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-700'}`}>{day.getDate()}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex relative">
                        <div className="w-20 shrink-0 sticky left-0 z-40 bg-white border-r">
                            {HOURS.map(hour => (
                                <div key={hour} className="h-[100px] text-[11px] font-bold text-slate-400 pr-3 text-right pt-2 border-b border-slate-50 bg-white">{hour}:00</div>
                            ))}
                        </div>

                        <div className="flex flex-1 relative bg-white min-h-[1600px]">
                            {toDateString(viewDate) === toDateString(new Date()) && (
                                <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: currentTimePos }}>
                                    <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-md"></div>
                                    <div className="h-[2px] bg-red-400 flex-1"></div>
                                </div>
                            )}

                            {weekDays.map((day, dayIdx) => {
                                const dayStr = toDateString(day);
                                return (
                                    <div key={dayIdx} className="flex-1 border-r border-slate-100 relative group">
                                        {HOURS.map(hour => {
                                            const isFixed = isShiftMatched(dayIdx, hour);
                                            const isPast = isPastDateTime(dayStr, `${String(hour).padStart(2, '0')}:00`);
                                            return (
                                                <div
                                                    key={hour}
                                                    onClick={() => handleCellClick(day, hour)}
                                                    className={`h-[100px] w-full border-b border-slate-50 transition-all relative ${user?.role === 'teacher' && !isPast ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'} ${isFixed ? 'bg-orange-500/[0.04]' : ''}`}
                                                >
                                                    {isFixed && <div className="absolute inset-0 bg-orange-500/[0.03] pointer-events-none"></div>}
                                                    {!isPast && user?.role === 'teacher' && !sessions.some(s => s.date === dayStr && parseInt(s.start_time.split(':')[0]) === hour) && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={18} className="text-slate-200" /></div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {sessions.filter(s => s.date === dayStr).map(session => {
                                            const isPast = isPastDateTime(session.date, session.start_time);
                                            return (
                                                <div
                                                    key={session.id} style={getSessionStyle(session)}
                                                    className={`absolute left-1 right-1 rounded-xl p-3 shadow-lg z-20 border-l-4 flex flex-col justify-between overflow-hidden group transition-all 
                                                        ${isPast ? 'bg-slate-300 border-slate-400 opacity-60 grayscale cursor-not-allowed' : 'bg-blue-600 border-blue-300 hover:z-30 cursor-pointer'}
                                                    `}
                                                    onClick={(e) => { e.stopPropagation(); handleEditSession(session); }}
                                                >
                                                    {!isPast && (
                                                        <button onClick={async (e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="absolute top-1 right-1 p-1 bg-white/10 rounded hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                                            <Trash2 size={12} className="text-white"/>
                                                        </button>
                                                    )}
                                                    <div className="overflow-hidden">
                                                        <p className="text-[9px] font-black uppercase leading-none opacity-80 truncate text-white">{session.classes?.name}</p>
                                                        <div className="flex items-center gap-1 mt-1 text-white">
                                                            {session.focus_type === 'Speaking' ? <Mic size={10}/> : session.focus_type === 'Writing' ? <PencilLine size={10}/> : <FileSearch size={10}/>}
                                                            <span className="text-[10px] font-black truncate">{session.focus_type}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[9px] font-bold opacity-60 text-white">
                                                        <span>{session.start_time?.slice(0,5)} - {session.end_time?.slice(0,5)}</span>
                                                        {session.is_recurring && <Repeat size={10}/>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center text-slate-800">
                            <h3 className="font-black uppercase tracking-tighter italic flex items-center gap-2">
                                <Plus className="text-orange-500" size={20}/> {editingSession ? 'Sửa lịch học' : 'Thiết lập buổi học'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="grid grid-cols-3 gap-2">
                                {['Speaking', 'Writing', 'Chữa đề'].map(type => (
                                    <button key={type} onClick={() => setFocusType(type)} className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${focusType === type ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-orange-200'}`}>{type}</button>
                                ))}
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Chọn lớp học *</label>
                                    {formClassId && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${classLimitInfo.remaining > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>Còn {classLimitInfo.remaining}/{classLimitInfo.total} buổi</span>}
                                </div>
                                <select disabled={!!editingSession} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50" value={formClassId} onChange={(e) => setFormClassId(e.target.value)}>
                                    <option value="">-- Chọn lớp --</option>
                                    {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ngày dạy</label>
                                    <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Bắt đầu</label>
                                    <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                            </div>

                            {!editingSession && (
                                <div className="space-y-2 pt-2 border-t">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Chế độ lặp lại</label>
                                    <select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-600" value={repeatMode} onChange={(e) => setRepeatMode(e.target.value)}>
                                        <option value="none">Không lặp lại</option>
                                        <option value="daily">Hàng ngày</option>
                                        <option value="weekly">Hàng tuần vào ngày này</option>
                                        <option value="weekdays">Mọi ngày trong tuần (T2-T6)</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                {editingSession && (
                                    <button onClick={() => handleDeleteSession(editingSession.id)} className="flex-1 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase text-xs flex items-center justify-center gap-2">
                                        <Trash2 size={16}/> Xóa buổi học
                                    </button>
                                )}
                                <button disabled={isSaving || !formClassId || (!editingSession && classLimitInfo.remaining <= 0)} onClick={handleSaveSession} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase text-xs flex items-center justify-center gap-2 active:scale-95">
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <><Check size={18}/> {editingSession ? 'CẬP NHẬT' : 'XÁC NHẬN LƯU'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherCalendar;