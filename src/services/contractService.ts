// src/services/contractService.ts
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Đảm bảo đường dẫn này đúng với project của bạn

export interface ContractData {
  id?: string;
  leadId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  course: string;
  contractCode: string;
  totalFee: number;
  actualFee: number;
  paymentStatus: string;
  contractStatus: string;
  contractFileUrl?: string;
  createdAt?: any;
  note?: string;
}

const COLLECTION_NAME = "contracts";

// Hàm lấy danh sách hợp đồng (Lắng nghe realtime)
export const subscribeToContracts = (callback: (contracts: ContractData[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContractData[];
    callback(data);
  });
};

// Hàm tạo hợp đồng mới
export const createContract = async (contractData: Omit<ContractData, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...contractData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Lỗi tạo hợp đồng:", error);
    throw error;
  }
};