import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { gapi } from 'gapi-script';
import {
    ChevronLeft, ChevronRight, Plus, Clock, User,
    Video, Calendar as CalendarIcon, Info, Trash2, CheckCircle2, Loader2, X, Check, BookOpen, Repeat, Mic, PencilLine, Sunrise, Sunset, FlaskConical
} from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_LABEL = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const TeacherCalendar = () => {
    const { user } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const tokenClientRef = useRef<any>(null);


    const [viewDate, setViewDate] = useState(new Date());
    const [profile, setProfile] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTimePos, setCurrentTimePos] = useState(0);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const [allTeachers, setAllTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

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
    const prevStartTimeRef = useRef(startTime);

    const [repeatMode, setRepeatMode] = useState('none');
    const [repeatWeeks, setRepeatWeeks] = useState(1);
    const [classLimitInfo, setClassLimitInfo] = useState({ total: 0, used: 0, remaining: 0 });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => {
            try {
                // @ts-ignore
                tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: 'https://www.googleapis.com/auth/calendar.events',
                    callback: (response: any) => {
                        if (response.access_token) {
                            setAccessToken(response.access_token);
                        }
                    },
                });
            } catch (err) {
                console.error("Lỗi khởi tạo Google Client:", err);
            }
        };
        document.body.appendChild(script);
    }, []);

    const ensureGoogleAuth = async () => {
        if (accessToken) return accessToken;
        try {
            const token = await getGooglePermission();
            if (!token) throw new Error("Không lấy được token");
            return token;
        } catch (err) {
            console.error("Google Auth Error:", err);
            alert("BẠN CHƯA ĐĂNG NHẬP GOOGLE: Vui lòng đăng nhập tài khoản Google để thực hiện thao tác này nhằm đồng bộ lịch.");
            return null;
        }
    };

    const getGooglePermission = () => {
        return new Promise((resolve, reject) => {
            if (!tokenClientRef.current) return reject("Google Client chưa sẵn sàng, vui lòng tải lại trang.");
            tokenClientRef.current.callback = (response: any) => {
                if (response.error) return reject(response);
                setAccessToken(response.access_token);
                resolve(response.access_token);
            };
            tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
        });
    };

    const toDateString = (date: Date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const timeToMins = (t: string, isEnd: boolean = false) => {
        if (!t) return 0;
        const parts = t.split(':');
        const mins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        if (isEnd && mins === 0) return 1440;
        return mins;
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

    useEffect(() => {
        if (isModalOpen) {
            prevStartTimeRef.current = startTime;
        }
    }, [isModalOpen]);

// Tự động cập nhật endTime khi startTime hoặc focusType thay đổi
// Khi thay đổi giờ bắt đầu trên giao diện
    useEffect(() => {
        // Luôn cho chạy, kể cả khi đang editingSession
        if (!isModalOpen || !startTime || !endTime) return;

        if (startTime !== prevStartTimeRef.current) {
            const sMins = timeToMins(startTime);
            const minReq = focusType === 'Speaking' ? 40 : 20;

            // Ép giờ kết thúc = giờ bắt đầu + mức tối thiểu của loại hình đang chọn
            const newEMins = sMins + minReq;
            const newH = Math.floor(newEMins / 60) % 24;
            const newM = newEMins % 60;

            setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
            prevStartTimeRef.current = startTime;
        }
    }, [startTime, isModalOpen, focusType]);

    useEffect(() => {
        // Xóa bỏ chặn editingSession để khi sửa vẫn nhảy giờ theo Min
        if (!isModalOpen || !startTime) return;

        const sMins = timeToMins(startTime);
        const minReq = focusType === 'Speaking' ? 40 : 20;

        // Luôn ép giờ kết thúc về mức tối thiểu mới ngay khi bấm nút
        const total = sMins + minReq;
        const newH = Math.floor(total / 60) % 24;
        const newM = total % 60;

        setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    }, [focusType, isModalOpen]);

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

    useEffect(() => {
        const fetchInitial = async () => {
            const { data: me } = await supabase.from('staffs').select('*').eq(user?.role === 'teacher' ? 'email' : 'id', user?.role === 'teacher' ? user?.email : '').single();
            if (user?.role === 'teacher') {
                const { data: teacherProfile } = await supabase.from('staffs').select('*').eq('email', user?.email).single();
                setProfile(teacherProfile);
                setSelectedTeacherId(teacherProfile?.id || '');
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
            if (results.length > 100) break;
        }
        return results;
    };

    const handleCellClick = (date: Date, hour: number) => {
        const dateStr = toDateString(date);
        const daySlots = profile?.fixed_schedule?.[DAYS_LABEL[date.getDay()]];
        const isClickable = Array.isArray(daySlots) && daySlots.some((slot: any) => {
            const s = timeToMins(slot.start);
            const e = timeToMins(slot.end, true);
            const c = hour * 60;
            return c >= s && c < e;
        });
        const start = `${String(hour).padStart(2, '0')}:00`;
        const minDuration = focusType === 'Speaking' ? 40 : 20;

        // Tính giờ kết thúc mặc định
        const total = hour * 60 + minDuration;
        const end = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
        if (!isClickable) return;
        if (isPastDateTime(dateStr, `${String(hour).padStart(2, '0')}:00`)) return alert("Không thể thêm vào quá khứ!");
        setEditingSession(null);
        setBookingType('class');
        setSelectedDate(toDateString(date));
        setStartTime(start);
        setEndTime(end);

        // QUAN TRỌNG: Cập nhật Ref ngay tại đây
        prevStartTimeRef.current = start;

        setFormClassId('');
        setFormLeadId('');
        setRepeatMode('none');
        setIsModalOpen(true);
    };

    const handleEditSession = (session: any) => {
        if (isPastDateTime(session.date, session.start_time)) return alert("Buổi học đã diễn ra!");
        const start = session.start_time.slice(0, 5);
        setEditingSession(session);
        setBookingType(session.lead_id ? 'lead' : 'class');
        setFormClassId(session.class_id || '');
        setFormLeadId(session.lead_id || '');
        setSelectedDate(session.date);
        setStartTime(session.start_time.slice(0, 5));
        setEndTime(session.end_time.slice(0, 5));
        setFocusType(session.focus_type || 'Writing');
        prevStartTimeRef.current = start;
        setIsModalOpen(true);
    };

    // --- MỚI: ĐỒNG BỘ XÓA ---
    const handleDeleteSession = async (id: string) => {
        const sessionToDelete = sessions.find(s => s.id === id);
        if (!sessionToDelete) return;

        // 1. Kiểm tra đăng nhập Google trước
        const token = await ensureGoogleAuth();
        if (!token) return; // Dừng lại nếu chưa đăng nhập

        if (!window.confirm("XÓA LỊCH: Hệ thống sẽ gỡ lịch trên cả Google Calendar và dữ liệu nội bộ. Bạn chắc chắn chứ?")) return;

        setIsSaving(true);
        try {
            // 2. Xóa trên Google Calendar nếu có ID
            if (sessionToDelete.google_event_id) {
                const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${sessionToDelete.google_event_id}?sendUpdates=all`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Nếu lỗi 401 (hết hạn token) thì yêu cầu login lại, nếu 404 (đã xóa trên gg) thì cho qua để xóa DB
                if (res.status === 401) {
                    setAccessToken(null);
                    alert("Phiên đăng nhập Google hết hạn, vui lòng nhấn Xóa lại để đăng nhập.");
                    return;
                }
            }

            // 3. Chỉ khi bước trên không lỗi (hoặc không có ID) mới xóa trong Database
            const { error: dbError } = await supabase.from('sessions').delete().eq('id', id);
            if (dbError) throw dbError;

            setIsModalOpen(false);
            fetchTeacherCalendar(selectedTeacherId);
            alert("Đã xóa thành công trên cả 2 hệ thống.");
        } catch (err: any) {
            console.error(err);
            alert("Lỗi khi thực hiện xóa: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- MỚI: ĐỒNG BỘ THÊM/SỬA ---
    const handleSaveSession = async () => {
        const targetId = bookingType === 'class' ? formClassId : formLeadId;
        if (!targetId) return alert("Vui lòng chọn đối tượng (Lớp học hoặc Lead)!");

        // 1. Chuyển đổi thời gian sang phút để tính toán
        const sMins = timeToMins(startTime);
        const eMins = timeToMins(endTime, true);
        const minReq = focusType === 'Speaking' ? 40 : 20;

        // Kiểm tra thời lượng tối thiểu
        if (eMins - sMins < minReq) {
            return alert(`Lỗi: Thời gian tối thiểu cho ${focusType} là ${minReq} phút!`);
        }

        // Lấy danh sách các ngày cần xử lý (nếu lặp lại sẽ có nhiều ngày)
        const datesToInsert = getRecurringDates(selectedDate, repeatMode, repeatWeeks);

        // --- BƯỚC 1: KIỂM TRA CÓ NẰM TRONG VÙNG LỊCH CỐ ĐỊNH (ORANGE ZONE) KHÔNG? ---
        for (const dStr of datesToInsert) {
            const dayObj = new Date(dStr);
            const dayLabel = DAYS_LABEL[dayObj.getDay()];
            const fixedSlots = profile?.fixed_schedule?.[dayLabel] || [];

            const isWithinFixed = Array.isArray(fixedSlots) && fixedSlots.some(slot => {
                const slotS = timeToMins(slot.start);
                const slotE = timeToMins(slot.end, true);
                return sMins >= slotS && eMins <= slotE; // Thời gian chọn phải nằm trọn trong slot rảnh
            });

            if (!isWithinFixed) {
                return alert(`Lỗi: Thời gian ${startTime}-${endTime} ngày ${dStr} (${dayLabel}) nằm ngoài khung giờ rảnh cố định của giảng viên!`);
            }
        }

        // --- BƯỚC 2: KIỂM TRA TRÙNG LỊCH (OVERLAP) VỚI CÁC BUỔI ĐÃ CÓ ---
        setIsSaving(true);
        try {
            // Lấy tất cả session của GV trong những ngày định đăng ký
            const { data: existingSessions, error: fetchErr } = await supabase
                .from('sessions')
                .select('id, date, start_time, end_time')
                .eq('teacher_id', selectedTeacherId)
                .in('date', datesToInsert);

            if (fetchErr) throw fetchErr;

            for (const dStr of datesToInsert) {
                const overlap = existingSessions?.find(ex => {
                    // Nếu là đang EDIT, bỏ qua việc kiểm tra trùng với chính nó
                    if (editingSession && ex.id === editingSession.id) return false;

                    if (ex.date !== dStr) return false;

                    const exS = timeToMins(ex.start_time);
                    const exE = timeToMins(ex.end_time, true);

                    // Thuật toán kiểm tra trùng: (Start1 < End2) AND (End1 > Start2)
                    return sMins < exE && eMins > exS;
                });

                if (overlap) {
                    setIsSaving(false);
                    return alert(`Lỗi: Trùng lịch! Khung giờ ${startTime}-${endTime} ngày ${dStr} đã có một buổi dạy khác (${overlap.start_time.slice(0,5)} - ${overlap.end_time.slice(0,5)}).`);
                }
            }

            // --- BƯỚC 3: KIỂM TRA GOOGLE AUTH ---
            const token = await ensureGoogleAuth();
            if (!token) {
                setIsSaving(false);
                return;
            }

            // Chuẩn bị thông tin người tham gia
            let teacherEmail = profile.email;
            let studentEmail = "";
            let participantName = "";

            if (bookingType === 'class') {
                const { data: classInfo } = await supabase.from('classes').select('contracts(students(email, full_name))').eq('id', formClassId).single();
                studentEmail = classInfo?.contracts?.[0]?.students?.email || "";
                participantName = classInfo?.contracts?.[0]?.students?.full_name || "Học viên";
            } else {
                const { data: leadInfo } = await supabase.from('leads').select('email, name').eq('id', formLeadId).single();
                studentEmail = leadInfo?.email || "";
                participantName = leadInfo?.name || "Lead";
            }

            // --- BƯỚC 4: ĐỒNG BỘ GOOGLE CALENDAR ---
            const googleResults = await Promise.all(datesToInsert.map(async (d) => {
                const gEvent = {
                    summary: `[TALEMY] ${bookingType === 'class' ? 'Lớp học' : 'Dạy thử'} - ${participantName}`,
                    description: `Buổi học: ${focusType}. Giảng viên: ${profile.name}`,
                    start: { dateTime: `${d}T${startTime}:00+07:00`, timeZone: 'Asia/Ho_Chi_Minh' },
                    end: { dateTime: `${d}T${endTime}:00+07:00`, timeZone: 'Asia/Ho_Chi_Minh' },
                    attendees: [
                        { email: teacherEmail, responseStatus: 'accepted' },
                        { email: studentEmail }
                    ].filter(a => a.email),
                    conferenceData: {
                        createRequest: { requestId: `meet-${Date.now()}-${Math.random()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
                    }
                };

                const isEdit = !!editingSession?.google_event_id;
                const url = isEdit
                    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${editingSession.google_event_id}?conferenceDataVersion=1&sendUpdates=all`
                    : `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;

                const res = await fetch(url, {
                    method: isEdit ? 'PATCH' : 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(gEvent)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error?.message || "Lỗi Google API");
                }
                return await res.json();
            }));

            // --- BƯỚC 5: LƯU VÀO DATABASE ---
            if (editingSession) {
                const { error: upError } = await supabase.from('sessions').update({
                    date: selectedDate,
                    start_time: startTime,
                    end_time: endTime,
                    focus_type: focusType,
                    meet_link: googleResults[0]?.hangoutLink || editingSession.meet_link,
                    google_event_id: googleResults[0]?.id || editingSession.google_event_id
                }).eq('id', editingSession.id);
                if (upError) throw upError;
            } else {
                const toInsert = datesToInsert.map((d, i) => ({
                    class_id: bookingType === 'class' ? formClassId : null,
                    lead_id: bookingType === 'lead' ? formLeadId : null,
                    teacher_id: selectedTeacherId,
                    session_number: bookingType === 'class' ? (classLimitInfo.used + i + 1) : 0,
                    date: d,
                    start_time: startTime,
                    end_time: endTime,
                    focus_type: focusType,
                    status: 'Chưa diễn ra',
                    meet_link: googleResults[i]?.hangoutLink || "",
                    google_event_id: googleResults[i]?.id
                }));
                const { error: inError } = await supabase.from('sessions').insert(toInsert);
                if (inError) throw inError;
            }

            setIsModalOpen(false);
            fetchTeacherCalendar(selectedTeacherId);
            alert("Thành công: Lịch đã được kiểm tra tính hợp lệ và đồng bộ hóa!");

        } catch (err: any) {
            console.error(err);
            alert("LỖI: " + (err.message || "Không thể lưu lịch."));
        } finally {
            setIsSaving(false);
        }
    };

    const getBoxStyle = (start: string, end: string) => {
        const s = timeToMins(start);
        const e = timeToMins(end, true);
        const top = (s / 60) * 100;
        const height = ((e - s) / 60) * 100;
        return { top: `${top}px`, height: `${height}px` };
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden text-[13px]">
            {/* TOP BAR */}
            <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-[60] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-200"><CalendarIcon size={24} /></div>
                        <span className="text-xl font-black uppercase italic tracking-tighter">Lịch Đào Tạo Pro</span>
                    </div>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setViewDate(new Date())} className="px-4 py-1.5 bg-white shadow-sm rounded-lg text-xs font-bold transition-all hover:text-orange-500">Hôm nay</button>
                        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }} className="p-2 hover:bg-white rounded-lg transition-all ml-1"><ChevronLeft size={18}/></button>
                        <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
                    </div>
                    <h3 className="text-lg font-black text-slate-700 ml-4">Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}</h3>
                </div>

                <div className="flex items-center gap-3">
                    {user?.role !== 'teacher' && (
                        <select className="bg-orange-50 border border-orange-100 text-orange-600 font-black text-sm p-2 rounded-xl outline-none cursor-pointer shadow-sm" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
                            <option value="">Chọn giảng viên...</option>
                            {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* BODY */}
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
                        <div className="w-20 shrink-0 sticky left-0 z-40 bg-white border-r shadow-sm">
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
                                const fixedSlots = profile?.fixed_schedule?.[DAYS_LABEL[dayIdx]] || [];

                                return (
                                    <div key={dayIdx} className="flex-1 border-r border-slate-100 relative group">
                                        {Array.isArray(fixedSlots) && fixedSlots.map((slot: any, idx: number) => (
                                            <div key={idx} style={getBoxStyle(slot.start, slot.end)} className="absolute left-0 right-0 bg-orange-500/[0.08] border-x border-orange-500/10 pointer-events-none z-0"></div>
                                        ))}

                                        {HOURS.map(hour => {
                                            const daySlots = profile?.fixed_schedule?.[DAYS_LABEL[dayIdx]];
                                            const isClickable = Array.isArray(daySlots) && daySlots.some((slot: any) => {
                                                const s = timeToMins(slot.start);
                                                const e = timeToMins(slot.end, true);
                                                const c = hour * 60;
                                                return c >= s && c < e;
                                            });
                                            const isPast = isPastDateTime(dayStr, `${String(hour).padStart(2, '0')}:00`);

                                            return (
                                                <div
                                                    key={hour}
                                                    onClick={() => (isClickable && !isPast) ? handleCellClick(day, hour) : null}
                                                    className={`h-[100px] w-full border-b border-slate-50 transition-all relative z-10
                                                        ${isClickable && !isPast ? 'cursor-pointer hover:bg-orange-500/5' : 'cursor-not-allowed'}
                                                    `}
                                                >
                                                    {isClickable && !isPast && !sessions.some(s => s.date === dayStr && parseInt(s.start_time.split(':')[0]) === hour) && (
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
                                                    key={session.id} style={getBoxStyle(session.start_time, session.end_time)}
                                                    className={`absolute left-1 right-1 rounded-xl p-2.5 shadow-lg z-20 border-l-4 flex flex-col justify-between overflow-hidden group transition-all 
                                                        ${isPast ? 'bg-slate-300 border-slate-400 opacity-60 grayscale cursor-not-allowed' : isTrial ? 'bg-emerald-600 border-emerald-300' : 'bg-blue-600 border-blue-300 hover:z-30 cursor-pointer'}
                                                    `}
                                                    onClick={(e) => { e.stopPropagation(); !isPast && handleEditSession(session); }}
                                                >
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

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center text-slate-800">
                            <h3 className="font-black uppercase tracking-tighter italic flex items-center gap-2">
                                <Plus className="text-orange-500" size={20}/> {editingSession ? 'Cập nhật lịch' : 'Thiết lập buổi dạy'}
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
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{bookingType === 'class' ? 'Chọn lớp học *' : 'Chọn Lead hẹn test *'}</label>
                                    {bookingType === 'class' && formClassId && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${classLimitInfo.remaining > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>Còn {classLimitInfo.remaining}/{classLimitInfo.total} buổi</span>}
                                </div>
                                <select disabled={!!editingSession} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50" value={bookingType === 'class' ? formClassId : formLeadId} onChange={(e) => bookingType === 'class' ? setFormClassId(e.target.value) : setFormLeadId(e.target.value)}>
                                    <option value="">-- Danh sách --</option>
                                    {bookingType === 'class' ? teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : leadsToTest.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
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
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        onBlur={(e) => {
                                            const sMins = timeToMins(startTime);
                                            const eMins = timeToMins(e.target.value, true);
                                            const minReq = focusType === 'Speaking' ? 40 : 20;

                                            // Nếu người dùng tự chỉnh giờ kết thúc quá ngắn so với quy định
                                            if (eMins < sMins + minReq) {
                                                const total = sMins + minReq;
                                                const newH = Math.floor(total / 60) % 24;
                                                const newM = total % 60;
                                                setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="bg-blue-50 px-3 py-2 rounded-xl flex items-center gap-2 border border-blue-100 self-end mb-1"><Clock size={14} className="text-blue-500" /><p className="text-[9px] font-bold text-blue-700 uppercase">Min: {focusType === 'Speaking' ? '40p' : '20p'}</p></div>
                            </div>

                            {!editingSession && bookingType === 'class' && (
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

                            <div className="flex gap-2 pt-2">
                                {editingSession && (
                                    <button type="button" onClick={() => handleDeleteSession(editingSession.id)} className="flex-1 py-4 bg-red-50 text-red-600 font-black rounded-2xl hover:bg-red-500 hover:text-white transition-all uppercase text-xs flex items-center justify-center gap-2 shadow-sm border border-red-100">
                                        <Trash2 size={16}/> Xóa
                                    </button>
                                )}
                                <button type="button" disabled={isSaving || (bookingType === 'class' && !formClassId) || (bookingType === 'lead' && !formLeadId) || (bookingType === 'class' && classLimitInfo.remaining <= 0)} onClick={handleSaveSession} className={`${editingSession ? 'flex-[2]' : 'w-full'} py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase text-xs flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-blue-200`}>
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <><Check size={18}/> {editingSession ? 'CẬP NHẬT' : 'XÁC NHẬN LƯU'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-3 bg-white border-t flex flex-wrap gap-6 text-[10px] font-black uppercase text-slate-400 z-[60]">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"></div> Đã xếp lớp</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-600 rounded"></div> Dạy thử Lead</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500/10 border rounded"></div> Vùng rảnh cam</div>
            </div>
            <style>{` .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } `}</style>
        </div>
    );
};

export default TeacherCalendar;