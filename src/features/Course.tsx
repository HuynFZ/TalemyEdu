import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Users, Plus, MoreHorizontal, GraduationCap, Search, X, DollarSign, Clock, Layers } from 'lucide-react';
import { db } from '../firebase'; // Đảm bảo đường dẫn đúng tới file config firebase của bạn
import { collection, addDoc, onSnapshot, query, serverTimestamp, orderBy } from 'firebase/firestore';

const Course = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State cho Form tạo khóa học mới theo Database Schema
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    level: 'Beginner',
    price: 0,
    duration: 0,
    status: 'active'
  });

  // 1. Lấy dữ liệu Real-time từ Firebase
  useEffect(() => {
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Hàm xử lý lưu khóa học lên Firebase
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
    } catch (error) {
      console.error("Lỗi khi tạo khóa học:", error);
      alert("Không thể tạo khóa học, vui lòng thử lại!");
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Quản lý Khóa học (LMS)</h2>
          <p className="text-slate-500 text-sm">Điều phối giảng viên, trợ giảng và danh sách lớp.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={20} /> Tạo Khóa Học Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm tên khóa học..." 
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((course) => (
          <div key={course.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-inner">
                <BookOpen size={28} />
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-2">{course.name}</h3>
            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{course.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <Layers size={16} className="text-orange-500" />
                <span className="text-slate-600">Cấp độ: <b>{course.level}</b></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="text-orange-500" />
                <span className="text-slate-600">Thời lượng: <b>{course.duration}h</b></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign size={16} className="text-orange-500" />
                <span className="text-slate-600">Giá: <b>{course.price.toLocaleString()}đ</b></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-orange-500" />
                <span className="text-slate-600">Trạng thái: <b>{course.status}</b></span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${course.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {course.status}
              </span>
              <button className="text-orange-600 font-bold text-sm hover:underline">
                Quản lý danh sách →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL TẠO KHÓA HỌC MỚI */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-500 text-white">
              <h3 className="text-xl font-bold">Tạo Khóa Học Mới</h3>
              <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tên khóa học</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả</label>
                <textarea 
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none h-24"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Cấp độ</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCourse.level}
                    onChange={(e) => setNewCourse({...newCourse, level: e.target.value})}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCourse.status}
                    onChange={(e) => setNewCourse({...newCourse, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Giá (VNĐ)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCourse.price}
                    onChange={(e) => setNewCourse({...newCourse, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Số lượng buổi học</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({...newCourse, duration: Number(e.target.value)})}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all mt-4"
              >
                Xác Nhận Tạo Khóa Học
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Course;