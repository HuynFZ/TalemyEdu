import React, { useState, useEffect } from 'react';
import {
    BookOpen, Users, Plus, MoreHorizontal,
    GraduationCap, Search, X, DollarSign, Clock, Layers, ChevronRight, User, Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ClassManagement from './ClassManagement';

// IMPORT SUPABASE & SERVICES
import { supabase } from '../supabaseClient';
import { subscribeToCourses, createCourse, CourseData } from '../services/courseService';

const Course = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState<{id: string, name: string} | null>(null);
    const [loading, setLoading] = useState(true);

    // Form tạo khóa học
    const [newCourse, setNewCourse] = useState({
        name: '',
        description: '',
        level: 'Intermediate' as 'Beginner' | 'Intermediate' | 'Advanced',
        price: 0,
        duration: 0,
        status: 'active' as 'active' | 'inactive' | 'upcoming'
    });

    useEffect(() => {
        // Nếu chưa có user thì dừng
        if (!user) {
            setLoading(false);
            return;
        }

        let unsubscribeCourses: any;
        let classChannel: any;

        if (user.role === 'admin') {
            // ADMIN: Lấy danh sách khóa học
            unsubscribeCourses = subscribeToCourses((data) => {
                setCourses(data || []);
                setLoading(false);
            });
        } else if (user.role === 'teacher') {
            // GIẢNG VIÊN: Lấy danh sách lớp học
            const fetchTeacherClasses = async () => {
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('staffs')
                        .select('id, name')
                        .eq('email', user.email)
                        .single();

                    if (profileError || !profile) {
                        console.error("Không tìm thấy hồ sơ giảng viên");
                        setLoading(false);
                        return;
                    }

                    const loadClasses = async () => {
                        const { data: classesData, error } = await supabase
                            .from('classes')
                            .select(`
                                id, name, start_date, status,
                                course:courses (duration)
                            `)
                            .eq('teacher_id', profile.id);

                        if (!error && classesData) {
                            const mappedClasses = classesData.map(cls => ({
                                id: cls.id,
                                className: cls.name || 'Lớp chưa có tên',
                                startDate: cls.start_date || 'Chưa cập nhật',
                                studentName: 'Xem chi tiết bên trong', 
                                totalSessions: cls.course?.duration || 0,
                                status: cls.status || 'Đang mở'
                            }));
                            setTeacherClasses(mappedClasses);
                        }
                        setLoading(false);
                    };

                    loadClasses();

                    classChannel = supabase
                        .channel('teacher_classes_channel')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'classes', filter: `teacher_id=eq.${profile.id}` }, () => {
                            loadClasses();
                        })
                        .subscribe();

                } catch (error) {
                    console.error("Lỗi khi tải dữ liệu lớp học:", error);
                    setLoading(false);
                }
            };
            fetchTeacherClasses();
        } else {
            // NẾU LÀ SALE HOẶC NHÂN VIÊN KHÁC: Vẫn phải tắt loading để tránh lỗi trắng trang
            setLoading(false);
        }

        return () => {
            if (typeof unsubscribeCourses === 'function') unsubscribeCourses();
            if (classChannel) supabase.removeChannel(classChannel);
        };
    }, [user]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createCourse({
                ...newCourse,
                price: Number(newCourse.price) || 0,
                duration: Number(newCourse.duration) || 0,
            });
            setShowModal(false);
            setNewCourse({ name: '', description: '', level: 'Intermediate', price: 0, duration: 0, status: 'active' });
            alert("Tạo khóa học thành công!");
        } catch (error) { 
            console.error("Lỗi tạo khóa học:", error);
            alert("Lỗi tạo khóa học!"); 
        }
    };

    if (loading) {
        return <div className="p-8 text-center font-bold text-slate-500">Đang tải dữ liệu...</div>;
    }

    if (selectedCourse) {
        return (
            <ClassManagement
                courseId={selectedCourse.id}
                courseTitle={selectedCourse.name}
                isDirectClass={user?.role === 'teacher'}
                onBack={() => setSelectedCourse(null)}
            />
        );
    }

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen relative font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý khóa học (LMS)</h2>
                    <p className="text-slate-500 text-sm font-medium italic">Điều phối giảng viên và danh mục đào tạo.</p>
                </div>
                {user?.role === 'admin' && (
                    <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center gap-2">
                        <Plus size={20} /> TẠO KHÓA HỌC MỚI
                    </button>
                )}
            </div>

            {user?.role === 'admin' && (
                <div className="flex gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Tìm tên khóa học..." className="w-full pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-orange-500/20 outline-none font-bold text-slate-700" onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {user?.role === 'admin' ? (
                    // FIX LỖI TẠI ĐÂY: Dùng (c.name || '') để chống lỗi văng app khi course.name bị rỗng
                    courses.filter(c => (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).map((course) => (
                        <div key={course.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100"><BookOpen size={28} /></div>
                                <button className="text-slate-300 hover:text-slate-500"><MoreHorizontal size={20} /></button>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{course.name || 'Khóa học chưa có tên'}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2 italic">{course.description || 'Chưa có mô tả'}</p>
                            <div className="grid grid-cols-2 gap-y-3 mb-6 border-b border-slate-50 pb-6">
                                <InfoBadge icon={<Layers size={14}/>} label="Cấp độ" value={course.level || 'Chưa rõ'} />
                                <InfoBadge icon={<Clock size={14}/>} label="Thời lượng" value={`${course.duration || 0} buổi`} />
                                <InfoBadge icon={<DollarSign size={14}/>} label="Học phí" value={`${(course.price || 0).toLocaleString('vi-VN')}đ`} />
                                <InfoBadge icon={<Users size={14}/>} label="Trạng thái" value={course.status || 'Đang mở'} />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border rounded-lg ${course.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {course.status || 'UNKNOWN'}
                                </span>
                                <button onClick={() => setSelectedCourse({ id: course.id!, name: course.name || '' })} className="text-orange-600 font-black text-sm flex items-center gap-1 hover:gap-2 transition-all">Quản lý danh sách Lớp →</button>
                            </div>
                        </div>
                    ))
                ) : (
                    teacherClasses.map((cls) => (
                        <div key={cls.id} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><GraduationCap size={28} /></div>
                                <div className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-orange-100">LỚP CỦA BẠN</div>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight italic">{cls.className}</h3>
                            <p className="text-slate-400 text-xs font-bold mb-6 flex items-center gap-1"><Clock size={12}/> Ngày khai giảng: {cls.startDate}</p>
                            <div className="grid grid-cols-2 gap-y-4 mb-8 border-y border-slate-50 py-6">
                                <InfoBadge icon={<User size={14}/>} label="Học viên" value={cls.studentName} />
                                <InfoBadge icon={<Clock size={14}/>} label="Tổng buổi" value={`${cls.totalSessions} buổi`} />
                                <InfoBadge icon={<Video size={14}/>} label="Phòng học" value="Zoom Online" />
                                <InfoBadge icon={<Layers size={14}/>} label="Tiến độ" value={cls.status} />
                            </div>
                            <button onClick={() => setSelectedCourse({ id: cls.id, name: cls.className })} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-lg active:scale-95">Vào điểm danh & Xem lộ trình <ChevronRight size={18}/></button>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL TẠO KHÓA HỌC */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
                        <div className="p-8 bg-orange-500 text-white flex justify-between items-center shadow-lg">
                            <h3 className="text-xl font-bold uppercase italic tracking-tighter">Thiết lập khóa học mới</h3>
                            <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-xl"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateCourse} className="p-8 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tên khóa học *</label>
                                <input required type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-slate-700 focus:ring-2 focus:ring-orange-500/20" value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Mô tả chi tiết</label>
                                <textarea className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-medium h-24 text-slate-700 focus:ring-2 focus:ring-orange-500/20" value={newCourse.description} onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Cấp độ</label>
                                    <select className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-bold text-slate-700" value={newCourse.level} onChange={(e) => setNewCourse({...newCourse, level: e.target.value as any})}>
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Trạng thái</label>
                                    <select className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-bold text-slate-700" value={newCourse.status} onChange={(e) => setNewCourse({...newCourse, status: e.target.value as any})}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Giá (VNĐ)</label>
                                    <input required type="number" className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-black text-orange-600" value={newCourse.price} onChange={(e) => setNewCourse({...newCourse, price: Number(e.target.value)})}/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Số buổi học</label>
                                    <input required type="number" className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-black text-slate-700" value={newCourse.duration} onChange={(e) => setNewCourse({...newCourse, duration: Number(e.target.value)})}/>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-orange-500 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-orange-600 transition-all mt-4 uppercase tracking-widest active:scale-95">Xác Nhận Tạo Khóa Học</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoBadge = ({ icon, label, value }: { icon: any, label: string, value: any }) => (
    <div className="flex items-center gap-3">
        <div className="text-orange-500 bg-orange-50 p-2 rounded-xl shrink-0 border border-orange-100/50">{icon}</div>
        <div className="overflow-hidden">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-tighter mb-1">{label}</p>
            <p className="text-slate-700 text-xs font-black truncate">{value}</p>
        </div>
    </div>
);

export default Course;