import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export interface StudentData {
    id?: string;
    studentCode: string;   // Mã học viên
    fullName: string;
    phone: string;
    email: string;
    cccd: string;
    address: string;
    enrolledCourse: string; // Khóa đang học
    classId: string;        // THÊM: ID của lớp học
    className: string;      // THÊM: Tên của lớp học
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

export const updateStudent = async (id: string, data: Partial<StudentData>) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
        return true;
    } catch (error) { throw error; }
};

export const deleteStudent = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        return true;
    } catch (error) { throw error; }
};

export const getStudentById = async (id: string) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as StudentData;
        }
        return null;
    } catch (error) {
        console.error("Lỗi lấy thông tin học viên:", error);
        return null;
    }
};