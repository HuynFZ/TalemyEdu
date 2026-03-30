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

// ĐƯA INFOBADGE LÊN TRÊN ĐỂ TRÁNH LỖI "USED BEFORE DECLARATION"
const InfoBadge = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-center gap-3">
        <div className="text-orange-500 bg-orange-50 p-2 rounded-xl shrink-0 border border-orange-100/50">{icon}</div>
        <div className="overflow-hidden">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-tighter mb-1">{label}</p>
            <p className="text-slate-700 text-xs font-black truncate">{value}</p>
        </div>
    </div>
);

const Course = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState<{id: string, name: string} | null>(null);
    const [loading, setLoading] = useState(true);

    // Form tạo khóa học
    const [newCourse, setNewCourse] = useState<Omit<CourseData, 'id' | 'created_at'>>({
        name: '',
        description: '',
        level: 'Intermediate',
        price: 0,
        duration: 0,
        status: 'active'
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
            // NẾU LÀ SALE HOẶC NHÂN VIÊN KHÁC: Tắt loading để tránh lỗi trắng trang
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
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">Quản lý khóa học (LMS)</h2>
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

            {/* PHẦN HIỂN THỊ DẠNG BẢNG (TABLE) MỚI */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4 px-6">{user?.role === 'admin' ? 'Khóa Học & Mô Tả' : 'Lớp Học'}</th>
                                <th className="p-4">{user?.role === 'admin' ? 'Cấp Độ' : 'Học Viên'}</th>
                                <th className="p-4">Thời Lượng</th>
                                <th className="p-4">{user?.role === 'admin' ? 'Học Phí' : 'Nền Tảng'}</th>
                                <th className="p-4">Trạng Thái</th>
                                <th className="p-4 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {user?.role === 'admin' ? (
                                /* DATA CỦA ADMIN (KHÓA HỌC) */
                                courses.filter(c => (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).map((course) => (
                                    <tr key={course.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 px-6 max-w-xs">
                                            <div className="font-bold text-slate-800 text-base">{course.name || 'Khóa học chưa có tên'}</div>
                                            <div className="text-xs text-slate-500 line-clamp-1 mt-1 italic">{course.description || 'Chưa có mô tả'}</div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            <span className="flex items-center gap-1.5"><Layers size={14} className="text-slate-400"/> {course.level || 'Chưa rõ'}</span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {course.duration || 0} buổi</span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-orange-600">
                                            {(course.price || 0).toLocaleString('vi-VN')}đ
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border rounded-lg inline-block ${course.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                {course.status || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => setSelectedCourse({ id: course.id!, name: course.name || '' })} className="text-orange-600 font-bold text-sm flex items-center justify-end gap-1 ml-auto hover:text-orange-700 transition-all hover:gap-2">
                                                Quản lý lớp <ChevronRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                /* DATA CỦA GIẢNG VIÊN (LỚP HỌC) */
                                teacherClasses.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 px-6 max-w-xs">
                                            <div className="font-bold text-slate-800 text-base uppercase italic">{cls.className}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock size={12}/> Khai giảng: {cls.startDate}</div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            <span className="flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {cls.studentName}</span>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            {cls.totalSessions} buổi
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            <span className="flex items-center gap-1.5"><Video size={14} className="text-slate-400"/> Zoom Online</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border rounded-lg bg-blue-50 text-blue-600 border-blue-100 inline-block">
                                                {cls.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => setSelectedCourse({ id: cls.id, name: cls.className })} className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-orange-500 transition-all active:scale-95 inline-flex items-center gap-1">
                                                Vào lớp <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    
                    {/* Thông báo khi không có dữ liệu */}
                    {user?.role === 'admin' && courses.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic">Chưa có khóa học nào. Hãy tạo khóa học mới!</div>
                    )}
                    {user?.role === 'teacher' && teacherClasses.length === 0 && (
                        <div className="p-8 text-center text-slate-500 italic">Bạn chưa được phân công giảng dạy lớp nào.</div>
                    )}
                </div>
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

export default Course;