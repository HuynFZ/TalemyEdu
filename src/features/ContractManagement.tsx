import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Eye, Download, Trash2, CheckCircle, Clock, XCircle, FileSignature, X } from 'lucide-react';
import { subscribeToContracts, ContractData, updateContractStatus, deleteContract } from '../services/contractService';

// IMPORT THƯ VIỆN XUẤT WORD
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const ContractManagement = () => {
    const [contracts, setContracts] = useState<ContractData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // State cho Modal Xem chi tiết
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToContracts(setContracts);
        return () => unsubscribe();
    }, []);

    const filteredContracts = contracts.filter(contract => {
        const matchesSearch = contract.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || contract.contractCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || contract.contractStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleStatusChange = async (id: string, newStatus: string) => {
        if (window.confirm(`Bạn muốn đổi trạng thái hợp đồng thành: ${newStatus}?`)) {
            try { await updateContractStatus(id, newStatus); }
            catch (error) { alert("Lỗi khi cập nhật!"); }
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Cảnh báo: Xóa hợp đồng không thể hoàn tác. Bạn có chắc chắn?")) {
            try { await deleteContract(id); }
            catch (error) { alert("Lỗi khi xóa!"); }
        }
    };

    // MỞ MODAL XEM
    const handleViewContract = (contract: ContractData) => {
        setSelectedContract(contract);
        setIsViewModalOpen(true);
    };

    // HÀM XUẤT FILE WORD VÀ ĐIỀN DATA
    const handleExportWord = async (contract: ContractData) => {
        try {
            const response = await fetch('/Mau_Hop_Dong.docx');
            if (!response.ok) throw new Error("Không tìm thấy file Mau_Hop_Dong.docx trong thư mục public");
            
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onload = function(event) {
                const content = event.target?.result as ArrayBuffer;
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

                const today = new Date();
                
                // LOGIC XỬ LÝ THANH TOÁN
                let firstPaymentText = '';
                let secondPaymentText = '';
                let deadlineText = '';

                if (contract.paymentMethod === '1_LẦN') {
                    // Nếu 1 lần: Đóng đủ tổng phí, 2 trường sau để trống (Không)
                    firstPaymentText = (contract.totalFee || 0).toLocaleString('vi-VN') + ' VNĐ';
                    secondPaymentText = 'Không';
                    deadlineText = 'Không';
                } else {
                    // Nếu 2 lần: Lấy dữ liệu đợt 1, đợt 2, hạn đợt 2
                    firstPaymentText = (contract.firstInstallment || 0).toLocaleString('vi-VN') + ' VNĐ';
                    secondPaymentText = (contract.secondInstallment || 0).toLocaleString('vi-VN') + ' VNĐ';
                    deadlineText = contract.secondDeadline || '...................';
                }

                // MAP TOÀN BỘ DATA VÀO BIẾN WORD
                doc.render({
                    day: today.getDate().toString().padStart(2, '0'),
                    month: (today.getMonth() + 1).toString().padStart(2, '0'),
                    year: today.getFullYear(),
                    
                    // Thông tin Học viên
                    studentName: contract.studentName || '....................',
                    studentCCCD: contract.studentCCCD || '....................',
                    studentPhone: contract.studentPhone || '....................',
                    studentAddress: contract.studentAddress || '....................',
                    
                    // Thông tin Giáo viên
                    teacherName: contract.teacherName || '....................',
                    teacherCCCD: contract.teacherCCCD || '....................',
                    teacherPhone: contract.teacherPhone || '....................',
                    teacherAddress: contract.teacherAddress || '....................',
                    
                    // Khóa học & Tiền bạc
                    courseName: contract.courseName || '....................',
                    totalSessions: contract.totalSessions || contract.courseDuration || '......',
                    sessionsPerWeek: contract.sessionsPerWeek || '......',
                    totalFee: (contract.totalFee || 0).toLocaleString('vi-VN') + ' VNĐ',
                    
                    // Thanh toán
                    firstPayment: firstPaymentText,
                    secondPayment: secondPaymentText,
                    deadlineSession: deadlineText
                });

                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                saveAs(out, `HopDong_${contract.studentName}_${contract.contractCode}.docx`);
            };

            reader.readAsArrayBuffer(blob);
        } catch (error) {
            console.error(error);
            alert("Lỗi xuất file: Vui lòng kiểm tra lại file Mau_Hop_Dong.docx đã nằm trong thư mục public chưa.");
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar">
            {/* ... (Giữ nguyên phần Header & Filter của bạn) ... */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileSignature className="text-orange-500" size={32} /> Quản lý Hợp đồng
                    </h2>
                </div>
                {/* Thanh search... */}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Mã HĐ</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Học Viên</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Khóa Học</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Học Phí</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase">Trạng Thái</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredContracts.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-medium">Chưa có hợp đồng nào.</td></tr>
                            ) : (
                                filteredContracts.map(contract => (
                                    <tr key={contract.id} className="hover:bg-slate-50/50 group transition-colors">
                                        <td className="p-5 font-bold text-slate-700">{contract.contractCode}</td>
                                        <td className="p-5">
                                            <p className="font-bold text-slate-800">{contract.studentName}</p>
                                            <p className="text-xs text-slate-500">{contract.studentPhone}</p>
                                        </td>
                                        <td className="p-5 font-bold text-slate-700 text-sm">{contract.courseName}</td>
                                        <td className="p-5 font-black text-orange-600">{(contract.totalFee || 0).toLocaleString('vi-VN')} đ</td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase border ${
                                                contract.contractStatus === 'NHÁP' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                contract.contractStatus === 'ĐANG HIỆU LỰC' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                                            }`}>
                                                {contract.contractStatus}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                
                                                {/* NÚT XEM HỢP ĐỒNG */}
                                                <button onClick={() => handleViewContract(contract)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl transition-all tooltip" title="Xem Chi Tiết">
                                                    <Eye size={16} />
                                                </button>

                                                {/* NÚT TẢI XUỐNG DOCX */}
                                                <button onClick={() => handleExportWord(contract)} className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white rounded-xl transition-all tooltip" title="Tải Word (Điền tự động)">
                                                    <Download size={16} />
                                                </button>

                                                {contract.contractStatus === 'NHÁP' && (
                                                    <button onClick={() => handleStatusChange(contract.id!, 'ĐANG HIỆU LỰC')} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all tooltip" title="Duyệt hiệu lực">
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(contract.id!)} className="p-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-xl transition-all tooltip" title="Xóa hợp đồng">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL XEM CHI TIẾT HỢP ĐỒNG */}
            {isViewModalOpen && selectedContract && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 bg-blue-500 flex items-center justify-between text-white">
                            <h2 className="text-xl font-black">Chi Tiết Hợp Đồng</h2>
                            <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                <div><p className="text-xs font-bold text-slate-400 uppercase">Mã Hợp Đồng</p><p className="font-bold text-slate-800">{selectedContract.contractCode}</p></div>
                                <div><p className="text-xs font-bold text-slate-400 uppercase">Họ và Tên Học Viên</p><p className="font-bold text-slate-800">{selectedContract.studentName}</p></div>
                                <div><p className="text-xs font-bold text-slate-400 uppercase">Khóa Học Đăng Ký</p><p className="font-bold text-slate-800">{selectedContract.courseName}</p></div>
                                <div><p className="text-xs font-bold text-slate-400 uppercase">Giảng Viên</p><p className="font-bold text-slate-800">{selectedContract.teacherName}</p></div>
                                <div><p className="text-xs font-bold text-slate-400 uppercase">Số buổi học</p><p className="font-bold text-slate-800">{selectedContract.totalSessions} buổi ({selectedContract.sessionsPerWeek} buổi/tuần)</p></div>
                                <div><p className="text-xs font-bold text-slate-400 uppercase">Tổng Học Phí</p><p className="font-black text-orange-600 text-lg">{(selectedContract.totalFee || 0).toLocaleString('vi-VN')} đ</p></div>
                                
                                <div className="col-span-2 bg-slate-50 p-4 rounded-xl mt-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Thanh toán: {selectedContract.paymentMethod === '1_LẦN' ? 'Đóng toàn bộ' : 'Chia làm 2 lần'}</p>
                                    {selectedContract.paymentMethod === '1_LẦN' ? (
                                        <p className="font-bold text-slate-700">Đã thanh toán đủ {(selectedContract.totalFee || 0).toLocaleString('vi-VN')} VNĐ</p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2 text-sm font-bold text-slate-700">
                                            <p>Đợt 1: {(selectedContract.firstInstallment || 0).toLocaleString('vi-VN')} đ</p>
                                            <p>Đợt 2: {(selectedContract.secondInstallment || 0).toLocaleString('vi-VN')} đ (Hạn: {selectedContract.secondDeadline})</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300">Đóng</button>
                            <button onClick={() => handleExportWord(selectedContract)} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2">
                                <Download size={18} /> Tải File Word
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
        </div>
    );
};

export default ContractManagement;