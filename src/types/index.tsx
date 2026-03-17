import { Timestamp } from 'firebase/firestore';

export interface ClassroomData {
  id?: string;
  name: string;
  course_name: string; // Tên khóa học để hiển thị nhanh
  teacher_name: string;
  pt_name?: string;
  student_count: number;
  start_date: any;
  end_date: any;
  status: 'active' | 'upcoming' | 'completed';
}

export interface Staff {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
}