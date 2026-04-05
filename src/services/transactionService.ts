// --- FILE: src/services/transactionService.ts ---
import { supabase } from '../supabaseClient';

export interface TransactionData {
    id?: string;
    contract_id: string;
    amount: number;
    payment_method: string;
    transaction_date?: string;
    note?: string;
    status?: string;
    created_at?: string;
    order_code?: number;
}

// Lấy danh sách phiếu thu của 1 hợp đồng
export const getTransactionsByContractId = async (contractId: string) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('contract_id', contractId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as TransactionData[];
    } catch (error) {
        console.error("Lỗi khi lấy lịch sử thu tiền:", error);
        throw error;
    }
};

// Tạo phiếu thu MỚI và tự động CỘNG DỒN tiền vào Hợp đồng
// Trong src/services/transactionService.ts
export const createTransactionAndUpdateContract = async (transaction: TransactionData, currentPaidAmount: number) => {
    try {
        const { error: txError } = await supabase.from('transactions').insert([transaction]);
        if (txError) throw txError;

        // CHỈ CỘNG TIỀN VÀO HỢP ĐỒNG NẾU TRẠNG THÁI LÀ THANH_CONG
        if (transaction.status === 'THANH_CONG') {
            const newPaidAmount = currentPaidAmount + Number(transaction.amount);
            const { error: contractError } = await supabase.from('contracts')
                .update({ paid_amount: newPaidAmount }).eq('id', transaction.contract_id);
            if (contractError) throw contractError;
        }
        return true;
    } catch (error) { throw error; }
};

// Hàm xác nhận thu tiền thủ công (chuyển từ PENDING -> THANH_CONG)
export const confirmTransactionSuccess = async (transaction: TransactionData, currentContractPaidAmount: number) => {
    try {
        // 1. Đổi trạng thái phiếu thu thành THANH_CONG
        const { error: txError } = await supabase.from('transactions')
            .update({ status: 'THANH_CONG' })
            .eq('id', transaction.id);
            
        if (txError) throw txError;

        // 2. Cộng tiền vào hợp đồng
        const newPaidAmount = currentContractPaidAmount + Number(transaction.amount);
        const { error: contractError } = await supabase.from('contracts')
            .update({ paid_amount: newPaidAmount })
            .eq('id', transaction.contract_id);
            
        if (contractError) throw contractError;

        return true;
    } catch (error) {
        console.error("Lỗi khi xác nhận thanh toán:", error);
        throw error;
    }
};