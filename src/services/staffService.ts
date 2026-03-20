import { db } from '../firebase';
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    onSnapshot,
    orderBy,
    where,
    getDocs,
    limit,
    doc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import { Role } from '../context/AuthContext';

// Định nghĩa Interface khớp với sơ đồ ERD và yêu cầu nhập liệu đầy đủ
export interface StaffData {
    id?: string;
    name: string;
    email: string; // Dùng làm username đăng nhập (@talemy.edu)
    phone: string;
    address: string;
    gender: 'Male' | 'Female' | 'Other';
    position: Role;
    salary: number;
    hireDate: string;
    status: 'active' | 'inactive';
    cccd?: string; // THÊM TRƯỜNG NÀY
    bio?: string;  // THÊM TRƯỜNG NÀY (Tiểu sử/Ghi chú)
}

/**
 * 1. Hàm tạo nhân sự mới (Dành cho Admin)
 * Thực hiện lưu đồng thời vào 2 collection: 'users' (để login) và 'staffs' (hồ sơ chi tiết)
 */
export const createStaff = async (data: StaffData & { password?: string }) => {
    try {
        // Tạo bản ghi login trong collection 'users'
        const userRef = await addDoc(collection(db, "users"), {
            username: data.email.toLowerCase(),
            password: data.password || "123456", // Mật khẩu mặc định nếu Admin không nhập
            role: data.position,
            status: 'active',
            createdAt: serverTimestamp()
        });

        // Tạo hồ sơ nhân sự chi tiết trong collection 'staffs'
        await addDoc(collection(db, "staffs"), {
            user_id: userRef.id, // Liên kết với document bên collection users
            ...data,
            email: data.email.toLowerCase(),
            salary: Number(data.salary),
            createdAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error("Lỗi khi tạo nhân sự:", error);
        throw error;
    }
};

/**
 * 2. Hàm lấy danh sách nhân sự Real-time (Dành cho trang Staff Management)
 */
// 1. Sửa lại hàm subscribe để có thể lọc loại trừ
export const subscribeToStaffsFiltered = (excludePositions: string[], callback: (data: StaffData[]) => void) => {
    const q = query(
        collection(db, "staffs"),
        where("position", "not-in", excludePositions), // Lọc loại trừ teacher và pt
        orderBy("position"),
        orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(document => ({
            id: document.id,
            ...document.data()
        })) as StaffData[];
        callback(data);
    });
};

/**
 * 3. Hàm lấy thông tin chi tiết của một nhân sự (Dành cho trang Information)
 * Tự động tìm kiếm dựa trên email của tài khoản đang đăng nhập
 */
export const getStaffProfile = async (email: string) => {
    try {
        const q = query(
            collection(db, "staffs"),
            where("email", "==", email.toLowerCase()),
            limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
            } as StaffData;
        }
        return null;
    } catch (error) {
        console.error("Lỗi khi lấy thông tin cá nhân:", error);
        throw error;
    }
};

/**
 * 4. Hàm lấy danh sách Staff theo vị trí (Ví dụ: Chỉ lấy Giáo viên)
 */
export const subscribeToStaffByPosition = (position: Role, callback: (staffs: StaffData[]) => void) => {
    const q = query(
        collection(db, "staffs"), 
        where("position", "==", position)
    );
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(document => ({ 
            id: document.id, 
            ...document.data() 
        })) as StaffData[];
        callback(data);
    });
};

/**
 * 5. Hàm Cập nhật thông tin nhân sự / giáo viên
 */
export const updateStaff = async (id: string, data: Partial<StaffData>) => {
    try {
        const staffRef = doc(db, "staffs", id);
        await updateDoc(staffRef, data);
        return true;
    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        throw error;
    }
};

/**
 * 6. Hàm Xóa nhân sự / giáo viên
 */
export const deleteStaff = async (id: string) => {
    try {
        await deleteDoc(doc(db, "staffs", id));
        return true;
    } catch (error) {
        console.error("Lỗi xóa:", error);
        throw error;
    }
};

export const updateUserPassword = async (userId: string, newPassword: string) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { password: newPassword });
        return true;
    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);
        throw error;
    }
};