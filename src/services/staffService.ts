import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Role } from '../context/AuthContext';

export interface StaffData {
    id?: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    gender: 'Male' | 'Female' | 'Other';
    position: Role;
    salary: number;
    hireDate: string;
    status: 'active' | 'inactive';
}

export const createStaff = async (data: StaffData & { password?: string }) => {
    try {
        // 1. Tạo bản ghi login có thêm password
        const userRef = await addDoc(collection(db, "users"), {
            username: data.email,
            password: data.password || "123456",
            role: data.position,
            status: 'active',
            createdAt: serverTimestamp()
        });

        // 2. Tạo hồ sơ nhân sự
        await addDoc(collection(db, "staffs"), {
            user_id: userRef.id,
            ...data,
            salary: Number(data.salary),
            createdAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Lỗi:", error);
        throw error;
    }
};

export const subscribeToStaffs = (callback: (data: StaffData[]) => void) => {
    const q = query(collection(db, "staffs"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StaffData[];
        callback(data);
    });
};