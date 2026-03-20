import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export interface ContractData {
    id?: string;
    contractCode: string;
    studentId: string;
    teacherId: string;
    studentName: string;
    studentCCCD: string;
    studentPhone: string;
    studentAddress: string;
    teacherName: string;
    teacherCCCD: string;
    teacherPhone: string;
    teacherAddress: string;
    courseName: string;
    classId: string;           // THÊM: ID lớp học
    className: string;         // THÊM: Tên lớp học
    courseDuration: number;
    totalSessions: number;     
    sessionsPerWeek: string;   
    totalFee: number;
    paidAmount: number;
    paymentMethod: '1_LẦN' | '2_LẦN';
    firstInstallment: number;
    secondInstallment: number;
    secondDeadline: string;
    contractStatus: string; 
    note: string;
    createdAt?: any;
}

const COLLECTION_NAME = "contracts";

export const createContract = async (data: Omit<ContractData, 'id' | 'createdAt'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) { throw error; }
};

export const subscribeToContracts = (callback: (contracts: ContractData[]) => void) => {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContractData[];
        callback(data);
    });
};

export const updateContractStatus = async (id: string, status: string) => {
    try {
        const contractRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(contractRef, { contractStatus: status });
    } catch (error) { throw error; }
};

export const deleteContract = async (id: string) => {
    try {
        const contractRef = doc(db, COLLECTION_NAME, id);
        await deleteDoc(contractRef);
    } catch (error) { throw error; }
};