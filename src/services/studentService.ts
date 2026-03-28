// --- FILE: src/services/studentService.ts ---
import { supabase } from '../supabaseClient';

// Đã cập nhật Interface theo chuẩn SQL Normalization mới nhất
export interface StudentData {
    id?: string;
    student_code: string;   
    lead_id?: string | null; // Liên kết xem HV này đến từ Lead nào
    full_name: string;      
    phone: string;
    email: string;
    cccd: string;
    address: string;
    status: string; // 'Đang học', 'Bảo lưu', 'Đã tốt nghiệp'
    note?: string;
    created_at?: string;
}

const TABLE_NAME = "students";

// 1. Lấy danh sách học viên Real-time
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

    const channel = supabase
        .channel('public_students_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchStudents();
        })
        .subscribe();

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
        console.error("Lỗi khi tạo học viên:", error);
        throw error;
    }
};

// 3. Cập nhật thông tin học viên
export const updateStudent = async (id: string, data: Partial<StudentData>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật học viên:", error);
        throw error;
    }
};

// 4. Xóa hồ sơ học viên
export const deleteStudent = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi khi xóa học viên:", error);
        throw error;
    }
};

// 5. Lấy thông tin chi tiết một học viên theo ID
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