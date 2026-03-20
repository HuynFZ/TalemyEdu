import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import {
    doc, getDoc, collection, query, where, onSnapshot,
    addDoc, deleteDoc, serverTimestamp, orderBy, getDocs
} from 'firebase/firestore';
import {
    Clock, Calendar, CheckCircle2, AlertCircle, Trash2,
    Plus, CalendarDays, AlertTriangle, ExternalLink, Loader2, ChevronDown
} from 'lucide-react';

import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

console.log("DEBUG - Client ID hiện tại:", CLIENT_ID);

const DAYS_MAP: { [key: string]: number } = {
    'Chủ Nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6
};

// ĐỊNH NGHĨA KHUNG GIỜ
const TIME_SLOTS = [
    { start: '07:00', end: '09:00' },
    { start: '09:30', end: '11:30' },
    { start: '14:00', end: '16:00' },
    { start: '16:30', end: '18:30' },
    { start: '19:00', end: '21:00' },
];

const PublicBooking = () => {
    const { classId } = useParams();
    const [classData, setClassData] = useState<any>(null);
    const [teacherData, setTeacherData] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]); // Sessions của lớp này
    const [allTeacherSessions, setAllTeacherSessions] = useState<any[]>([]); // Tất cả sessions của GV này để check trùng
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedDate, setExpandedDate] = useState<string | null>(null); // Để mở rộng chọn giờ

    useEffect(() => {
        const gsiScript = document.createElement('script');
        gsiScript.src = "https://accounts.google.com/gsi/client";
        gsiScript.async = true; gsiScript.defer = true;
        document.body.appendChild(gsiScript);

        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
            });
        });
    }, []);

    useEffect(() => {
        if (!classId) return;
        const fetchData = async () => {
            const cSnap = await getDoc(doc(db, "classes", classId));
            if (cSnap.exists()) {
                const cData = cSnap.data();
                setClassData({ id: cSnap.id, ...cData });
                const tSnap = await getDoc(doc(db, "staffs", cData.teacherId));
                if (tSnap.exists()) setTeacherData(tSnap.data());

                // LẤY TẤT CẢ BUỔI DẠY CỦA GIẢNG VIÊN NÀY (Để check trùng lịch)
                const qAll = query(collection(db, "sessions"), where("teacherId", "==", cData.teacherId));
                onSnapshot(qAll, (snap) => {
                    setAllTeacherSessions(snap.docs.map(d => d.data()));
                });
            }
        };
        fetchData();

        const q = query(collection(db, "sessions"), where("classId", "==", classId), orderBy("date", "asc"));
        const unsub = onSnapshot(q, (snap) => {
            setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [classId]);

    const getGoogleToken = () => {
        return new Promise<string>((resolve, reject) => {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (res: any) => res.error ? reject(res) : (setAccessToken(res.access_token), resolve(res.access_token)),
            });
            client.requestAccessToken();
        });
    };

    const handleBook = async (date: string, slot: any) => {
        if (sessions.length >= (classData?.totalSessions || 45)) return alert("Đã đủ số buổi!");

        setIsProcessing(true);
        try {
            const token = accessToken || await getGoogleToken();
            gapi.client.setToken({ access_token: token });

            const startDateTime = `${date}T${slot.start}:00+07:00`;
            const endDateTime = `${date}T${slot.end}:00+07:00`;

            const event = {
                'summary': `[TALEMY] ${classData.className} - ${classData.studentName}`,
                'description': `Học Zoom: ${classData.zoomLink}`,
                'start': { 'dateTime': startDateTime, 'timeZone': 'Asia/Ho_Chi_Minh' },
                'end': { 'dateTime': endDateTime, 'timeZone': 'Asia/Ho_Chi_Minh' },
                'attendees': [{ 'email': teacherData.email }],
                'reminders': { 'useDefault': false, 'overrides': [{ 'method': 'popup', 'minutes': 30 }] }
            };

            const res = await gapi.client.calendar.events.insert({ 'calendarId': 'primary', 'resource': event, 'sendUpdates': 'all' });

            // LƯU VÀO FIREBASE KÈM teacherId VÀ startTime ĐỂ CHECK TRÙNG
            await addDoc(collection(db, "sessions"), {
                classId,
                teacherId: classData.teacherId, // Quan trọng để check trùng
                date,
                startTime: slot.start,
                endTime: slot.end,
                status: 'Chưa diễn ra',
                createdAt: serverTimestamp(),
                googleEventId: res.result.id,
                googleEventLink: res.result.htmlLink
            });

            alert('✅ Đặt lịch thành công!');
        } catch (e) { console.error(e); }
        finally { setIsProcessing(false); }
    };

    const handleCancel = async (session: any) => {
        const diff = (new Date(session.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
        if (diff < 2) return alert("⚠️ Chỉ được hủy trước 48 tiếng.");

        if (window.confirm("Hủy buổi học này?")) {
            setIsProcessing(true);
            try {
                const token = accessToken || await getGoogleToken();
                gapi.client.setToken({ access_token: token });
                if (session.googleEventId) {
                    await gapi.client.calendar.events.delete({ 'calendarId': 'primary', 'eventId': session.googleEventId, 'sendUpdates': 'all' });
                }
                await deleteDoc(doc(db, "sessions", session.id));
            } catch (e) { console.error(e); }
            finally { setIsProcessing(false); }
        }
    };

    const generateAvailableDates = () => {
        if (!teacherData?.fixedSchedule) return [];
        const dates = [];
        const today = new Date();
        const teacherDays = teacherData.fixedSchedule.map((d: string) => DAYS_MAP[d.trim()]);
        for (let i = 1; i <= 14; i++) {
            const d = new Date(); d.setDate(today.getDate() + i);
            if (teacherDays.includes(d.getDay())) dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    };

    // KIỂM TRA XEM KHUNG GIỜ ĐÓ ĐÃ CÓ AI ĐẶT CHƯA (DÙ LÀ LỚP KHÁC)
    const isSlotTaken = (date: string, startTime: string) => {
        return allTeacherSessions.some(s => s.date === date && s.startTime === startTime);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">ĐANG KẾT NỐI...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
            {isProcessing && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="bg-white p-6 rounded-3xl shadow-xl flex items-center gap-4">
                        <Loader2 className="animate-spin text-orange-500" />
                        <span className="font-black text-slate-700 uppercase text-[10px]">Đang đồng bộ lịch Google...</span>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    {/* Tiến độ */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                        <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg"><Calendar size={32} /></div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase italic">Lịch học của tôi</h1>
                        <p className="text-slate-400 text-sm font-bold uppercase italic">Lớp: {classData?.className}</p>
                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between text-[10px] font-black"><span className="text-slate-400 uppercase">TIẾN ĐỘ KHÓA HỌC:</span><span className="text-emerald-600">{sessions.filter(s => s.status !== 'Chưa diễn ra').length}/{classData?.totalSessions} BUỔI</span></div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(sessions.filter(s => s.status !== 'Chưa diễn ra').length / (classData?.totalSessions || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Lịch sắp tới */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                        <h3 className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={18} /> Lịch sắp diễn ra</h3>
                        <div className="space-y-4">
                            {sessions.filter(s => s.status === 'Chưa diễn ra').map((s) => (
                                <div key={s.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-slate-700 uppercase text-xs">{new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</p>
                                        <p className="text-[10px] font-bold text-orange-500 mt-1 italic">Khung giờ: {s.startTime} - {s.endTime}</p>
                                    </div>
                                    <button onClick={() => handleCancel(s)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                        <CalendarDays className="absolute -right-4 -bottom-4 text-white/5" size={160} />
                        <h3 className="text-xl font-black uppercase italic text-orange-500 mb-2">Đăng ký buổi học</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">Chọn ngày và khung giờ rảnh của GV {classData?.teacherName}. Hệ thống tự động chặn các giờ đã có người đặt.</p>
                    </div>

                    {/* CHỌN NGÀY VÀ GIỜ */}
                    <div className="space-y-3">
                        {generateAvailableDates().map((date) => (
                            <div key={date} className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                    className={`w-full p-6 flex items-center justify-between transition-all ${expandedDate === date ? 'bg-orange-50 text-orange-600' : 'hover:bg-slate-50'}`}
                                >
                                    <span className="font-black uppercase text-sm tracking-tight">{new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</span>
                                    <ChevronDown className={`transition-transform ${expandedDate === date ? 'rotate-180' : ''}`} size={20} />
                                </button>

                                {expandedDate === date && (
                                    <div className="p-4 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-300">
                                        {TIME_SLOTS.map((slot) => {
                                            const taken = isSlotTaken(date, slot.start);
                                            return (
                                                <button
                                                    key={slot.start}
                                                    disabled={taken}
                                                    onClick={() => handleBook(date, slot)}
                                                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                                        taken
                                                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                            : 'border-emerald-100 bg-emerald-50/30 text-emerald-700 hover:bg-emerald-500 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Clock size={16} />
                                                        <span className="text-xs font-black uppercase">{slot.start} – {slot.end}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                                        {taken ? 'ĐÃ CÓ NGƯỜI ĐẶT' : 'CÒN TRỐNG - ĐẶT NGAY'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicBooking;