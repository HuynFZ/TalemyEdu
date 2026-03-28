// --- FILE: src/services/studentService.ts ---
import { supabase } from '../supabaseClient';

export interface StudentData {
    id?: string;
    student_code: string;   // Chuyển sang snake_case
    full_name: string;      // Chuyển sang snake_case
    phone: string;
    email: string;
    cccd: string;
    address: string;
    enrolled_course?: string; // Khóa đang học (tương ứng với enrolledCourse)
    class_id?: string;        // ID của lớp học
    class_name?: string;      // Tên của lớp học
    total_fee: number;       // Tổng học phí
    paid_amount: number;     // Đã thanh toán
    status: 'CHỜ THANH TOÁN' | 'NỢ HỌC PHÍ' | 'ĐANG HỌC' | 'BẢO LƯU' | 'ĐÃ TỐT NGHIỆP';
    note?: string;
    created_at?: any;
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
        }
    };

    // Gọi lần đầu để lấy dữ liệu
    fetchStudents();

    // Lắng nghe thay đổi từ Database
    const channel = supabase
        .channel('public:students')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchStudents();
        })
        .subscribe();

    return channel;
};

// 2. Tạo hồ sơ học viên mới
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
        console.error("Lỗi lấy thông tin học viên:", error);
        return null;
    }
};