// --- FILE: src/services/staffService.ts ---
import { supabase } from '../supabaseClient';

// 1. Interface chuẩn khớp 100% với bảng 'staffs' trong Database
export interface StaffData {
    id?: string;
    user_id?: string;      // ID từ bảng users/auth
    name: string;
    email: string;
    phone: string;
    cccd?: string;
    address: string;
    gender?: string;       // Male / Female / Other
    role: 'admin' | 'teacher' | 'pt' | 'sale' | 'finance'; // Role động
    salary: number;
    hire_date: string;     // Định dạng YYYY-MM-DD
    bio?: string;
    status: 'active' | 'inactive';
    fixed_schedule?: string[]; // Mảng các thứ trong tuần
    created_at?: string;
}

const TABLE_NAME = 'staffs';

/**
 * 2. Lấy danh sách nhân sự theo Vị trí (Real-time)
 * Dùng cho trang TeacherManagement (position = 'teacher')
 */
export const subscribeToStaffByPosition = async (position: string, callback: (staffs: StaffData[]) => void) => {
    // Lấy dữ liệu lần đầu
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('role', position)
        .order('name', { ascending: true });

    if (!error && data) callback(data as StaffData[]);

    // Thiết lập kênh lắng nghe thay đổi
    return supabase
        .channel(`public:staffs:role:${position}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: TABLE_NAME, filter: `role=eq.${position}` },
            async () => {
                const { data: updatedData } = await supabase
                    .from(TABLE_NAME)
                    .select('*')
                    .eq('role', position);
                if (updatedData) callback(updatedData as StaffData[]);
            }
        )
        .subscribe();
};

/**
 * 3. Lấy danh sách nhân sự loại trừ một số vị trí (Real-time)
 * Dùng cho trang StaffManagement (loại trừ teacher, pt)
 */
export const subscribeToStaffsFiltered = async (excludeRoles: string[], callback: (data: StaffData[]) => void) => {
    // Lấy dữ liệu lần đầu
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .not('role', 'in', `(${excludeRoles.join(',')})`)
        .order('created_at', { ascending: false });

    if (!error && data) callback(data as StaffData[]);

    // Thiết lập kênh lắng nghe
    return supabase
        .channel('public:staffs:filtered')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: TABLE_NAME },
            async () => {
                const { data: updatedData } = await supabase
                    .from(TABLE_NAME)
                    .select('*')
                    .not('role', 'in', `(${excludeRoles.join(',')})`);
                if (updatedData) callback(updatedData as StaffData[]);
            }
        )
        .subscribe();
};

/**
 * 4. Tạo hồ sơ nhân sự mới
 * Tự động ánh xạ các trường để tránh lỗi 400 Bad Request
 */
export const createStaff = async (formData: any) => {
    try {
        // Tách các trường không thuộc bảng staffs (như password)
        const { password, ...rest } = formData;

        const staffToInsert = {
            name: rest.name,
            email: rest.email?.toLowerCase().trim(),
            phone: rest.phone,
            address: rest.address,
            role: rest.role, // Lấy role từ form (Admin/Sale/Teacher...)
            salary: Number(rest.salary) || 0,
            hire_date: rest.hire_date || rest.hireDate || new Date().toISOString().split('T')[0],
            status: rest.status || 'active',
            cccd: rest.cccd || '',
            bio: rest.bio || '',
            gender: rest.gender || 'Male',
            fixed_schedule: rest.fixed_schedule || rest.fixedSchedule || []
        };

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([staffToInsert])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error("Lỗi createStaff:", error);
        throw error;
    }
};

/**
 * 5. Cập nhật hồ sơ nhân sự
 */
export const updateStaff = async (id: string, updateData: any) => {
    try {
        // Đảm bảo dữ liệu gửi lên dùng snake_case
        const mappedData: any = { ...updateData };
        if (updateData.hireDate) {
            mappedData.hire_date = updateData.hireDate;
            delete mappedData.hireDate;
        }
        if (updateData.fixedSchedule) {
            mappedData.fixed_schedule = updateData.fixedSchedule;
            delete mappedData.fixedSchedule;
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .update(mappedData)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi updateStaff:", error);
        throw error;
    }
};

/**
 * 6. Xóa nhân sự
 */
export const deleteStaff = async (id: string) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};

/**
 * 7. Lấy hồ sơ cá nhân theo Email
 */
export const getStaffProfile = async (email: string) => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle(); // maybeSingle trả về null thay vì lỗi nếu không tìm thấy

    if (error) {
        console.error("Lỗi getStaffProfile:", error);
        return null;
    }
    return data as StaffData;
};