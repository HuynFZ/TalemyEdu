import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export interface ClassData {
  id?: string;
  className: string;
  courseId: string;    // ID liên kết với collection 'courses'
  mentorId: string;    // ID liên kết với collection 'users' (role: teacher)
  ptId?: string;       // ID liên kết với collection 'users' (role: pt)
  selectedStudents: string[]; // Mảng các ID của users (role: student)
  startDate: string;
  status: 'active' | 'completed' | 'upcoming';
  day_left: number;
  createdAt?: Timestamp;
}

const COLLECTION_NAME = "classes";

// Lấy danh sách lớp học theo Khóa học (Real-time)
export const subscribeToClassesByCourse = (courseId: string, callback: (classes: ClassData[]) => void) => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("courseId", "==", courseId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ClassData[];
    callback(data);
  });
};

// Tạo lớp học mới
export const createClass = async (classData: Omit<ClassData, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...classData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating class: ", error);
    throw error;
  }
};