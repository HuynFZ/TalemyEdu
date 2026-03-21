import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Eye, Download, Trash2, CheckCircle, Clock, XCircle, FileSignature, X, Send, User, BookOpen, CreditCard, Calendar } from 'lucide-react'; 
import { subscribeToContracts, ContractData, updateContractStatus, deleteContract } from '../services/contractService';
import { getStudentById } from '../services/studentService';

// IMPORT THƯ VIỆN XUẤT WORD
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

const ContractManagement = () => {
    const [contracts, setContracts] = useState<ContractData[]>([]);
    
    // --- CÁC STATE CHO BỘ LỌC VÀ TÌM KIẾM ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // State cho Modal Xem chi tiết
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);

    // State loading khi đang gửi mail
    const [sendingId, setSendingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToContracts(setContracts);
        return () => unsubscribe();
    }, []);

    // --- LOGIC LỌC DỮ LIỆU ĐA LỚP ---
    const filteredContracts = contracts.filter(contract => {
        // 1. Lọc theo thanh tìm kiếm (Tên học viên hoặc Mã HĐ)
        const matchesSearch = contract.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              contract.contractCode?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // 2. Lọc theo trạng thái
        const matchesStatus = statusFilter === 'All' || contract.contractStatus === statusFilter;
        
        // 3. Lọc theo ngày tạo (Từ ngày -> Đến ngày)
        let matchesDate = true;
        if (startDate || endDate) {
            // Lấy trường ngày tạo (Giả sử bạn dùng createdAt hoặc timestamp)
            const contractTimestamp = contract.createdAt || contract.timestamp; 
            
            if (!contractTimestamp) {
                matchesDate = false; // Nếu hợp đồng không có ngày tạo thì ẩn đi khi đang bật bộ lọc ngày
            } else {
                // Chuyển đổi Firebase Timestamp thành JS Date
                const contractDate = contractTimestamp.toDate ? contractTimestamp.toDate() : new Date(contractTimestamp);
                contractDate.setHours(0, 0, 0, 0); // Đưa về 0h để so sánh chính xác theo ngày

                if (startDate) {
                    const start = new Date(startDate);
                    start.setHours(0, 0, 0, 0);
                    if (contractDate < start) matchesDate = false;
                }

                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (contractDate > end) matchesDate = false;
                }
            }
        }

        return matchesSearch && matchesStatus && matchesDate;
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

    const handleViewContract = (contract: ContractData) => {
        setSelectedContract(contract);
        setIsViewModalOpen(true);
    };

    // --- HÀM 1: XUẤT FILE WORD VÀ TẢI XUỐNG ---
    const handleExportWord = async (contract: ContractData) => {
        try {
            const response = await fetch('/Mau_Hop_Dong.docx');
            if (!response.ok) throw new Error("Không tìm thấy file Mau_Hop_Dong.docx");
            
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onload = function(event) {
                const content = event.target?.result as ArrayBuffer;
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

                const today = new Date();
                let firstPaymentText = contract.paymentMethod === '1_LẦN' ? (contract.totalFee || 0).toLocaleString('vi-VN') + ' VNĐ' : (contract.firstInstallment || 0).toLocaleString('vi-VN') + ' VNĐ';
                let secondPaymentText = contract.paymentMethod === '1_LẦN' ? 'Không' : (contract.secondInstallment || 0).toLocaleString('vi-VN') + ' VNĐ';
                let deadlineText = contract.paymentMethod === '1_LẦN' ? 'Không' : (contract.secondDeadline || '...................');

                doc.render({
                    day: today.getDate().toString().padStart(2, '0'), month: (today.getMonth() + 1).toString().padStart(2, '0'), year: today.getFullYear(),
                    studentName: contract.studentName || '...', studentCCCD: contract.studentCCCD || '...', studentPhone: contract.studentPhone || '...', studentAddress: contract.studentAddress || '...',
                    teacherName: contract.teacherName || '...', teacherCCCD: contract.teacherCCCD || '...', teacherPhone: contract.teacherPhone || '...', teacherAddress: contract.teacherAddress || '...',
                    courseName: contract.courseName || '...', totalSessions: contract.totalSessions || contract.courseDuration || '...', sessionsPerWeek: contract.sessionsPerWeek || '...', totalFee: (contract.totalFee || 0).toLocaleString('vi-VN') + ' VNĐ',
                    firstPayment: firstPaymentText, secondPayment: secondPaymentText, deadlineSession: deadlineText
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
            alert("Lỗi xuất file: Vui lòng kiểm tra file mẫu.");
        }
    };

    // --- HÀM 2: GỬI EMAIL ---
    const handleSendContractViaEmail = async (contract: ContractData) => {
        setSendingId(contract.id!); 
        let studentEmail = "";
        try {
            if (contract.studentId) {
                const studentData = await getStudentById(contract.studentId);
                if (studentData && studentData.email) studentEmail = studentData.email;
            }
        } catch (error) {
            console.error("Lỗi khi lấy email:", error);
        }

        if (!studentEmail) {
            const manualEmail = prompt(`Không tìm thấy email của ${contract.studentName}. Vui lòng nhập thủ công:`, "");
            if (!manualEmail) { setSendingId(null); return; }
            studentEmail = manualEmail;
        }

        try {
            const response = await fetch('/Mau_Hop_Dong.docx');
            if (!response.ok) throw new Error("Lỗi file mẫu");
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    const content = event.target?.result as ArrayBuffer;
                    const zip = new PizZip(content);
                    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

                    const today = new Date();
                    let firstPaymentText = contract.paymentMethod === '1_LẦN' ? (contract.totalFee || 0).toLocaleString('vi-VN') + ' VNĐ' : (contract.firstInstallment || 0).toLocaleString('vi-VN') + ' VNĐ';
                    let secondPaymentText = contract.paymentMethod === '1_LẦN' ? 'Không' : (contract.secondInstallment || 0).toLocaleString('vi-VN') + ' VNĐ';
                    let deadlineText = contract.paymentMethod === '1_LẦN' ? 'Không' : (contract.secondDeadline || '...');

                    doc.render({
                        day: today.getDate().toString().padStart(2, '0'), month: (today.getMonth() + 1).toString().padStart(2, '0'), year: today.getFullYear(),
                        studentName: contract.studentName || '...', studentCCCD: contract.studentCCCD || '...', studentPhone: contract.studentPhone || '...', studentAddress: contract.studentAddress || '...',
                        teacherName: contract.teacherName || '...', teacherCCCD: contract.teacherCCCD || '...', teacherPhone: contract.teacherPhone || '...', teacherAddress: contract.teacherAddress || '...',
                        courseName: contract.courseName || '...', totalSessions: contract.totalSessions || contract.courseDuration || '...', sessionsPerWeek: contract.sessionsPerWeek || '...', totalFee: (contract.totalFee || 0).toLocaleString('vi-VN') + ' VNĐ',
                        firstPayment: firstPaymentText, secondPayment: secondPaymentText, deadlineSession: deadlineText
                    });

                    const out = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
                    const base64Reader = new FileReader();
                    base64Reader.readAsDataURL(out);
                    base64Reader.onloadend = async () => {
                        const base64data = base64Reader.result;
                        const apiResponse = await fetch('http://localhost:3001/api/send-contract', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ studentEmail, studentName: contract.studentName, contractCode: contract.contractCode, fileBase64: base64data })
                        });
                        const result = await apiResponse.json();
                        if (result.success) alert(`Đã gửi thành công đến: ${studentEmail}!`);
                        else alert(`Gửi thất bại: ${result.error}`);
                        setSendingId(null); 
                    };
                } catch (err) { alert("Lỗi tạo file"); setSendingId(null); }
            };
            reader.readAsArrayBuffer(blob);
        } catch (error) { alert("Lỗi hệ thống"); setSendingId(null); }
    };

    // Hàm format hiển thị ngày trên bảng
    const displayDate = (timestamp: any) => {
        if (!timestamp) return '--/--/----';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 relative overflow-y-auto custom-scrollbar">
            
            {/* --- KHU VỰC HEADER VÀ CÁC BỘ LỌC TÌM KIẾM --- */}
            <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <FileSignature className="text-orange-500" size={32} /> Quản lý hợp đồng
                    </h2>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-3 w-full 2xl:w-auto items-stretch lg:items-center">
                    
                    {/* 1. Thanh tìm kiếm */}
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tên học viên, Mã HĐ..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium transition-all shadow-sm" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    
                    {/* 2. Bộ lọc Ngày (Từ ngày - Đến ngày) */}
                    <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-1 gap-2">
                        <Calendar size={16} className="text-slate-400 shrink-0" />
                        <div className="flex items-center gap-1.5">
                            <input 
                                type="date" 
                                className="outline-none text-sm font-medium text-slate-600 bg-transparent w-auto"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                title="Từ ngày"
                            />
                            <span className="text-slate-300">-</span>
                            <input 
                                type="date" 
                                className="outline-none text-sm font-medium text-slate-600 bg-transparent w-auto"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                title="Đến ngày"
                            />
                        </div>
                        {/* Nút xóa bộ lọc ngày nhanh */}
                        {(startDate || endDate) && (
                            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-500 transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* 3. Bộ lọc Trạng thái */}
                    <div className="relative w-full lg:w-48 shrink-0">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            className="w-full pl-10 pr-8 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 font-bold text-slate-700 cursor-pointer text-sm shadow-sm appearance-none" 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Tất cả trạng thái</option>
                            <option value="NHÁP">Nháp</option>
                            <option value="ĐANG HIỆU LỰC">Hiệu lực</option>
                            <option value="HOÀN THÀNH">Hoàn thành</option>
                            <option value="ĐÃ HỦY">Đã hủy</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                </div>
            </div>

            {/* BẢNG DANH SÁCH */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col max-h-[70vh]">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr className="border-b border-slate-100">
                                <th className="p-5 text-xs font-black text-slate-400 uppercase whitespace-nowrap">Mã HĐ</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase whitespace-nowrap">Học Viên</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase min-w-[150px]">Khóa Học</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase whitespace-nowrap">Ngày Tạo</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase whitespace-nowrap">Trạng Thái</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center whitespace-nowrap">Gửi Hợp Đồng</th>
                                <th className="p-5 text-xs font-black text-slate-400 uppercase text-center whitespace-nowrap">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredContracts.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-50">
                                        <FileText size={48} className="text-slate-400 mb-3" />
                                        <p className="text-slate-500 font-bold text-lg">Không tìm thấy hợp đồng nào</p>
                                        <p className="text-slate-400 text-sm mt-1">Hãy thử thay đổi điều kiện lọc hoặc tìm kiếm nhé!</p>
                                    </div>
                                </td></tr>
                            ) : (
                                filteredContracts.map(contract => (
                                    <tr key={contract.id} className="hover:bg-slate-50/50 group transition-colors">
                                        <td className="p-5 font-bold text-slate-700">{contract.contractCode}</td>
                                        <td className="p-5 min-w-[150px]">
                                            <p className="font-bold text-slate-800">{contract.studentName}</p>
                                            <p className="text-xs text-slate-500">{contract.studentPhone}</p>
                                        </td>
                                        <td className="p-5 font-bold text-slate-700 text-sm">
                                            <p>{contract.courseName}</p>
                                            <p className="text-xs text-orange-600 font-black mt-1">{(contract.totalFee || 0).toLocaleString('vi-VN')} đ</p>
                                        </td>
                                        <td className="p-5 font-bold text-slate-500 text-sm whitespace-nowrap">
                                            {displayDate(contract.createdAt || contract.timestamp)}
                                        </td>
                                        <td className="p-5 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase border ${
                                                contract.contractStatus === 'NHÁP' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                contract.contractStatus === 'ĐANG HIỆU LỰC' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                                            }`}>
                                                {contract.contractStatus}
                                            </span>
                                        </td>
                                        
                                        <td className="p-5 text-center">
                                            <button 
                                                onClick={() => handleSendContractViaEmail(contract)}
                                                disabled={sendingId === contract.id}
                                                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 mx-auto transition-all shadow-sm ${
                                                    sendingId === contract.id 
                                                    ? 'bg-slate-100 text-slate-400 cursor-wait' 
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-100 hover:border-blue-500'
                                                }`}
                                            >
                                                <Send size={14} /> {sendingId === contract.id ? 'Đang gửi...' : 'Gửi Email'}
                                            </button>
                                        </td>

                                        <td className="p-5">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleViewContract(contract)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-500 hover:text-white rounded-xl transition-all tooltip" title="Xem Chi Tiết">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => handleExportWord(contract)} className="p-2 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white rounded-xl transition-all tooltip" title="Tải Word">
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

            {/* MODAL XEM CHI TIẾT HỢP ĐỒNG (GIỮ NGUYÊN CODE BÊN TRONG CỦA BẠN) */}
            {isViewModalOpen && selectedContract && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 bg-blue-500 flex items-center justify-between text-white">
                            <h2 className="text-xl font-black flex items-center gap-2">
                                <FileSignature size={24} /> Chi Tiết Hợp Đồng: {selectedContract.contractCode}
                            </h2>
                            <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
                            {/* Thông tin học viên */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User size={16}/> Thông Tin Học Viên</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><p className="text-xs text-slate-500 mb-1">Họ và tên</p><p className="font-bold text-slate-800">{selectedContract.studentName}</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">Số điện thoại</p><p className="font-bold text-slate-800">{selectedContract.studentPhone}</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">CCCD/CMND</p><p className="font-bold text-slate-800">{selectedContract.studentCCCD || 'Chưa cập nhật'}</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">Địa chỉ</p><p className="font-bold text-slate-800">{selectedContract.studentAddress || 'Chưa cập nhật'}</p></div>
                                </div>
                            </div>

                            {/* Thông tin giáo viên */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><User size={16}/> Thông Tin Giáo Viên</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><p className="text-xs text-slate-500 mb-1">Họ và tên</p><p className="font-bold text-slate-800">{selectedContract.teacherName}</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">Số điện thoại</p><p className="font-bold text-slate-800">{selectedContract.teacherPhone}</p></div>
                                </div>
                            </div>

                            {/* Thông tin khóa học & Thanh toán */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><BookOpen size={16}/> Khóa Học & Thanh Toán</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div><p className="text-xs text-slate-500 mb-1">Tên khóa học</p><p className="font-bold text-orange-600">{selectedContract.courseName}</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">Tổng thời lượng</p><p className="font-bold text-slate-800">{selectedContract.totalSessions || selectedContract.courseDuration} buổi</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">Tổng học phí</p><p className="font-black text-emerald-600 text-lg">{(selectedContract.totalFee || 0).toLocaleString('vi-VN')} VNĐ</p></div>
                                    <div><p className="text-xs text-slate-500 mb-1">Phương thức đóng</p><p className="font-bold text-slate-800">{selectedContract.paymentMethod}</p></div>
                                </div>
                                
                                {selectedContract.paymentMethod !== '1_LẦN' && (
                                    <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                        <h4 className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-2"><CreditCard size={14}/> Chi tiết trả góp</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm font-bold text-orange-700">
                                            <p>Đợt 1: {(selectedContract.firstInstallment || 0).toLocaleString('vi-VN')} đ</p>
                                            <p>Đợt 2: {(selectedContract.secondInstallment || 0).toLocaleString('vi-VN')} đ <br/><span className="text-xs font-normal">(Hạn: {selectedContract.secondDeadline})</span></p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Đóng</button>
                            <button onClick={() => handleExportWord(selectedContract)} className="px-6 py-2 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 flex items-center gap-2 transition-colors">
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