// --- FILE: src/services/courseService.ts ---
import { supabase } from '../supabaseClient';

// 1. Định nghĩa Interface chuẩn khớp với bảng 'courses' SQL hiện tại
export interface CourseData {
    id?: string;
    name: string;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number;
    duration: number;
    status: 'active' | 'inactive' | 'upcoming';
    created_at?: string;
}

const TABLE_NAME = "courses";

// 2. Hàm lấy danh sách khóa học Real-time
export const subscribeToCourses = (callback: (courses: CourseData[]) => void) => {
    const fetchCourses = async () => {
        // Khóa học giờ chỉ chứa thông tin cơ bản, giảng viên nằm ở Classes
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            callback(data as CourseData[]);
        } else {
            console.error("Lỗi tải khóa học:", error);
        }
    };

    fetchCourses();

    const channel = supabase
        .channel('public_courses_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchCourses();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// 3. Thêm khóa học mới
export const createCourse = async (course: Omit<CourseData, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([course])
        .select();

    if (error) throw error;
    return data[0];
};

// 4. Cập nhật khóa học
export const updateCourse = async (id: string, updateData: Partial<CourseData>) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('id', id);

    if (error) throw error;
};