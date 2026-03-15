import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

// 1. Thêm isTestSent vào Interface
export interface LeadData {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  status: string; 
  course: string;
  source?: string;
  note?: string;
  create_at?: any;
  isTestSent?: boolean; // THÊM DÒNG NÀY: Để biết đã gửi test hay chưa
}

const COLLECTION_NAME = "leads";

export const subscribeToLeads = (callback: (leads: LeadData[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy("create_at", "desc"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LeadData[];
    callback(data);
  });
};

export const createLead = async (leadData: Omit<LeadData, 'id' | 'create_at'>) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...leadData,
      isTestSent: false, // Mặc định khi tạo mới là chưa gửi
      create_at: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateLeadStatus = async (leadId: string, newStatus: string) => {
  try {
    const leadRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(leadRef, { status: newStatus });
  } catch (error) {
    throw error;
  }
};

// THÊM HÀM NÀY: Hàm đánh dấu là đã gửi test
export const markTestAsSent = async (leadId: string) => {
  try {
    const leadRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(leadRef, { isTestSent: true });
  } catch (error) {
    console.error("Lỗi cập nhật test:", error);
    throw error;
  }
};