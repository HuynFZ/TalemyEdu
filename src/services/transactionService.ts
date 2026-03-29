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
export const createTransactionAndUpdateContract = async (transaction: TransactionData, currentPaidAmount: number) => {
    try {
        // 1. Lưu phiếu thu vào bảng transactions
        const { error: txError } = await supabase
            .from('transactions')
            .insert([transaction]);
        
        if (txError) throw txError;

        // 2. Tính lại tổng tiền Đã thu và Cập nhật vào bảng contracts
        const newPaidAmount = currentPaidAmount + Number(transaction.amount);
        
        const { error: contractError } = await supabase
            .from('contracts')
            .update({ paid_amount: newPaidAmount })
            .eq('id', transaction.contract_id);
            
        if (contractError) throw contractError;

        return true;
    } catch (error) {
        console.error("Lỗi khi tạo phiếu thu:", error);
        throw error;
    }
};