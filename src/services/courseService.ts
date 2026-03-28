// --- FILE: src/services/courseService.ts ---
import { supabase } from '../supabaseClient';

// 1. Định nghĩa Interface dựa trên bảng 'courses' trong ERD
export interface CourseData {
    id?: string;
    name: string;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number;
    duration: number; // Số buổi học
    status: 'active' | 'inactive' | 'upcoming';
    instructor_id?: string; // Khóa ngoại liên kết bảng staffs
    assistant_id?: string;  // Khóa ngoại liên kết bảng staffs
    created_at?: string;

    // Các trường ảo lấy từ bảng staffs qua Join (để hiển thị UI)
    instructor_name?: string;
    assistant_name?: string;
}

const TABLE_NAME = "courses";

// 2. Hàm lấy danh sách khóa học Real-time (Kèm Join thông tin nhân sự)
export const subscribeToCourses = (callback: (courses: CourseData[]) => void) => {
    const fetchCourses = async () => {
        // Join với bảng staffs dựa trên instructor_id và assistant_id
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
        *,
        instructor:staffs!instructor_id(name),
        assistant:staffs!assistant_id(name)
      `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Format lại dữ liệu để UI dễ sử dụng
            const formattedData = data.map(course => ({
                ...course,
                instructor_name: course.instructor?.name,
                assistant_name: course.assistant?.name
            })) as CourseData[];

            callback(formattedData);
        }
    };

    // Lấy dữ liệu lần đầu
    fetchCourses();

    // Lắng nghe thay đổi Postgres
    return supabase
        .channel('public:courses')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchCourses();
        })
        .subscribe();
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