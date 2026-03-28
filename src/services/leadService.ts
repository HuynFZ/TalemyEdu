// --- FILE: src/services/leadService.ts ---
import { supabase } from '../supabaseClient';

export interface LeadData {
    id?: string;
    name: string;
    phone: string;
    email?: string;
    course_id?: string | null;   
    assigned_to?: string | null; 
    status: string;
    test_remind_count?: number;     
    last_test_reminded_at?: string | null; 
    source?: string;
    note?: string;
    created_at?: string;
}

const TABLE_NAME = "leads";

export const subscribeToLeads = (callback: (leads: LeadData[]) => void) => {
    const fetchInitialLeads = async () => {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            callback(data as LeadData[]);
        } else {
            console.error("Lỗi khi tải danh sách Leads:", error);
        }
    };

    fetchInitialLeads();

    const channel = supabase
        .channel('public_leads_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, () => {
            fetchInitialLeads();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const createLead = async (leadData: Omit<LeadData, 'id' | 'created_at'>) => {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([{
                ...leadData,
                test_remind_count: 0,
                last_test_reminded_at: null
            }])
            .select();

        if (error) throw error;
        return data[0].id;
    } catch (error) {
        console.error("Lỗi khi tạo Lead:", error);
        throw error;
    }
};

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