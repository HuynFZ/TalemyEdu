// --- FILE: src/services/studentService.ts ---
import { supabase } from '../supabaseClient';

// Đã chuẩn hóa: Loại bỏ các trường học phí, lớp học để nhường cho bảng contracts
export interface StudentData {
    id?: string;
    student_code: string;   
    lead_id?: string | null; // Liên kết xem HV này đến từ Lead nào
    full_name: string;      
    phone: string;
    email: string;
    cccd: string;
    address: string;
    status: string; // 'Đang học', 'Bảo lưu', 'Đã tốt nghiệp', 'Nợ học phí'
    note?: string;
    created_at?: string;
}

const TABLE_NAME = "students";

// 1. Lắng nghe danh sách học viên Real-time
export const subscribeToStudents = (callback: (students: StudentData[]) => void) => {
    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            callback(data as StudentData[]);
        } else {
            console.error("Lỗi tải học viên:", error);
        }
    };

    fetchStudents();

    // SỬA TẠI ĐÂY: Thêm ID ngẫu nhiên vào tên channel
    const uniqueChannelName = `students_changes_${Math.random().toString(36).substring(7)}`;

    const channel = supabase
        .channel(uniqueChannelName) 
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchStudents();
        })
        .subscribe();

    // Trả về hàm hủy để Component gọi khi unmount
    return () => {
        supabase.removeChannel(channel);
    };
};

// 2. Thêm học viên mới
export const createStudent = async (data: Omit<StudentData, 'id' | 'created_at'>) => {
    try {
        const { data: insertedData, error } = await supabase
            .from(TABLE_NAME)
            .insert([data])
            .select();

        if (error) throw error;
        return insertedData[0].id;
    } catch (error) {
        console.error("Lỗi createStudent:", error);
        throw error;
    }
};

// 3. Cập nhật học viên
export const updateStudent = async (id: string, data: Partial<StudentData>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi updateStudent:", error);
        throw error;
    }
};

// 4. Xóa học viên
export const deleteStudent = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi deleteStudent:", error);
        throw error;
    }
};

// 5. Lấy 1 học viên theo ID
export const getStudentById = async (id: string) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as StudentData;
    } catch (error) {
        console.error("Lỗi khi lấy thông tin học viên:", error);
        return null;
    }
};