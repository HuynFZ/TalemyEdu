import { db } from '../firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp,
  doc, updateDoc, arrayUnion, increment // BỔ SUNG CÁC HÀM NÀY
} from 'firebase/firestore';

// 1. Định nghĩa Interface
export interface CourseData {
  id?: string;
  name: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  duration: number; 
  status: 'active' | 'inactive' | 'upcoming';
  instructor: string;   
  assistant: string;    
  studentsCount: number; 
  createdAt?: Timestamp;
}
const COLLECTION_NAME = "courses";

// 2. Hàm lấy danh sách khóa học Real-time
export const subscribeToCourses = (callback: (courses: CourseData[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CourseData[];
    callback(data);
  });
};

// 3. Hàm thêm khóa học mới
export const createCourse = async (course: Omit<CourseData, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...course,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};

