import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';

const ClassManagement = ({ courseId, courseTitle }: { courseId: string, courseTitle: string }) => {
  const [showModal, setShowModal] = useState(false);
  const [mentors, setMentors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Lấy danh sách user từ Firebase để Admin chọn trong Pop-up
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (nav) => {
      const users = nav.docs.map(d => ({id: d.id, ...d.data()}));
      setMentors(users.filter((u: any) => u.role === 'mentor'));
      setStudents(users.filter((u: any) => u.role === 'student'));
    });
    return () => unsub();
  }, []);

  const handleCreateClass = async (formData: any) => {
    await addDoc(collection(db, "classes"), {
      ...formData,
      courseId: courseId, // Gắn ID khóa học vào lớp
      createdAt: new Date()
    });
    setShowModal(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Lớp học thuộc khóa: {courseTitle}</h2>
      <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-2 rounded-lg mt-4">
        + Thêm lớp học mới (Class)
      </button>

      {/* Pop-up (Modal) Chọn nhân sự cho lớp */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[500px]">
            <h3 className="text-lg font-bold mb-4">Cấu hình lớp học mới</h3>
            
            <label className="block text-sm mb-2">Chọn Giảng viên</label>
            <select className="w-full border p-2 rounded-xl mb-4">
              {mentors.map(m => <option key={m.id}>{m.name}</option>)}
            </select>

            <label className="block text-sm mb-2">Chọn Học viên (Giữ Ctrl để chọn nhiều)</label>
            <select multiple className="w-full border p-2 rounded-xl mb-4 h-32">
              {students.map(s => <option key={s.id}>{s.name}</option>)}
            </select>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="text-slate-500">Hủy</button>
              <button className="bg-orange-500 text-white px-4 py-2 rounded-xl">Xác nhận tạo lớp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};