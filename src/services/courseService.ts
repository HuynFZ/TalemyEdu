import { supabase } from '../supabaseClient';

export interface CourseData {
    id?: string;
    name: string;
    description: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number;
    duration: number;
    status: 'active' | 'inactive' | 'upcoming';
    instructor_id?: string;
    assistant_id?: string;
    created_at?: string;
    // Các trường ảo từ Join
    instructor_name?: string;
    assistant_name?: string;
}

const TABLE_NAME = "courses";

// 1. Lắng nghe danh sách khóa học (Real-time)
export const subscribeToCourses = (callback: (courses: any[]) => void) => {
    const fetchCourses = async () => {
        // CHỈ LẤY DỮ LIỆU TỪ BẢNG COURSES, KHÔNG JOIN NỮA
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Lỗi truy vấn Supabase:", error.message);
            return;
        }

        if (data) {
            callback(data);
        }
    };

    // Gọi lần đầu
    fetchCourses();

    // Lắng nghe thay đổi Realtime
    return supabase
        .channel('public:courses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
            fetchCourses();
        })
        .subscribe();
};

// 2. Thêm khóa học mới
export const createCourse = async (course: any) => {
    const { data, error } = await supabase
        .from('courses')
        .insert([course])
        .select();

    if (error) throw error;
    return data[0];
};

// 3. Cập nhật khóa học
export const updateCourse = async (id: string, updateData: Partial<CourseData>) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('id', id);

    if (error) throw error;
};