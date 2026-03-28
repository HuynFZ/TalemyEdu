// --- FILE: src/services/contractService.ts ---
import { supabase } from '../supabaseClient';

export interface ContractData {
    id?: string;
    contract_code: string; // Chuyển sang snake_case để khớp với SQL
    student_id: string;
    teacher_id: string;
    student_name?: string;     // Lấy từ bảng students qua join
    student_phone?: string;    // Lấy từ bảng students qua join
    teacher_name?: string;     // Lấy từ bảng staffs qua join
    course_name: string;
    class_id: string;
    class_name?: string;
    course_duration: number;
    total_sessions: number;
    sessions_per_week: string;
    total_fee: number;
    paid_amount: number;
    payment_method: '1_LẦN' | '2_LẦN';
    first_installment: number;
    second_installment: number;
    second_deadline: string;
    contract_status: string;
    note: string;
    created_at?: any;
}

const TABLE_NAME = "contracts";

// 1. Tạo hợp đồng mới
export const createContract = async (data: Omit<ContractData, 'id' | 'created_at'>) => {
    try {
        const { data: insertedData, error } = await supabase
            .from(TABLE_NAME)
            .insert([data])
            .select();

        if (error) throw error;
        return insertedData[0].id;
    } catch (error) {
        console.error("Lỗi khi tạo hợp đồng:", error);
        throw error;
    }
};

// 2. Lắng nghe danh sách hợp đồng Real-time (Kèm Join dữ liệu)
export const subscribeToContracts = (callback: (contracts: any[]) => void) => {
    // Hàm fetch dữ liệu kèm thông tin học viên và giáo viên
    const fetchFullData = async () => {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                *,
                students (full_name, phone),
                staffs (name)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Map lại dữ liệu để giữ tương thích với UI cũ (nếu UI dùng studentName thay vì students.full_name)
            const formattedData = data.map(item => ({
                ...item,
                studentName: item.students?.full_name,
                studentPhone: item.students?.phone,
                teacherName: item.staffs?.name
            }));
            callback(formattedData);
        }
    };

    // Gọi lần đầu
    fetchFullData();

    // Thiết lập Realtime
    return supabase
        .channel('public:contracts')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchFullData();
        })
        .subscribe();
};

// 3. Cập nhật trạng thái hợp đồng
export const updateContractStatus = async (id: string, status: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ contract_status: status })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái:", error);
        throw error;
    }
};

// 4. Xóa hợp đồng
export const deleteContract = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Lỗi khi xóa hợp đồng:", error);
        throw error;
    }
};