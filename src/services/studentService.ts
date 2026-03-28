import { supabase } from '../supabaseClient';

export interface StudentData {
    id?: string;
    student_code: string;
    full_name: string;
    phone: string;
    email: string;
    cccd: string;
    address: string;
    enrolled_course?: string;
    class_id?: string;
    class_name?: string;
    total_fee: number;
    paid_amount: number;
    status: 'CHỜ THANH TOÁN' | 'NỢ HỌC PHÍ' | 'ĐANG HỌC' | 'BẢO LƯU' | 'ĐÃ TỐT NGHIỆP';
    note?: string;
    created_at?: string;
}

const TABLE_NAME = "students";

// 1. Lắng nghe danh sách học viên Real-time
export const subscribeToStudents = async (callback: (students: StudentData[]) => void) => {
    // Lấy dữ liệu ban đầu
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        callback(data as StudentData[]);
    }

    // Thiết lập kênh Real-time
    return supabase
        .channel('public:students')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, async () => {
            const { data: updatedData } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false });
            if (updatedData) callback(updatedData as StudentData[]);
        })
        .subscribe();
};

// 2. Tạo học viên mới
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
        return null;
    }
};