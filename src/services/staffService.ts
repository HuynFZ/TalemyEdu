import { supabase } from '../supabaseClient';

// 1. ĐỊNH NGHĨA INTERFACE DỮ LIỆU
export interface StaffData {
    id?: string;
    user_id?: string;
    name: string;
    email: string;
    phone?: string;
    cccd?: string;
    address?: string;
    role: 'admin' | 'sale' | 'finance' | 'teacher' | 'pt';
    salary?: number;
    hire_date?: string;
    bio?: string;
    status: 'active' | 'inactive';
    fixed_schedule?: any; // Dành cho giảng viên
    created_at?: string;
}

// 2. TẠO NHÂN VIÊN (Tạo Users trước -> Lấy ID tạo Staffs)
export const createStaff = async (formData: any) => {
    try {
        const email = formData.email?.toLowerCase().trim();
        const role = formData.role || formData.position || 'sale';

        // BƯỚC A: Tạo tài khoản trong bảng 'users'
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert([{
                username: email,
                password: '123456', // Mật khẩu mặc định
                role: role,
                status: 'active'
            }])
            .select()
            .single();

        if (userError) throw userError;

        // BƯỚC B: Tạo hồ sơ trong bảng 'staffs' liên kết với user_id vừa tạo
        const { data: staff, error: staffError } = await supabase
            .from('staffs')
            .insert([{
                user_id: newUser.id,
                name: formData.name,
                email: email,
                phone: formData.phone,
                address: formData.address,
                role: role,
                salary: Number(formData.salary) || 0,
                hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
                status: 'active',
                cccd: formData.cccd || '',
                bio: formData.bio || ''
            }])
            .select();

        if (staffError) throw staffError;
        return staff[0];
    } catch (error) {
        console.error("Lỗi tạo nhân viên:", error);
        throw error;
    }
};

// 3. CẬP NHẬT NHÂN VIÊN
export const updateStaff = async (id: string, data: any) => {
    try {
        const { error } = await supabase
            .from('staffs')
            .update(data)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi cập nhật nhân viên:", error);
        throw error;
    }
};

// 4. XÓA NHÂN VIÊN (Xóa hồ sơ Staff và xóa luôn tài khoản User)
export const deleteStaff = async (staffId: string) => {
    try {
        // Bước 1: Tìm user_id liên kết với nhân viên này
        const { data: staff, error: fetchError } = await supabase
            .from('staffs')
            .select('user_id')
            .eq('id', staffId)
            .single();

        if (fetchError) throw fetchError;
        const linkedUserId = staff?.user_id;

        // Bước 2: Xóa trong bảng staffs
        const { error: staffDelError } = await supabase
            .from('staffs')
            .delete()
            .eq('id', staffId);

        if (staffDelError) throw staffDelError;

        // Bước 3: Nếu có tài khoản liên kết, xóa luôn trong bảng users
        if (linkedUserId) {
            const { error: userDelError } = await supabase
                .from('users')
                .delete()
                .eq('id', linkedUserId);

            if (userDelError) throw userDelError;
        }

        return true;
    } catch (error) {
        console.error("Lỗi xóa nhân sự và tài khoản:", error);
        throw error;
    }
};

// 5. LẮNG NGHE NHÂN SỰ THEO ROLE (Dùng cho LeadManagement.tsx)
export const subscribeToStaffByPosition = (role: string, callback: (data: any[]) => void) => {
    const fetchStaffs = async () => {
        const { data, error } = await supabase
            .from('staffs')
            .select('*')
            .eq('role', role)
            .eq('status', 'active');

        if (!error && data) callback(data);
    };

    fetchStaffs();

    return supabase
        .channel(`realtime_staffs_${role}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staffs', filter: `role=eq.${role}` }, () => {
            fetchStaffs();
        })
        .subscribe();
};

// 6. LẮNG NGHE NHÂN SỰ VẬN HÀNH (Loại trừ giáo viên/PT - Dùng cho StaffManagement.tsx)
export const subscribeToStaffsFiltered = (excludeRoles: string[], callback: (data: any[]) => void) => {
    const fetch = async () => {
        const { data, error } = await supabase
            .from('staffs')
            .select('*')
            .not('role', 'in', `(${excludeRoles.join(',')})`)
            .order('name', { ascending: true });

        if (!error && data) callback(data);
    };

    fetch();

    return supabase
        .channel('staffs_operational_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staffs' }, () => {
            fetch();
        })
        .subscribe();
};

// 7. LẤY HỒ SƠ NHÂN VIÊN THEO EMAIL (Dùng cho Course.tsx / Auth)
export const getStaffProfile = async (email: string) => {
    try {
        const { data, error } = await supabase
            .from('staffs')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Lỗi lấy hồ sơ nhân viên:", error);
        return null;
    }
};