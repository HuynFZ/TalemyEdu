import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface StudentData {
    id?: string;
    studentCode: string;   // Mã học viên
    fullName: string;
    phone: string;
    email: string;
    cccd: string;
    address: string;
    enrolledCourse: string; // Khóa đang học
    totalFee: number;       // Tổng học phí
    paidAmount: number;     // Đã thanh toán
    status: 'CHỜ THANH TOÁN' | 'NỢ HỌC PHÍ' | 'ĐANG HỌC' | 'BẢO LƯU' | 'ĐÃ TỐT NGHIỆP';
    note?: string;
    createdAt?: any;
}

const COLLECTION_NAME = "students";

export const subscribeToStudents = (callback: (students: StudentData[]) => void) => {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudentData[];
        callback(data);
    });
};

export const createStudent = async (data: Omit<StudentData, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) { throw error; }
};

// Thêm vào cuối file src/services/studentService.ts
export const updateStudent = async (id: string, data: Partial<StudentData>) => {
    try {
        const docRef = doc(db, "students", id);
        await updateDoc(docRef, data);
        return true;
    } catch (error) { throw error; }
};

export const deleteStudent = async (id: string) => {
    try {
        await deleteDoc(doc(db, "students", id));
        return true;
    } catch (error) { throw error; }
};