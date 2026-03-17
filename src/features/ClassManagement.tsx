import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { 
  ChevronLeft, 
  Plus, 
  Users, 
  UserCheck, 
  GraduationCap, 
  X, 
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface ClassManagementProps {
  courseId: string;
  courseTitle: string;
  onBack: () => void;
}

const ClassManagement = ({ courseId, courseTitle, onBack }: ClassManagementProps) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // State chứa danh sách nhân sự từ Firebase
  const [users, setUsers] = useState<{mentors: any[], pts: any[], students: any[]}>({
    mentors: [],
    pts: [],
    students: []
  });

  // State cho Form tạo lớp
  const [formData, setFormData] = useState({
    className: '',
    mentorId: '',
    ptId: '',
    selectedStudents: [] as string[],
    startDate: ''
  });

  // 1. Lấy danh sách lớp học thuộc khóa học này (Real-time)
  useEffect(() => {
    const q = query(
      collection(db, "classes"), 
      where("courseId", "==", courseId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [courseId]);

  // 2. Lấy danh sách Users và phân loại theo Role
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers({
        mentors: allUsers.filter((u: any) => u.role === 'teacher' || u.role === 'admin'),
        pts: allUsers.filter((u: any) => u.role === 'pt'),
        students: allUsers.filter((u: any) => u.role === 'student')
      });
    });
    return () => unsubscribe();
  }, []);

  // 3. Xử lý lưu lớp học mới
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    // Gọi hàm từ service
    await createClass({
      className: formData.className,
      courseId: courseId,
      mentorId: formData.mentorId,
      ptId: formData.ptId,
      selectedStudents: formData.selectedStudents,
      startDate: formData.startDate,
      studentCount: formData.selectedStudents.length,
      status: 'active'
    });
    
    setShowModal(false);
    // ... reset form
  } catch (error) {
    alert("Lỗi khi tạo lớp!");
  }
};

  // 4. Xử lý chọn/bỏ chọn học viên
  const toggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId]
    }));
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-xl shadow-sm border border-slate-200 transition-all active:scale-95">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Điều phối Lớp học</h2>
          <p className="text-orange-500 font-bold text-sm">Khóa: {courseTitle}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="ml-auto bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={20} /> Tạo lớp mới
        </button>
      </div>

      {/* Grid Danh sách lớp */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 italic">
            Chưa có lớp học nào được tạo cho khóa này.
          </div>
        )}
        {classes.map(cls => (
          <div key={cls.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
               <div className="bg-orange-100 text-orange-600 p-3 rounded-2xl">
                 <GraduationCap size={24} />
               </div>
               <span className="text-[10px] font-black uppercase bg-green-100 text-green-600 px-2 py-1 rounded-lg">
                 {cls.status}
               </span>
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-4">{cls.className}</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <UserCheck size={16} className="text-orange-500" />
                <span>GV: <b>{users.mentors.find(m => m.id === cls.mentorId)?.name || 'N/A'}</b></span>
              </div>
              {cls.ptId && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users size={16} className="text-blue-500" />
                  <span>PT: <b>{users.pts.find(p => p.id === cls.ptId)?.name || 'Không có'}</b></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar size={16} className="text-slate-400" />
                <span>Khai giảng: <b>{cls.startDate || 'Chưa chốt'}</b></span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {cls.studentCount} Học viên
              </span>
              <button className="text-orange-500 text-sm font-bold hover:underline">Chi tiết</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL TẠO LỚP HỌC */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 bg-orange-500 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">Cấu hình lớp học mới</h3>
              <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
              {/* 1. Tên lớp & Ngày */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Tên lớp học</label>
                  <input 
                    required type="text" placeholder="Ví dụ: IELTS-K24-Morning"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                    value={formData.className}
                    onChange={(e) => setFormData({...formData, className: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Ngày khai giảng</label>
                  <input 
                    required type="date"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-bold text-slate-600"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
              </div>

              {/* 2. Chọn Nhân sự */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Giảng viên (Mentor)</label>
                  <select 
                    required
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-bold outline-none appearance-none"
                    value={formData.mentorId}
                    onChange={(e) => setFormData({...formData, mentorId: e.target.value})}
                  >
                    <option value="">-- Chọn GV --</option>
                    {users.mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Trợ giảng (PT - Nếu có)</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 font-bold outline-none appearance-none"
                    value={formData.ptId}
                    onChange={(e) => setFormData({...formData, ptId: e.target.value})}
                  >
                    <option value="">Không có PT</option>
                    {users.pts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 3. Chọn Học viên (Đa chọn thủ công) */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">
                  Danh sách Học viên ({formData.selectedStudents.length} đã chọn)
                </label>
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-100">
                  {users.students.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        formData.selectedStudents.includes(s.id) 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-white hover:bg-orange-50 text-slate-600'
                      }`}
                    >
                      <span className="text-sm font-bold">{s.name}</span>
                      {formData.selectedStudents.includes(s.id) && <CheckCircle2 size={16} />}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all active:scale-[0.98] mt-4"
              >
                Xác nhận tạo & Kích hoạt lớp
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;