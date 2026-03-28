// --- FILE: src/services/leadService.ts ---
import { supabase } from '../supabaseClient';

// 1. Định nghĩa Interface khớp với bảng 'leads' trong Database Supabase
export interface LeadData {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
    course: string; // Tương ứng với cột course_interest hoặc tên khóa học
    source?: string;
    note?: string;
    created_at?: any;
    test_remind_count?: number;     // Số lần đã gửi/nhắc lịch test
    last_test_reminded_at?: any;    // Thời gian nhắc gần nhất
}

const TABLE_NAME = "leads";

// 2. Hàm lấy danh sách Leads Real-time
export const subscribeToLeads = (callback: (leads: LeadData[]) => void) => {
    // Lấy dữ liệu ban đầu
    const fetchInitialLeads = async () => {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            callback(data as LeadData[]);
        }
    };

    fetchInitialLeads();

    // Thiết lập kênh Realtime để lắng nghe thay đổi (INSERT, UPDATE, DELETE)
    const channel = supabase
        .channel('public:leads')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchInitialLeads(); // Load lại toàn bộ danh sách khi có bất kỳ thay đổi nào
        })
        .subscribe();

    return channel; // Trả về channel để có thể unsubscribe khi component unmount
};

// 3. Hàm tạo Lead mới
export const createLead = async (leadData: Omit<LeadData, 'id' | 'created_at'>) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([
                {
                    ...leadData,
                    test_remind_count: 0,
                    last_test_reminded_at: null,
                    // created_at sẽ được Postgres tự động điền (DEFAULT NOW())
                }
            ])
            .select();

        if (error) throw error;
        return data[0].id;
    } catch (error) {
        console.error("Lỗi khi tạo Lead:", error);
        throw error;
    }
};

// 4. Hàm cập nhật trạng thái Lead (Khi kéo thả Kanban)
export const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({ status: newStatus })
            .eq('id', leadId);

        if (error) throw error;
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái Lead:", error);
        throw error;
    }
};

// 5. Hàm xử lý khi bấm Gửi/Nhắc lịch Test
export const sendTestSchedule = async (leadId: string, currentCount: number) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update({
                test_remind_count: (currentCount || 0) + 1,
                last_test_reminded_at: new Date().toISOString()
            })
            .eq('id', leadId);

        if (error) throw error;
    } catch (error) {
        console.error("Lỗi cập nhật lịch test:", error);
        throw error;
    }
};

// 6. Hàm cập nhật thông tin Lead (Dùng trong Modal Sửa)
export const updateLead = async (id: string, updateData: Partial<LeadData>) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Lỗi khi cập nhật Lead:", error);
        throw error;
    }
};

// 7. Hàm xóa Lead
export const deleteLead = async (id: string) => {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error("Lỗi khi xóa Lead:", error);
        throw error;
    }
};