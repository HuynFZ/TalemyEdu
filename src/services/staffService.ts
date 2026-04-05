import { supabase } from '../supabaseClient';

export interface StaffData {
    id?: string;
    user_id?: string;
    name: string;
    email: string;
    phone?: string;
    cccd?: string;
    address?: string;
    gender: 'male' | 'female' | 'Nam' | 'Nữ'; // Khớp với form của bạn
    role: 'teacher' | 'sale' | 'admin' | 'finance';
    salary: number;
    hire_date: string;
    bio?: string;
    status: 'active' | 'inactive';
}

// 1. TẠO NHÂN VIÊN/GIẢNG VIÊN (Logic Rollback an toàn)
export const createStaff = async (formData: any) => {
    let createdUserId: string | null = null;

    try {
        const email = formData.email?.toLowerCase().trim();
        // Lấy position từ position hoặc role (tùy form gửi lên)
        const pos = formData.position || formData.role || 'teacher';

        // BƯỚC 1: KIỂM TRA XEM USER ĐÃ TỒN TẠI CHƯA (Tránh lỗi kẹt từ trước)
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', email)
            .maybeSingle();

        if (existingUser) {
            // Nếu User đã tồn tại nhưng không có Staff, ta xóa User cũ này đi để làm mới
            const { data: linkedStaff } = await supabase
                .from('staffs')
                .select('id')
                .eq('user_id', existingUser.id)
                .maybeSingle();

            if (!linkedStaff) {
                await supabase.from('users').delete().eq('id', existingUser.id);
            } else {
                throw new Error("Email này đã được sử dụng bởi một nhân sự khác!");
            }
        }

        // BƯỚC 2: Tạo tài khoản trong bảng 'users'
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert([{
                username: email,
                password: '123456', // Pass mặc định
                role: pos,
                status: 'active'
            }])
            .select()
            .single();

        if (userError) throw userError;
        createdUserId = newUser.id;

        // BƯỚC 3: Tạo hồ sơ trong bảng 'staffs'
        // LƯU Ý: Tên cột phải khớp 100% với SQL (user_id, name, position...)
        const { data: staff, error: staffError } = await supabase
            .from('staffs')
            .insert([{
                user_id: createdUserId,
                name: formData.name,
                email: email,
                phone: formData.phone,
                cccd: formData.cccd || '',
                address: formData.address || '',
                gender: formData.gender,
                role: pos,
                salary: Number(formData.salary) || 0,
                hire_date: formData.hire_date,
                bio: formData.bio || '',
                status: 'active'
            }])
            .select();

        if (staffError) {
            // NẾU LỖI TẠO STAFF -> XÓA NGAY USER VỪA TẠO ĐỂ KHÔNG BỊ TRÙNG EMAIL LẦN SAU
            if (createdUserId) {
                await supabase.from('users').delete().eq('id', createdUserId);
            }
            throw staffError;
        }

        return staff[0];

    } catch (error: any) {
        console.error("Lỗi chi tiết từ Supabase:", error);
        // Fallback cuối cùng để dọn dẹp
        if (createdUserId) {
            await supabase.from('users').delete().eq('id', createdUserId);
        }
        throw error;
    }
};

// 2. CẬP NHẬT NHÂN VIÊN
export const updateStaff = async (id: string, data: any) => {
    try {
        const { error } = await supabase
            .from('staffs')
            .update(data)
            .eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        throw error;
    }
};

// 3. XÓA NHÂN VIÊN (Xóa cả Staff và User)
export const deleteStaff = async (staffId: string) => {
    try {
        const { data: staff } = await supabase
            .from('staffs')
            .select('user_id')
            .eq('id', staffId)
            .single();

        const linkedUserId = staff?.user_id;

        // Xóa Staff trước
        await supabase.from('staffs').delete().eq('id', staffId);

        // Xóa User sau
        if (linkedUserId) {
            await supabase.from('users').delete().eq('id', linkedUserId);
        }
        return true;
    } catch (error) {
        throw error;
    }
};

// 4. LẮNG NGHE STAFF THEO POSITION
export const subscribeToStaffByPosition = (pos: string, callback: (data: any[]) => void) => {
    const fetch = async () => {
        const { data } = await supabase
            .from('staffs')
            .select('*')
            .eq('role', pos)
            .eq('status', 'active');
        if (data) callback(data);
    };
    fetch();

    // THÊM: Math.random() để tạo tên channel duy nhất mỗi lần gọi
    const channelId = `staffs_${pos}_${Math.random().toString(36).substring(7)}`;

    return supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, fetch)
        .subscribe();
};

// 5. LẮNG NGHE STAFF FILTERED (Dùng cho operational staff)
export const subscribeToStaffsFiltered = (excludeRoles: string[], callback: (data: any[]) => void) => {
    const fetch = async () => {
        const { data } = await supabase
            .from('staffs')
            .select('*')
            .not('role', 'in', `(${excludeRoles.join(',')})`)
            .order('name', { ascending: true });
        if (data) callback(data);
    };
    fetch();

    // THÊM: Math.random() để tạo tên channel duy nhất
    const channelId = `staffs_ops_${Math.random().toString(36).substring(7)}`;

    return supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, fetch)
        .subscribe();
};

// 6. LẤY PROFILE THEO EMAIL
export const getStaffProfile = async (email: string) => {
    const { data } = await supabase
        .from('staffs')
        .select('*')
        .eq('email', email)
        .maybeSingle();
    return data;
};