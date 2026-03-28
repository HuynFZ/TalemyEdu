// --- FILE: src/services/classService.ts ---
import { supabase } from '../supabaseClient';

export interface ClassData {
    id?: string;
    course_id: string;
    teacher_id?: string | null;
    assistant_id?: string | null; // <-- Thêm trợ giảng
    name: string; 
    start_date?: string | null;
    zoom_link?: string | null;    // <-- Thêm link zoom
    status: string;
    created_at?: string;
}

const TABLE_NAME = "classes";

// 1. Tạo Lớp học mới
export const createClass = async (data: Omit<ClassData, 'id' | 'created_at'>) => {
    try {
        const { data: insertedData, error } = await supabase
            .from(TABLE_NAME)
            .insert([data])
            .select();

        if (error) {
            console.error("Lỗi chi tiết từ Supabase khi tạo lớp:", error);
            throw error;
        }
        return insertedData[0].id;
    } catch (error) {
        console.error("Lỗi khi tạo Lớp học:", error);
        throw error;
    }
};

// 2. Lấy danh sách lớp học
// 2. Lấy danh sách lớp học (Kèm giáo viên và học viên)
export const subscribeToClasses = (callback: (classes: any[]) => void) => {
    const fetchClasses = async () => {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                *,
                course:courses (name, duration),
                teacher:staffs!classes_teacher_id_fkey (name),
                contracts (
                    student:students (id, full_name, student_code)
                )
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const formattedClasses = data.map((cls: any) => {
                // Trích xuất danh sách học viên từ các hợp đồng thuộc lớp này
                const enrolledStudents = cls.contracts 
                    ? cls.contracts.map((c: any) => c.student).filter(Boolean)
                    : [];

                return {
                    ...cls,
                    courseName: cls.course?.name || 'Chưa rõ',
                    totalSessions: cls.course?.duration || 0,
                    teacherName: cls.teacher?.name || 'Chưa phân công',
                    studentsList: enrolledStudents,       // Mảng chứa thông tin học viên
                    studentCount: enrolledStudents.length // Số lượng học viên hiện tại
                };
            });
            callback(formattedClasses);
        } else {
            console.error("Lỗi tải danh sách lớp:", error);
        }
    };

    fetchClasses();

    const channel = supabase
        .channel('public_classes_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchClasses();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () => {
            fetchClasses(); // Render lại lớp nếu có hợp đồng (học viên) mới chui vào
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
// 3. Cập nhật lớp học
export const updateClass = async (id: string, updateData: Partial<ClassData>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật lớp:", error);
        throw error;
    }
};

// 4. Xóa lớp học
export const deleteClass = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi khi xóa lớp:", error);
        throw error;
    }
};