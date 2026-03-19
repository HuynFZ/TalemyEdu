import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface TeacherData {
    id?: string;
    fullName: string;
    phone: string;
    email: string;
    cccd: string;
    address: string;
    status: 'ĐANG GIẢNG DẠY' | 'TẠM NGHỈ';
    note?: string;
    createdAt?: any;
}

const COLLECTION_NAME = "teachers";

// Lấy danh sách Giáo viên (Real-time)
export const subscribeToTeachers = (callback: (teachers: TeacherData[]) => void) => {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeacherData[];
        callback(data);
    });
};

// Thêm Giáo viên mới
export const createTeacher = async (data: Omit<TeacherData, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) { throw error; }
};

// Cập nhật thông tin Giáo viên
export const updateTeacher = async (id: string, data: Partial<TeacherData>) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), data);
    } catch (error) { throw error; }
};

// Xóa Giáo viên
export const deleteTeacher = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) { throw error; }
};