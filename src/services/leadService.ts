import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// 1. Cập nhật Interface: Bỏ isTestSent, thêm đếm số lần và thời gian
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
  testRemindCount?: number;     // Số lần đã gửi/nhắc lịch test
  lastTestRemindedAt?: any;     // Thời gian nhắc gần nhất
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
      testRemindCount: 0,        // Mặc định lúc tạo mới là 0
      lastTestRemindedAt: null,
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

// Hàm xử lý khi bấm Gửi/Nhắc lịch Test
export const sendTestSchedule = async (leadId: string, currentCount: number) => {
  try {
    const leadRef = doc(db, COLLECTION_NAME, leadId);
    await updateDoc(leadRef, { 
        testRemindCount: currentCount + 1,        // Tăng số lần nhắc lên 1
        lastTestRemindedAt: serverTimestamp()     // Lưu thời gian hiện tại
    });
  } catch (error) {
    console.error("Lỗi cập nhật test:", error);
    throw error;
  }
};

// Hàm cập nhật Lead
export const updateLead = async (id: string, updateData: any) => {
  try {
    const leadRef = doc(db, "leads", id);
    await updateDoc(leadRef, updateData);
  } catch (error) {
    console.error("Lỗi khi cập nhật lead:", error);
    throw error;
  }
};

// Hàm xóa Lead
export const deleteLead = async (id: string) => {
  try {
    const leadRef = doc(db, "leads", id);
    await deleteDoc(leadRef);
  } catch (error) {
    console.error("Lỗi khi xóa lead:", error);
    throw error;
  }
};