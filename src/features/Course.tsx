import React, { useState, useEffect } from 'react';
import {
    BookOpen, Users, Plus, MoreHorizontal,
    GraduationCap, Search, X, DollarSign, Clock, Layers, ChevronRight, User, Video
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import ClassManagement from './ClassManagement';

const Course = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<any[]>([]); // Dành cho Admin
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]); // Dành cho Teacher
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState<{id: string, name: string} | null>(null);

    const [newCourse, setNewCourse] = useState({
        name: '', description: '', level: 'Beginner', price: 0, duration: 0, status: 'active'
    });

    useEffect(() => {
        if (!user) return;

        if (user.role === 'admin') {
            const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        } else {
            // Teacher: Lọc những lớp có teacherName khớp (Lưu ý: Bạn có thể đổi sang lọc theo Email nếu muốn chính xác hơn)
            const q = query(collection(db, "classes"), where("teacherName", "==", "Nguyễn Nhật Huy"));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                setTeacherClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "courses"), {
                ...newCourse,
                price: Number(newCourse.price),
                duration: Number(newCourse.duration),
                createdAt: serverTimestamp()
            });
            setShowModal(false);
            setNewCourse({ name: '', description: '', level: 'Beginner', price: 0, duration: 0, status: 'active' });
        } catch (error) { alert("Lỗi tạo khóa học!"); }
    };

    if (selectedCourse) {
        return (
            <ClassManagement
                courseId={selectedCourse.id}
                courseTitle={selectedCourse.name}
                // Quan trọng: Báo cho ClassManagement biết nếu là teacher thì vào thẳng session view
                isDirectClass={user?.role === 'teacher'}
                onBack={() => setSelectedCourse(null)}
            />
        );
    }

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                        {user?.role === 'admin' ? 'Quản lý Khóa học (LMS)' : 'Lớp học của tôi'}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium italic mt-1">
                        {user?.role === 'admin'
                            ? 'Điều phối giảng viên và danh mục đào tạo.'
                            : `Xin chào ${user?.name}, bạn đang phụ trách ${teacherClasses.length} lớp học.`}
                    </p>
                </div>

                {user?.role === 'admin' && (
                    <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95">
                        <Plus size={20} /> Tạo Khóa Học Mới
                    </button>
                )}
            </div>

            {/* Filter Bar Admin */}
            {user?.role === 'admin' && (
                <div className="flex gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Tìm tên khóa học..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-orange-500/20 outline-none font-bold" onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* VIEW ADMIN */}
                {user?.role === 'admin' && courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((course) => (
                    <div key={course.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><BookOpen size={28} /></div>
                            <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal size={20} /></button>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">{course.name}</h3>
                        <p className="text-slate-500 text-sm mb-4 line-clamp-2 italic">{course.description}</p>
                        <div className="grid grid-cols-2 gap-y-3 mb-6 border-b border-slate-50 pb-6">
                            <InfoBadge icon={<Layers size={14}/>} label="Cấp độ" value={course.level} />
                            <InfoBadge icon={<Clock size={14}/>} label="Thời lượng" value={`${course.duration} buổi`} />
                            <InfoBadge icon={<DollarSign size={14}/>} label="Học phí" value={`${course.price?.toLocaleString()}đ`} />
                            <InfoBadge icon={<Users size={14}/>} label="Trạng thái" value={course.status} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">{course.status}</span>
                            <button onClick={() => setSelectedCourse({ id: course.id, name: course.name })} className="text-orange-600 font-black text-sm flex items-center gap-1 hover:gap-2 transition-all">Quản lý lớp →</button>
                        </div>
                    </div>
                ))}

                {/* VIEW TEACHER (GIỐNG STYLE ADMIN) */}
                {user?.role === 'teacher' && teacherClasses.map((cls) => (
                    <div key={cls.id} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 -mr-8 -mt-8 rounded-full"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><GraduationCap size={28} /></div>
                            <div className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-orange-100">Lớp học 1-1</div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight italic">{cls.className}</h3>
                        <p className="text-slate-400 text-xs font-bold mb-6 flex items-center gap-1"><Clock size={12}/> Ngày khai giảng: {cls.startDate}</p>
                        <div className="grid grid-cols-2 gap-y-4 mb-8 border-y border-slate-50 py-6">
                            <InfoBadge icon={<User size={14}/>} label="Học viên" value={cls.studentName} />
                            <InfoBadge icon={<Clock size={14}/>} label="Tổng buổi" value={`${cls.totalSessions} buổi`} />
                            <InfoBadge icon={<Video size={14}/>} label="Phòng học" value="Zoom Online" />
                            <InfoBadge icon={<Layers size={14}/>} label="Tiến độ" value={cls.status} />
                        </div>
                        <button
                            onClick={() => setSelectedCourse({ id: cls.id, name: cls.className })}
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-lg active:scale-95"
                        >
                            Vào điểm danh & Xem lộ trình <ChevronRight size={18}/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InfoBadge = ({ icon, label, value }: { icon: any, label: string, value: any }) => (
    <div className="flex items-center gap-3">
        <div className="text-orange-500 bg-orange-50 p-2 rounded-xl shrink-0 border border-orange-100/50">{icon}</div>
        <div className="overflow-hidden">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-tighter leading-none mb-1">{label}</p>
            <p className="text-slate-700 text-xs font-black truncate leading-none">{value}</p>
        </div>
    </div>
);

export default Course;