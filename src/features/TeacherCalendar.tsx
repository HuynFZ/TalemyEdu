import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    ChevronLeft, ChevronRight, Plus, Clock, User,
    Video, Calendar as CalendarIcon, Info, Trash2, CheckCircle2, Loader2, X, Check, BookOpen, Repeat, Mic, PencilLine, Sunrise, Sunset, FlaskConical
} from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_LABEL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const TeacherCalendar = () => {
    const { user } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [viewDate, setViewDate] = useState(new Date());
    const [profile, setProfile] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTimePos, setCurrentTimePos] = useState(0);

    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    // --- MODAL STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<any>(null);
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
    const [leadsToTest, setLeadsToTest] = useState<any[]>([]);

    const [bookingType, setBookingType] = useState<'class' | 'lead'>('class');
    const [selectedDate, setSelectedDate] = useState('');
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('08:00');
    const [focusType, setFocusType] = useState('Writing');
    const [formClassId, setFormClassId] = useState('');
    const [formLeadId, setFormLeadId] = useState('');

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

    // Tự động cuộn và tính Line thời gian
    useEffect(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 700;
        const updateLine = () => {
            const now = new Date();
            const mins = now.getHours() * 60 + now.getMinutes();
            setCurrentTimePos((mins / 60) * 100);
        };
        updateLine();
        const timer = setInterval(updateLine, 60000);
        return () => clearInterval(timer);
    }, [loading]);

    // Tự động gợi ý giờ kết thúc
    useEffect(() => {
        if (!startTime || editingSession) return;
        const [h, m] = startTime.split(':').map(Number);
        const minDuration = focusType === 'Speaking' ? 40 : 20;
        const total = h * 60 + m + minDuration;
        setEndTime(`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`);
    }, [startTime, focusType]);

    // Lấy giới hạn buổi học
    useEffect(() => {
        if (formClassId && bookingType === 'class') {
            const fetchLimit = async () => {
                const { data: classData } = await supabase.from('classes').select('*, courses(duration)').eq('id', formClassId).single();
                const { count } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('class_id', formClassId);
                const total = classData?.courses?.duration || 0;
                const used = count || 0;
                setClassLimitInfo({ total, used, remaining: total - used });
            };
            fetchLimit();
        }
    }, [formClassId, bookingType]);

    // Initial Data Load
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
            fetchLeadsToTest();
        }
    }, [selectedTeacherId, viewDate]);

    const fetchTeacherClasses = async (tId: string) => {
        const { data } = await supabase.from('classes').select('id, name').eq('teacher_id', tId).neq('status', 'Kết thúc');
        setTeacherClasses(data || []);
    };

    const fetchLeadsToTest = async () => {
        const { data } = await supabase.from('leads').select('id, name').eq('status', 'HẸN TEST');
        setLeadsToTest(data || []);
    };

    const fetchTeacherCalendar = async (tId: string) => {
        setLoading(true);
        const { data: tProfile } = await supabase.from('staffs').select('*').eq('id', tId).single();
        setProfile(tProfile);

        const { data: teacherClasses } = await supabase.from('classes').select('id').eq('teacher_id', tId);
        const classIds = teacherClasses?.map(c => c.id) || [];

        const { data: sessData, error } = await supabase
            .from('sessions')
            .select(`*, classes(id, name), leads(id, name)`)
            .or(`teacher_id.eq.${tId}, class_id.in.(${classIds.length ? classIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
            .gte('date', toDateString(weekDays[0]))
            .lte('date', toDateString(weekDays[6]));

        if (!error) setSessions(sessData || []);
        setLoading(false);
    };

    // --- LOGIC CHẶN LỊCH NGHIÊM NGẶT THEO MẢNG KHUNG GIỜ ---
    const isShiftMatched = (dayIdx: number, hour: number) => {
        if (!profile?.fixed_schedule) return false;
        const dayName = DAYS_LABEL[dayIdx];
        const daySchedule = profile.fixed_schedule[dayName];

        if (!daySchedule || !Array.isArray(daySchedule)) return false;

        // Trả về true nếu 'hour' nằm trong bất kỳ slot nào của ngày đó
        return daySchedule.some((slot: any) => {
            const sH = parseInt(slot.start.split(':')[0]);
            const eH = parseInt(slot.end.split(':')[0]);
            return hour >= sH && hour < eH;
        });
    };

    const isSlotValidWithFixedSchedule = (dateStr: string, start: string, end: string) => {
        if (!profile?.fixed_schedule) return false;
        const d = new Date(dateStr);
        const dayName = DAYS_LABEL[d.getDay()];
        const daySchedule = profile.fixed_schedule[dayName];

        if (!daySchedule || !Array.isArray(daySchedule)) return false;

        const sMins = timeToMins(start);
        const eMins = timeToMins(end);

        // Buổi học phải nằm TRỌN VẸN trong ít nhất 1 khung giờ rảnh của ngày đó
        return daySchedule.some((slot: any) => {
            return sMins >= timeToMins(slot.start) && eMins <= timeToMins(slot.end);
        });
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
        const dateStr = toDateString(date);
        const timeStr = `${String(hour).padStart(2, '0')}:00`;
        if (isPastDateTime(dateStr, timeStr)) return alert("Không thể thêm lịch vào quá khứ!");

        setEditingSession(null);
        setBookingType('class');
        setSelectedDate(dateStr);
        setStartTime(timeStr);
        setFormClassId('');
        setFormLeadId('');
        setRepeatMode('none');
        setIsModalOpen(true);
    };

    const handleEditSession = (session: any) => {
        if (isPastDateTime(session.date, session.start_time)) return alert("Buổi học đã diễn ra, không thể sửa!");
        setEditingSession(session);
        setBookingType(session.lead_id ? 'lead' : 'class');
        setFormClassId(session.class_id || '');
        setFormLeadId(session.lead_id || '');
        setSelectedDate(session.date);
        setStartTime(session.start_time.slice(0, 5));
        setEndTime(session.end_time.slice(0, 5));
        setFocusType(session.focus_type || 'Writing');
        setIsModalOpen(true);
    };

    const getRecurringDates = (startDateStr: string, mode: string, weeks: number) => {
        let results = [startDateStr];
        if (mode === 'none') return results;
        let current = new Date(startDateStr);
        const targetCount = mode === 'weekly' ? weeks : (mode === 'daily' ? weeks * 7 : weeks * 5);
        while (results.length < targetCount) {
            current.setDate(current.getDate() + 1);
            const dateStr = toDateString(current);
            if (mode === 'daily') results.push(dateStr);
            else if (mode === 'weekly' && current.getDay() === new Date(startDateStr).getDay()) results.push(dateStr);
            else if (mode === 'weekdays' && current.getDay() !== 0 && current.getDay() !== 6) results.push(dateStr);
            if (results.length > 50) break;
        }
        return results;
    };

    const handleSaveSession = async () => {
        const targetId = bookingType === 'class' ? formClassId : formLeadId;
        if (!targetId) return alert("Vui lòng chọn đối tượng!");

        // Validate thời gian tối thiểu
        const sMins = timeToMins(startTime);
        const eMins = timeToMins(endTime);
        const minReq = focusType === 'Speaking' ? 40 : 20;
        if (eMins - sMins < minReq) return alert(`Thời gian học cho ${focusType} tối thiểu ${minReq} phút!`);

        const datesToInsert = getRecurringDates(selectedDate, repeatMode, repeatWeeks);
        if (bookingType === 'class' && !editingSession && datesToInsert.length > classLimitInfo.remaining) return alert(`Lớp chỉ còn ${classLimitInfo.remaining} buổi!`);

        for (const d of datesToInsert) {
            if (!isSlotValidWithFixedSchedule(d, startTime, endTime)) return alert(`Lỗi: Ngày ${d} bị lố khung giờ rảnh đã đăng ký!`);
            if (isOverlapping(d, startTime, endTime, editingSession?.id)) return alert(`Trùng lịch vào ngày ${d}!`);
        }

        if (isPastDateTime(selectedDate, startTime)) return alert("Không thể lưu vào quá khứ!");

        setIsSaving(true);
        try {
            if (editingSession) {
                await supabase.from('sessions').update({
                    date: selectedDate, start_time: startTime, end_time: endTime, focus_type: focusType,
                    class_id: bookingType === 'class' ? formClassId : null,
                    lead_id: bookingType === 'lead' ? formLeadId : null
                }).eq('id', editingSession.id);
            } else {
                const toInsert = datesToInsert.map((d, i) => ({
                    class_id: bookingType === 'class' ? formClassId : null,
                    lead_id: bookingType === 'lead' ? formLeadId : null,
                    teacher_id: selectedTeacherId,
                    session_number: bookingType === 'class' ? (classLimitInfo.used + i + 1) : 0,
                    date: d, start_time: startTime, end_time: endTime,
                    focus_type: focusType, status: 'Chưa diễn ra', is_recurring: repeatMode !== 'none'
                }));
                await supabase.from('sessions').insert(toInsert);
            }
            setIsModalOpen(false);
            fetchTeacherCalendar(selectedTeacherId);
            alert("Lưu thành công!");
        } catch (err: any) { alert(err.message); }
        finally { setIsSaving(false); }
    };

    const getSessionStyle = (session: any) => {
        const s = timeToMins(session.start_time);
        const e = timeToMins(session.end_time);
        const top = (s / 60) * 100;
        const height = ((e - s) / 60) * 100;
        return { top: `${top}px`, height: `${height - 2}px` };
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
            {/* TOP BAR */}
            <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-[60] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg"><CalendarIcon size={24} /></div>
                        <span className="text-xl font-black uppercase italic tracking-tighter">Lịch Đào Tạo Pro</span>
                    </div>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setViewDate(new Date())} className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold">Hôm nay</button>
                        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }} className="p-2 hover:bg-white rounded-lg transition-all ml-1"><ChevronLeft size={18}/></button>
                        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
                    </div>
                    <h3 className="text-lg font-black text-slate-700 ml-4">Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}</h3>
                </div>

                {user?.role !== 'teacher' && (
                    <select className="bg-orange-50 border border-orange-100 text-orange-600 font-black text-sm p-2 rounded-xl outline-none cursor-pointer" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                        <option value="">Chọn giảng viên...</option>
                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                )}
            </div>

            {/* CALENDAR BODY */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto custom-scrollbar relative bg-white">
                <div className="min-w-[1100px] relative">
                    <div className="flex sticky top-0 z-50 bg-white border-b">
                        <div className="w-20 shrink-0 border-r bg-white"></div>
                        {weekDays.map((day, i) => {
                            const isToday = toDateString(day) === toDateString(new Date());
                            return (
                                <div key={i} className="flex-1 p-3 text-center border-r last:border-r-0 bg-white">
                                    <p className={`text-[10px] font-black uppercase ${isToday ? 'text-orange-500' : 'text-slate-400'}`}>{DAYS_LABEL[i]}</p>
                                    <div className={`mt-1 inline-flex w-9 h-9 items-center justify-center rounded-full text-lg font-black ${isToday ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-700'}`}>{day.getDate()}</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex relative">
                        <div className="w-20 shrink-0 sticky left-0 z-40 bg-white border-r">
                            {HOURS.map(hour => (
                                <div key={hour} className="h-[100px] text-[11px] font-bold text-slate-400 pr-3 text-right pt-2 border-b border-slate-50 bg-white">{hour}:00</div>
                            ))}
                        </div>

                        <div className="flex flex-1 relative bg-white min-h-[2400px]">
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
                                                    onClick={() => (isFixed && !isPast) ? handleCellClick(day, hour) : null}
                                                    className={`h-[100px] w-full border-b border-slate-50 transition-all relative ${isFixed && !isPast ? 'cursor-pointer hover:bg-orange-100/30' : 'cursor-not-allowed'} ${isFixed ? 'bg-orange-500/[0.04]' : 'bg-slate-50/10'}`}
                                                >
                                                    {isFixed && <div className="absolute inset-0 bg-orange-500/[0.03] pointer-events-none"></div>}
                                                    {isFixed && !isPast && !sessions.some(s => s.date === dayStr && parseInt(s.start_time.split(':')[0]) === hour) && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={18} className="text-orange-300" /></div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {sessions.filter(s => s.date === dayStr).map(session => {
                                            const isPast = isPastDateTime(session.date, session.start_time);
                                            const isTrial = !!session.lead_id;
                                            return (
                                                <div
                                                    key={session.id} style={getSessionStyle(session)}
                                                    className={`absolute left-1 right-1 rounded-xl p-2.5 shadow-lg z-20 border-l-4 flex flex-col justify-between overflow-hidden group transition-all 
                                                        ${isPast ? 'bg-slate-300 border-slate-400 opacity-60 grayscale cursor-not-allowed' : isTrial ? 'bg-emerald-600 border-emerald-300' : 'bg-blue-600 border-blue-300 hover:z-30 cursor-pointer'}
                                                    `}
                                                    onClick={(e) => { e.stopPropagation(); !isPast && handleEditSession(session); }}
                                                >
                                                    {!isPast && (
                                                        <button onClick={async (e) => { e.stopPropagation(); if(window.confirm("Xóa?")) { await supabase.from('sessions').delete().eq('id', session.id); fetchTeacherCalendar(selectedTeacherId); } }} className="absolute top-1 right-1 p-1 bg-white/10 rounded hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} className="text-white"/></button>
                                                    )}
                                                    <div className="overflow-hidden text-white leading-tight">
                                                        <div className="flex items-center gap-1.5 mb-1 text-[9px] font-black uppercase leading-none opacity-80">
                                                            {isTrial ? <FlaskConical size={10}/> : <BookOpen size={10}/>}
                                                            <p className="truncate">{isTrial ? 'DẠY THỬ' : session.classes?.name}</p>
                                                        </div>
                                                        <p className="text-[10px] font-black truncate">{isTrial ? session.leads?.name : ''}</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            {session.focus_type === 'Speaking' ? <Mic size={10}/> : <PencilLine size={10}/>}
                                                            <span className="text-[9px] font-bold">{session.focus_type}</span>
                                                        </div>
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

            {/* MODAL TẠO / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center text-slate-800">
                            <h3 className="font-black uppercase tracking-tighter italic flex items-center gap-2">
                                <Plus className="text-orange-500" size={20}/> {editingSession ? 'Sửa lịch học' : 'Thiết lập buổi dạy'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-5">
                            {!editingSession && (
                                <div className="flex bg-slate-100 p-1 rounded-2xl">
                                    <button type="button" onClick={() => setBookingType('class')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${bookingType === 'class' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Dạy chính thức</button>
                                    <button type="button" onClick={() => setBookingType('lead')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${bookingType === 'lead' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Dạy thử Lead</button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                {['Speaking', 'Writing'].map(type => (
                                    <button key={type} type="button" onClick={() => setFocusType(type)} className={`py-3 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${focusType === type ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-orange-200'}`}>{type}</button>
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{bookingType === 'class' ? 'Chọn lớp học *' : 'Chọn Lead hẹn test *'}</label>
                                <select disabled={!!editingSession} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50" value={bookingType === 'class' ? formClassId : formLeadId} onChange={(e) => bookingType === 'class' ? setFormClassId(e.target.value) : setFormLeadId(e.target.value)}>
                                    <option value="">-- Danh sách --</option>
                                    {bookingType === 'class' ?
                                        teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>) :
                                        leadsToTest.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                                    }
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ngày dạy *</label>
                                    <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Bắt đầu</label>
                                    <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kết thúc</label>
                                    <input type="time" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                                <div className="flex items-center pt-5">
                                    <div className="bg-blue-50 px-3 py-2 rounded-xl flex items-center gap-2 border border-blue-100">
                                        <Clock size={14} className="text-blue-500" />
                                        <p className="text-[9px] font-bold text-blue-700 uppercase leading-none">Min: {focusType === 'Speaking' ? '40p' : '20p'}</p>
                                    </div>
                                </div>
                            </div>

                            {bookingType === 'class' && !editingSession && (
                                <div className="space-y-2 pt-2 border-t">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Chế độ lặp lại</label>
                                    <select className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-600 outline-none" value={repeatMode} onChange={(e) => setRepeatMode(e.target.value)}>
                                        <option value="none">Không lặp lại</option>
                                        <option value="daily">Hàng ngày</option>
                                        <option value="weekly">Hàng tuần</option>
                                        <option value="weekdays">Mọi ngày trong tuần (T2-T6)</option>
                                    </select>
                                    {repeatMode !== 'none' && (
                                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100 mt-2">
                                            <span className="text-[11px] font-black text-orange-700 uppercase">SỐ TUẦN LẶP:</span>
                                            <input type="number" min="1" max="24" className="w-16 p-1 rounded bg-white border border-orange-200 text-center font-black text-orange-600 outline-none" value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <button type="button" disabled={isSaving} onClick={handleSaveSession} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase text-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <><Check size={18}/> {editingSession ? 'CẬP NHẬT' : 'XÁC NHẬN LƯU'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-3 bg-white border-t flex flex-wrap gap-6 text-[10px] font-black uppercase text-slate-400 z-[60]">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"></div> Đã xếp lớp</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-600 rounded"></div> Dạy thử Lead</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500/10 border rounded"></div> Ca rảnh cố định</div>
                <div className="flex items-center gap-2 ml-auto text-slate-300 italic"><Info size={14}/> Nhấn vùng cam để đặt lịch.</div>
            </div>

            <style>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } `}</style>
        </div>
    );
};

export default TeacherCalendar;