import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Plus, MoreHorizontal, Search, X, UserCheck, GraduationCap } from 'lucide-react';
// Import các hàm từ service bạn vừa tạo
import { subscribeToCourses, createCourse, CourseData } from '../services/courseService';

const Course = () => {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newCourse, setNewCourse] = useState<Omit<CourseData, 'id' | 'createdAt'>>({
    name: '',
    description: '',
    level: 'Beginner',
    price: 0,
    duration: 0,
    status: 'active',
    instructor: '',
    assistant: '',
    studentsCount: 0
  });

  // Lấy dữ liệu qua Service
  useEffect(() => {
    const unsubscribe = subscribeToCourses((data) => {
      setCourses(data);
    });
    return () => unsubscribe();
  }, []);

  // Xử lý lưu qua Service
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCourse(newCourse);
      setShowModal(false);
      setNewCourse({ 
        name: '', description: '', level: 'Beginner', 
        price: 0, duration: 0, status: 'active',
        instructor: '', assistant: '', studentsCount: 0 
      });
    } catch (error) {
      alert("Lỗi khi tạo khóa học, vui lòng thử lại!");
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header & Search Bar giữ nguyên như cũ... */}
      
      {/* Course Grid hiển thị dữ liệu từ State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {courses
          .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((course) => (
            <div key={course.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white">
                  <BookOpen size={28} />
                </div>
                <MoreHorizontal size={24} className="text-slate-300" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 mb-6">{course.name}</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 text-slate-500">
                  <UserCheck size={18} className="text-purple-400" />
                  <span className="text-sm">Giảng viên: <b className="text-slate-700">{course.instructor}</b></span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                  <GraduationCap size={18} className="text-purple-400" />
                  <span className="text-sm">Trợ giảng: <b className="text-slate-700">{course.assistant}</b></span>
                </div>
                <div className="flex items-center gap-4 text-slate-500">
                  <Users size={18} className="text-orange-400" />
                  <span className="text-sm">Sĩ số: <b className="text-slate-700">{course.studentsCount} học viên</b></span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase ${
                  course.status === 'active' ? 'bg-green-50 text-green-500' : 'bg-orange-50 text-orange-500'
                }`}>
                  {course.status}
                </span>
                <button className="text-orange-600 font-bold text-sm">Quản lý danh sách →</button>
              </div>
            </div>
          ))}
      </div>

      {/* MODAL & FORM giữ nguyên logic cập nhật State newCourse... */}
    </div>
  );
};

export default Course;