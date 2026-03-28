// --- FILE: src/services/contractService.ts ---
import { supabase } from '../supabaseClient';

// 1. Định nghĩa Interface chuẩn hóa
export interface ContractData {
    id?: string;
    contract_code: string; 
    student_id: string;
    class_id: string;
    total_fee: number;
    paid_amount: number;
    payment_method: string; // '1_LAN' | '2_LAN'
    first_installment: number;
    second_installment: number;
    second_deadline?: string | null;
    status: string;
    note?: string;
    created_at?: string;

    // --- CÁC TRƯỜNG DỮ LIỆU ĐƯỢC JOIN TỪ BẢNG KHÁC (Dùng để hiển thị lên UI) ---
    student_name?: string;
    student_phone?: string;
    student_cccd?: string;
    class_name?: string;
    course_name?: string;
    teacher_name?: string;
}

const TABLE_NAME = "contracts";

// 2. Lấy danh sách hợp đồng (Kèm theo JOIN dữ liệu siêu mượt của Supabase)
export const subscribeToContracts = (callback: (contracts: ContractData[]) => void) => {
    const fetchContracts = async () => {
        // Cú pháp JOIN xuyên 4 bảng: Hợp đồng -> Học viên & Lớp học -> Khóa học & Giáo viên
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(`
                *,
                student:students ( full_name, phone, cccd ),
                class:classes ( 
                    name, 
                    course:courses ( name ),
                    teacher:staffs!teacher_id ( name )
                )
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Ép phẳng (Flatten) dữ liệu để Giao diện (UI) cũ của bạn vẫn dùng bình thường mà không cần sửa code
            const formattedData = data.map((item: any) => ({
                id: item.id,
                contract_code: item.contract_code,
                student_id: item.student_id,
                class_id: item.class_id,
                total_fee: item.total_fee,
                paid_amount: item.paid_amount,
                payment_method: item.payment_method,
                first_installment: item.first_installment,
                second_installment: item.second_installment,
                second_deadline: item.second_deadline,
                status: item.status,
                note: item.note,
                created_at: item.created_at,
                // Dữ liệu được bóc tách từ lệnh JOIN:
                student_name: item.student?.full_name || 'Không xác định',
                student_phone: item.student?.phone || '',
                student_cccd: item.student?.cccd || '',
                class_name: item.class?.name || 'Không xác định',
                course_name: item.class?.course?.name || 'Không xác định',
                teacher_name: item.class?.teacher?.name || 'Không xác định'
            })) as ContractData[];

            callback(formattedData);
        } else {
            console.error("Lỗi khi tải danh sách hợp đồng:", error);
        }
    };

    fetchContracts();

    const channel = supabase
        .channel('public_contracts_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchContracts();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// 3. Tạo hợp đồng mới
// Sử dụng kiểu 'any' đầu vào tạm thời để tương thích với hàm createContract cũ đang truyền thừa rất nhiều trường
// 1. Tạo hợp đồng mới
// 3. Tạo hợp đồng mới
export const createContract = async (data: any) => {
    try {
        const safeNumber = (val: any) => {
            const num = Number(val);
            return isNaN(num) ? 0 : num;
        };

        const insertData = {
            contract_code: data.contract_code || data.contractCode || `HĐ${Date.now().toString().slice(-6)}`,
            student_id: data.student_id || data.studentId,
            class_id: data.class_id || data.classId,
            total_fee: safeNumber(data.total_fee || data.totalFee),
            paid_amount: safeNumber(data.paid_amount || data.paidAmount),
            payment_method: data.payment_method || data.paymentMethod || '1_LẦN',
            first_installment: safeNumber(data.first_installment || data.firstInstallment),
            second_installment: safeNumber(data.second_installment || data.secondInstallment),
            // Xử lý an toàn: nếu ngày hạn rỗng thì đẩy lên null
            second_deadline: data.second_deadline || data.secondDeadline || null, 
            
            // LỖI Ở ĐÂY ĐÃ ĐƯỢC SỬA: Đổi contract_status thành status cho khớp với SQL
            status: data.status || data.contract_status || 'NHÁP', 
            
            note: data.note || ''
        };

        const { data: insertedData, error } = await supabase
            .from('contracts')
            .insert([insertData])
            .select();

        if (error) {
            console.error("Lỗi chi tiết từ Supabase:", error);
            throw error;
        }
        return insertedData[0].id;
    } catch (error) {
        console.error("Lỗi khi tạo hợp đồng:", error);
        throw error;
    }
};

// 4. Cập nhật trạng thái hợp đồng
export const updateContractStatus = async (id: string, newStatus: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái:", error);
        throw error;
    }
};

// 5. Xóa hợp đồng
export const deleteContract = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Lỗi khi xóa hợp đồng:", error);
        throw error;
    }
};