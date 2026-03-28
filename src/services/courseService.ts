// --- FILE: src/services/courseService.ts ---
import { supabase } from '../supabaseClient';

// 1. Định nghĩa Interface chuẩn khớp với bảng 'courses' SQL hiện tại
export interface CourseData {
    id?: string;
    name: string;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number;
    duration: number; // Số buổi học
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

// 3. Hàm thêm khóa học mới
export const createCourse = async (course: Omit<CourseData, 'id' | 'created_at'>) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([course])
            .select();

        if (error) throw error;
        return data[0].id;
    } catch (error) {
        console.error("Error adding course: ", error);
        throw error;
    }
};

// 4. Hàm cập nhật khóa học
export const updateCourse = async (id: string, updateData: Partial<CourseData>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error updating course: ", error);
        throw error;
    }
};

// 5. Hàm xóa khóa học
export const deleteCourse = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error deleting course: ", error);
        throw error;
    }
};