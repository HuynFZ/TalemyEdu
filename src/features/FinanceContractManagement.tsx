// --- FILE: src/pages/FinanceContractManagement.tsx ---
import React, { useState, useEffect } from 'react';
import { Search, Filter, FileText, Eye, Download, Trash2, CheckCircle, Clock, XCircle, FileSignature, X, Send, User, BookOpen, CreditCard, Calendar, TrendingUp, AlertCircle, Wallet, Receipt, History, Plus, QrCode, MessageCircle, Loader2 } from 'lucide-react'; 
import { subscribeToContracts, ContractData, updateContractStatus, deleteContract } from '../services/contractService';
import { getStudentById } from '../services/studentService';
import { getTransactionsByContractId, createTransactionAndUpdateContract, TransactionData } from '../services/transactionService';
import { confirmTransactionSuccess } from '../services/transactionService'; 
// Thêm state này dưới dòng: const [txCode, setTxCode] = useState('');
// IMPORT THƯ VIỆN XUẤT WORD
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

import { supabase } from '../supabaseClient'; // Đảm bảo đường dẫn này đúng với project của bạn
// ==========================================
// CẤU HÌNH TÀI KHOẢN NGÂN HÀNG CỦA TRUNG TÂM
// ==========================================


const BANK_CONFIG = {
    BANK_ID: 'BIDV', // Mã ngân hàng (VD: MB, VCB, TCB, ACB...)
    ACCOUNT_NO: '8890098771', // Số tài khoản
    ACCOUNT_NAME: 'TRUNG TAM DAO TAO ANH NGU TALEMY', // Tên chủ tài khoản (viết không dấu)
    TEMPLATE: 'compact2' // Giao diện QR
};

const FinanceContractManagement = () => {
    const [contracts, setContracts] = useState<ContractData[]>([]);
    
    // --- CÁC STATE CHO BỘ LỌC VÀ TÌM KIẾM ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // State cho Modal Xem chi tiết
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<ContractData | null>(null);

    // --- STATE CHO MODAL LẬP PHIẾU THU (NÂNG CẤP LUỒNG 3 BƯỚC) ---
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    
    // Bước 0: Chưa làm gì | Bước 1: Form nhập số tiền | Bước 2: Hiện QR chờ thanh toán
    const [addingStep, setAddingStep] = useState<0 | 1 | 2>(0);
    
    const [newTxAmount, setNewTxAmount] = useState('');
    const [newTxMethod, setNewTxMethod] = useState('CHUYEN_KHOAN');
    const [newTxNote, setNewTxNote] = useState('');
    // Thêm state này dưới dòng: const [txCode, setTxCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // State tạo mã QR
    const [txCode, setTxCode] = useState('');

    // State loading khi đang gửi mail
    const [sendingId, setSendingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToContracts((data) => {
            setContracts(data);
        });
        return () => unsubscribe();
    }, []);

    // --- LOGIC TRẠNG THÁI KẾ TOÁN THÔNG MINH ---
    const getAccountingStatus = (contract: ContractData) => {
        if (contract.status === 'NHÁP' || contract.status === 'ĐÃ HỦY') return contract.status;
        
        const debt = contract.total_fee - (contract.paid_amount || 0);
        if (debt <= 0) return 'HOÀN TẤT';
        
        if (contract.second_deadline) {
            const deadline = new Date(contract.second_deadline);
            const today = new Date();
            // Đặt giờ về 0 để so sánh ngày chính xác
            deadline.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            
            const diffTime = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            
            if (diffTime < 0) return 'QUÁ HẠN';
            if (diffTime <= 3) return 'SẮP TỚI HẠN';
        }
        return 'ĐANG NỢ';
    };

    // --- TÍNH TOÁN DỮ LIỆU DASHBOARD KẾ TOÁN ---
    const dashboardStats = contracts.reduce((acc, contract) => {
        if (contract.status === 'ĐÃ HỦY' || contract.status === 'NHÁP') return acc;
        
        const debt = contract.total_fee - (contract.paid_amount || 0);
        const accStatus = getAccountingStatus(contract);

        acc.totalCollected += (contract.paid_amount || 0);
        
        if (accStatus === 'QUÁ HẠN') {
            acc.overdueDebt += debt;
        } else if (accStatus === 'ĐANG NỢ' || accStatus === 'SẮP TỚI HẠN') {
            acc.expectedCollection += debt;
        }
        
        return acc;
    }, { totalCollected: 0, expectedCollection: 0, overdueDebt: 0 });

    // --- BỘ LỌC DỮ LIỆU ---
    const filteredContracts = contracts.filter(contract => {
        const matchesSearch = 
            contract.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.student_phone?.includes(searchTerm) ||
            contract.contract_code?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const accStatus = getAccountingStatus(contract);
        const matchesStatus = statusFilter === 'All' || accStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Hàm render màu sắc cho trạng thái
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'HOÀN TẤT':
                return <span className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded-full text-[10px] flex items-center gap-1 w-max"><CheckCircle size={12}/> HOÀN TẤT</span>;
            case 'QUÁ HẠN':
                return <span className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full text-[10px] flex items-center gap-1 w-max"><XCircle size={12}/> QUÁ HẠN NỢ</span>;
            case 'SẮP TỚI HẠN':
                return <span className="px-3 py-1 bg-orange-100 text-orange-700 font-bold rounded-full text-[10px] flex items-center gap-1 w-max"><Clock size={12}/> SẮP TỚI HẠN</span>;
            case 'ĐANG NỢ':
                return <span className="px-3 py-1 bg-blue-100 text-blue-700 font-bold rounded-full text-[10px] flex items-center gap-1 w-max"><Clock size={12}/> ĐANG NỢ</span>;
            case 'NHÁP':
                return <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-[10px] flex items-center gap-1 w-max"><FileSignature size={12}/> NHÁP</span>;
            case 'ĐÃ HỦY':
                return <span className="px-3 py-1 bg-slate-200 text-slate-500 font-bold rounded-full text-[10px] flex items-center gap-1 w-max"><Trash2 size={12}/> ĐÃ HỦY</span>;
            default:
                return <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-full text-[10px] flex items-center gap-1 w-max">{status}</span>;
        }
    };

    // --- MỞ MODAL & LẤY LỊCH SỬ THU TIỀN ---
    const handleOpenReceiptModal = async (contract: ContractData) => {
        setSelectedContract(contract);
        setIsReceiptModalOpen(true);
        setAddingStep(0); 
        setNewTxAmount('');
        
        try {
            const txs = await getTransactionsByContractId(contract.id!);
            setTransactions(txs);
        } catch (error) {
            console.error(error);
        }
    };

    // --- HÀM BẮT ĐẦU LẬP PHIẾU (ĐỂ TỰ ĐỘNG GEN MÃ VÀ BẬT FORM) ---
    const handleStartAddingTx = () => {
        if (!selectedContract) return;
        const debt = selectedContract.total_fee - (selectedContract.paid_amount || 0);
        const code = `PT${Math.floor(10000 + Math.random() * 90000)}`; // Sinh mã 5 số
        setNewTxAmount(debt.toString());
        setTxCode(code);
        setNewTxNote(`Thu tien HD ${selectedContract.contract_code}`);
        setAddingStep(1); // Mở form nhập tiền
    };

    // --- HÀM TẠO ẢNH VIETQR ---
    const generateVietQRUrl = () => {
        const amount = Number(newTxAmount) || 0;
        const addInfo = `${txCode}`.replace(/ /g, '%20'); 
        return `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${amount}&addInfo=${addInfo}&accountName=${BANK_CONFIG.ACCOUNT_NAME}`;
    };

    // --- HÀM MỞ ZALO VÀ CHÈN TIN NHẮN ---
    const handleSendZalo = () => {
        if (!selectedContract) return;
        let phone = selectedContract.student_phone || '';
        if (phone.startsWith('0')) phone = '84' + phone.slice(1);

        const msg = `Chào ${selectedContract.student_name}, trung tâm gửi bạn thông tin thanh toán.\n- Số tiền: ${formatCurrency(Number(newTxAmount || 0))}\n- Nội dung chuyển khoản: ${txCode}\n\nBạn lưu ảnh QR lại và quét bằng App Ngân hàng nhé!`;
        window.open(`https://zalo.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCreateAndSendZalo = async () => {
    if (!newTxAmount || isNaN(Number(newTxAmount)) || Number(newTxAmount) <= 0) {
        alert("Vui lòng nhập số tiền hợp lệ!");
        return;
    }
    if (!selectedContract) return;

    setIsProcessing(true);

    try {
        if (newTxMethod === 'TIEN_MAT') {
            // Giữ nguyên logic TIEN_MAT của bạn
            const newTx: TransactionData = {
                contract_id: selectedContract.id!,
                amount: Number(newTxAmount),
                payment_method: newTxMethod,
                note: newTxNote,
                status: 'THANH_CONG' 
            };
            await createTransactionAndUpdateContract(newTx, selectedContract.paid_amount || 0);
            alert("Đã thu tiền mặt thành công!");
        } else {
            // 🚀 LUỒNG CHUYỂN KHOẢN PAYOS TỰ ĐỘNG
            const numericOrderCode = Number(String(Date.now()).slice(-6));

            // 1. Tạo bản ghi PENDING vào Supabase trước để Webhook có cái mà đối soát
            const { error: insertErr } = await supabase.from('transactions').insert([{
                contract_id: selectedContract.id!,
                amount: Number(newTxAmount),
                payment_method: 'CHUYEN_KHOAN',
                note: newTxNote,
                status: 'PENDING',
                order_code: numericOrderCode
            }]);

            if (insertErr) throw insertErr;

            // 2. Gọi Backend lấy link PayOS
            const response = await fetch('http://localhost:3001/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(newTxAmount), // Đảm bảo là Number
                    description: `HOC PHI ${numericOrderCode}`, // Không dấu, < 25 ký tự 
                    orderCode: numericOrderCode
                })
            });

            const result = await response.json();

            if (result.success) {
                const checkoutUrl = result.data.checkoutUrl;
                let phone = selectedContract.student_phone || '';
                if (phone.startsWith('0')) phone = '84' + phone.slice(1);

                // 1. Tạo nội dung tin nhắn
                const msg = `🌟 [TALEMY ENGLISH] THÔNG BÁO THANH TOÁN\n` +
                            `Chào ${selectedContract.student_name}, trung tâm gửi bạn link thanh toán học phí.\n` +
                            `💰 Số tiền: ${formatCurrency(Number(newTxAmount))}\n` +
                            `👉 Bấm vào link để lấy mã QR: ${checkoutUrl}\n\n` +
                            `(Hệ thống sẽ tự động cập nhật khi bạn hoàn tất)`;

                // 2. TỰ ĐỘNG COPY TIN NHẮN VÀO BỘ NHỚ (CLIPBOARD)
                try {
                    await navigator.clipboard.writeText(msg);
                    // Bạn có thể thêm một cái thông báo nhỏ ở đây
                    console.log("Đã copy tin nhắn vào bộ nhớ tạm");
                } catch (err) {
                    console.error("Không thể copy tin nhắn", err);
                }

                // 3. MỞ TRANG THANH TOÁN PAYOS CHO KẾ TOÁN XEM
                window.open(checkoutUrl, '_blank');

                // 4. MỞ ZALO (Lúc này App Zalo sẽ bật lên)
                // Bạn có thể dùng link rút gọn này để App Zalo bắt nhanh hơn
                window.open(`https://zalo.me/${phone}`, '_blank');
                
                alert("Đã copy tin nhắn! Hãy dán (Ctrl+V) vào Zalo học viên.");
            }
        }

        // Tải lại lịch sử giao dịch
        const txs = await getTransactionsByContractId(selectedContract.id!);
        setTransactions(txs);
        setAddingStep(0);
        
    } catch (error) {
        console.error('Lỗi luồng thanh toán:', error);
        alert("Lỗi hệ thống, vui lòng kiểm tra console!");
    } finally {
        setIsProcessing(false);
    }
};

    // --- HÀM XUẤT WORD ---
    const handleExportWord = async (contract: ContractData) => {
        try {
            const response = await fetch('/mau_hop_dong.docx');
            const blob = await response.blob();
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const content = event.target?.result as ArrayBuffer;
                const zip = new PizZip(content);
                const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

                doc.render({
                    contract_code: contract.contract_code,
                    student_name: contract.student_name || '',
                    student_phone: contract.student_phone || '',
                    student_cccd: contract.student_cccd || '',
                    course_name: contract.course_name || '',
                    class_name: contract.class_name || '',
                    total_fee: formatCurrency(contract.total_fee),
                    payment_method: contract.payment_method === '1_LAN' ? 'Đóng 1 lần' : 'Chia 2 đợt',
                    first_installment: formatCurrency(contract.first_installment || 0),
                    second_installment: formatCurrency(contract.second_installment || 0),
                    second_deadline: contract.second_deadline || 'Không có',
                    created_date: new Date(contract.created_at || '').toLocaleDateString('vi-VN')
                });

                const out = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
                saveAs(out, `HopDong_${contract.student_name}_${contract.contract_code}.docx`);
            };
            reader.readAsArrayBuffer(blob);
        } catch (error) {
            console.error("Lỗi xuất Word:", error);
            alert("Không thể xuất file Word. Vui lòng kiểm tra lại file mẫu.");
        }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) {
            await deleteContract(id);
        }
    }

    return (
        <div className="p-8 h-[100vh] overflow-y-auto custom-scrollbar bg-slate-50/50">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <FileText className="text-orange-500" size={32} />
                        Quản Lý Hợp Đồng & Công Nợ
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Theo dõi dòng tiền, trạng thái thanh toán và nhắc nợ học viên</p>
                </div>
            </div>

            {/* MINI DASHBOARD KẾ TOÁN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-green-100 shadow-sm shadow-green-100/50 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Tổng Thực Thu</p>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(dashboardStats.totalCollected)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-sm shadow-blue-100/50 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Dự Thu Sắp Tới</p>
                        <p className="text-2xl font-black text-slate-800">{formatCurrency(dashboardStats.expectedCollection)}</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm shadow-red-100/50 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                        <AlertCircle size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Nợ Quá Hạn</p>
                        <p className="text-2xl font-black text-red-600">{formatCurrency(dashboardStats.overdueDebt)}</p>
                    </div>
                </div>
            </div>

            {/* TÌM KIẾM & LỌC */}
            <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo Mã HĐ, Tên hoặc SĐT học viên..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 font-medium text-slate-700 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-xl">
                    <Filter className="text-slate-400 ml-2" size={18} />
                    <select 
                        className="bg-transparent border-none outline-none font-bold text-slate-600 pr-4 cursor-pointer"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">Tất cả trạng thái</option>
                        <option value="HOÀN TẤT">Hoàn tất (Đã thu đủ)</option>
                        <option value="ĐANG NỢ">Đang nợ (Trong hạn)</option>
                        <option value="SẮP TỚI HẠN">Sắp tới hạn (≤ 3 ngày)</option>
                        <option value="QUÁ HẠN">Quá hạn nợ</option>
                    </select>
                </div>
            </div>

            {/* MAIN TABLE KHỐI KẾ TOÁN */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-widest font-black text-slate-500">
                                <th className="p-4 whitespace-nowrap">Mã HĐ</th>
                                <th className="p-4 whitespace-nowrap">Học Viên</th>
                                <th className="p-4 whitespace-nowrap">Khóa Học</th>
                                <th className="p-4 whitespace-nowrap text-right">Tổng Phí</th>
                                <th className="p-4 whitespace-nowrap text-right text-green-600">Đã Thu</th>
                                <th className="p-4 whitespace-nowrap text-right text-red-500">Còn Nợ</th>
                                <th className="p-4 whitespace-nowrap text-center">Hạn Đợt 2</th>
                                <th className="p-4 whitespace-nowrap">Trạng Thái</th>
                                <th className="p-4 whitespace-nowrap text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredContracts.map((contract) => {
                                const debt = contract.total_fee - (contract.paid_amount || 0);
                                const currentStatus = getAccountingStatus(contract);

                                return (
                                    <tr key={contract.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-4">
                                            <span className="font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg text-xs">{contract.contract_code}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{contract.student_name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><User size={10}/> {contract.student_phone}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{contract.course_name || 'Đang cập nhật'}</div>
                                            <div className="text-xs text-orange-600 font-bold flex items-center gap-1 mt-0.5"><BookOpen size={10}/> Lớp: {contract.class_name || 'Chưa xếp'}</div>
                                        </td>
                                        <td className="p-4 text-right font-black text-slate-700">
                                            {formatCurrency(contract.total_fee)}
                                        </td>
                                        <td className="p-4 text-right font-black text-green-600">
                                            {formatCurrency(contract.paid_amount || 0)}
                                        </td>
                                        <td className="p-4 text-right font-black text-red-500">
                                            {debt > 0 ? formatCurrency(debt) : '-'}
                                        </td>
                                        <td className="p-4 text-center text-sm font-medium text-slate-600">
                                            {contract.second_deadline ? new Date(contract.second_deadline).toLocaleDateString('vi-VN') : '-'}
                                        </td>
                                        <td className="p-4">
                                            {renderStatusBadge(currentStatus)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                
                                                {/* NÚT LẬP PHIẾU THU / XEM LỊCH SỬ THU */}
                                                {debt > 0 ? (
                                                    <button 
                                                        onClick={() => handleOpenReceiptModal(contract)}
                                                        className="p-2 bg-emerald-50 text-emerald-600 hover:text-white hover:bg-emerald-500 rounded-lg transition-colors"
                                                        title="Lập phiếu thu tiền"
                                                    >
                                                        <Receipt size={16} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleOpenReceiptModal(contract)}
                                                        className="p-2 bg-slate-100 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Xem lịch sử thu"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => { setSelectedContract(contract); setIsViewModalOpen(true); }}
                                                    className="p-2 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Xem Chi Tiết Hợp Đồng"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleExportWord(contract)}
                                                    className="p-2 bg-slate-100 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Tải File Word"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(contract.id!)}
                                                    className="p-2 bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa hợp đồng"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredContracts.length === 0 && (
                        <div className="p-12 text-center text-slate-400 font-medium">
                            <FileSignature size={48} className="mx-auto mb-3 opacity-20" />
                            Không tìm thấy hợp đồng nào phù hợp với bộ lọc
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL XEM CHI TIẾT HỢP ĐỒNG (CŨ) */}
            {isViewModalOpen && selectedContract && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 relative">
                            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
                                <X size={20} />
                            </button>
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <FileText className="text-orange-500" />
                                Chi Tiết Hợp Đồng {selectedContract.contract_code}
                            </h2>
                            <p className="text-slate-400 mt-1">Trạng thái hiện tại: {renderStatusBadge(getAccountingStatus(selectedContract))}</p>
                        </div>
                        
                        <div className="p-6 grid grid-cols-2 gap-6 bg-slate-50/50">
                            <div className="space-y-4">
                                <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs border-b pb-2">Thông tin học viên</h3>
                                <div className="space-y-3">
                                    <p className="flex justify-between text-sm"><span className="text-slate-500">Họ tên:</span> <span className="font-bold text-slate-800">{selectedContract.student_name}</span></p>
                                    <p className="flex justify-between text-sm"><span className="text-slate-500">SĐT:</span> <span className="font-bold text-slate-800">{selectedContract.student_phone}</span></p>
                                    <p className="flex justify-between text-sm"><span className="text-slate-500">CCCD:</span> <span className="font-bold text-slate-800">{selectedContract.student_cccd || 'Trống'}</span></p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs border-b pb-2">Thông tin khóa học</h3>
                                <div className="space-y-3">
                                    <p className="flex justify-between text-sm"><span className="text-slate-500">Khóa học:</span> <span className="font-bold text-slate-800">{selectedContract.course_name}</span></p>
                                    <p className="flex justify-between text-sm"><span className="text-slate-500">Lớp:</span> <span className="font-bold text-slate-800">{selectedContract.class_name}</span></p>
                                </div>
                            </div>

                            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5">
                                <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs border-b pb-2 mb-3">Tình trạng thanh toán</h3>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">Tổng học phí</p>
                                        <p className="text-xl font-black text-slate-800">{formatCurrency(selectedContract.total_fee)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500 mb-1">Đã thanh toán</p>
                                        <p className="text-xl font-black text-green-600">{formatCurrency(selectedContract.paid_amount || 0)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500 mb-1">Còn nợ</p>
                                        <p className="text-xl font-black text-red-500">{formatCurrency(selectedContract.total_fee - (selectedContract.paid_amount || 0))}</p>
                                    </div>
                                </div>
                                {selectedContract.payment_method === '2_LAN' && (
                                    <div className="bg-orange-50 p-3 rounded-lg flex items-center gap-3 text-orange-800 text-sm">
                                        <Calendar size={18} className="text-orange-500" />
                                        <div>
                                            <p className="font-bold">Kế hoạch thu tiền đợt 2: {formatCurrency(selectedContract.second_installment || 0)}</p>
                                            <p>Hạn chót: {selectedContract.second_deadline ? new Date(selectedContract.second_deadline).toLocaleDateString('vi-VN') : 'Chưa hẹn'}</p>
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

            {/* MODAL LẬP PHIẾU THU & XEM LỊCH SỬ THU (NÂNG CẤP LUỒNG) */}
            {isReceiptModalOpen && selectedContract && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-7xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        
                        <div className="bg-emerald-600 p-6 flex justify-between items-center text-white shrink-0">
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Receipt /> Hồ Sơ Thu Tiền: {selectedContract.contract_code}
                            </h2>
                            <button onClick={() => setIsReceiptModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
                            
                            {/* KHỐI 1: TÓM TẮT CÔNG NỢ */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><User size={24}/></div>
                                        <div>
                                            <p className="font-black text-slate-800 text-lg">{selectedContract.student_name}</p>
                                            <p className="text-sm font-medium text-slate-500">{selectedContract.course_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-8 text-right">
                                        <div><p className="text-xs font-bold text-slate-400 uppercase">Tổng phải thu</p><p className="text-xl font-black text-slate-800">{formatCurrency(selectedContract.total_fee || 0)}</p></div>
                                        <div><p className="text-xs font-bold text-slate-400 uppercase">Đã thu</p><p className="text-xl font-black text-emerald-600">{formatCurrency(selectedContract.paid_amount || 0)}</p></div>
                                        <div className="bg-red-50 px-4 py-1 rounded-xl border border-red-100"><p className="text-xs font-bold text-red-400 uppercase">Còn nợ</p><p className="text-xl font-black text-red-600">{formatCurrency(selectedContract.total_fee - (selectedContract.paid_amount || 0))}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* KHỐI 2: LỊCH SỬ GIAO DỊCH */}
                                <div>
                                    <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm mb-4 flex items-center gap-2"><History size={18} className="text-slate-400"/> Lịch sử thu tiền</h3>
                                    
                                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm min-h-[250px] space-y-3">
                                        {transactions.length === 0 ? (
                                            <div className="text-center text-slate-400 py-10 font-medium text-sm italic">Chưa có giao dịch nào được ghi nhận.</div>
                                        ) : (
                                            transactions.map((tx, idx) => (
                                                <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${tx.status === 'PENDING' ? 'bg-yellow-50 border-yellow-100' : 'hover:bg-slate-50 border-slate-100'}`}>
                                                    <div>
                                                        <p className={`font-black ${tx.status === 'PENDING' ? 'text-yellow-600' : 'text-emerald-600'}`}>{formatCurrency(tx.amount)}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{new Date(tx.created_at || '').toLocaleString('vi-VN')} • {tx.payment_method}</p>
                                                        <p className="text-xs text-slate-600 mt-1">{tx.note}</p>
                                                    </div>
                                                    {tx.status === 'PENDING' ? (
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-lg">
                                                                <Loader2 size={12} className="animate-spin"/> ĐANG CHỜ TT
                                                            </span>
                                                            {/* THÊM NÚT XÁC NHẬN THỦ CÔNG */}
                                                            <button 
                                                                onClick={async () => {
                                                                    if(window.confirm(`Xác nhận đã nhận ${formatCurrency(tx.amount)} cho phiếu này?`)) {
                                                                        await confirmTransactionSuccess(tx, selectedContract.paid_amount || 0);
                                                                        // Load lại dữ liệu để cập nhật UI
                                                                        const newTxs = await getTransactionsByContractId(selectedContract.id!);
                                                                        setTransactions(newTxs);
                                                                        setSelectedContract({...selectedContract, paid_amount: (selectedContract.paid_amount || 0) + tx.amount});
                                                                    }
                                                                }}
                                                                className="text-[10px] font-bold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 shadow-sm"
                                                            >
                                                                Đã nhận tiền
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <CheckCircle size={20} className="text-emerald-400" />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* KHỐI 3: FORM LẬP PHIẾU THU MỚI (CHIA 3 BƯỚC) */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm flex items-center gap-2"><Plus size={18} className="text-emerald-500"/> Lập phiếu thu</h3>
                                        {addingStep === 0 && (selectedContract.total_fee - (selectedContract.paid_amount || 0)) > 0 && (
                                            <button onClick={handleStartAddingTx} className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-200">Ghi nhận mới</button>
                                        )}
                                    </div>
                                    
                                    {addingStep === 1 && (
                                        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-xl shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4 w-full">
                                            {/* TIÊU ĐỀ BƯỚC */}
                                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                                <h4 className="font-black text-emerald-800 text-lg">Chi tiết phiếu thu mới</h4>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">Mã phiếu:</span>
                                                    <input type="text" disabled className="px-4 py-1.5 bg-slate-100 rounded-lg text-slate-600 font-bold text-center text-sm w-max" value={txCode} />
                                                </div>
                                            </div>

                                            {/* CHIA 2 CỘT: Cột trái (Form) rộng linh hoạt, Cột phải (QR) fix cứng 240px */}
                                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-8">
                                                
                                                {/* CỘT TRÁI: FORM NHẬP LIỆU (Đã làm rộng và to hơn) */}
                                                <div className="space-y-6">
                                                    {/* Số tiền */}
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Số tiền yêu cầu (VNĐ)</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-black text-emerald-700 text-2xl transition-all" 
                                                            value={newTxAmount} 
                                                            onChange={(e) => setNewTxAmount(e.target.value)} 
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    
                                                    {/* Hình thức & Kế toán */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Hình thức thanh toán</label>
                                                            <select 
                                                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-xl font-bold text-slate-700 text-sm cursor-pointer transition-all" 
                                                                value={newTxMethod} 
                                                                onChange={(e) => setNewTxMethod(e.target.value)}
                                                            >
                                                                <option value="CHUYEN_KHOAN">Chuyển khoản (Mã QR)</option>
                                                                <option value="TIEN_MAT">Tiền mặt (Nhận trực tiếp)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Người cập nhật</label>
                                                            <input type="text" disabled className="w-full px-4 py-3 bg-slate-100 border border-transparent rounded-xl text-slate-500 font-bold text-sm" value="Kế toán viên" />
                                                        </div>
                                                    </div>

                                                    {/* Ghi chú */}
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nội dung / Ghi chú (Tùy chọn)</label>
                                                        <input 
                                                            type="text" 
                                                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-xl outline-none font-medium text-slate-700 text-sm transition-all" 
                                                            value={newTxNote} 
                                                            onChange={(e) => setNewTxNote(e.target.value)} 
                                                            placeholder="Nhập nội dung thu tiền..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* CỘT PHẢI: QR REAL-TIME (Tăng kích thước lên 240px) */}
                                                {newTxMethod === 'CHUYEN_KHOAN' && (
                                                    <div className="w-full lg:w-[240px] flex flex-col items-center justify-center bg-[#F8FAFC] border-2 border-blue-100 rounded-2xl p-5 shadow-sm">
                                                        <p className="text-xs font-black text-blue-800 uppercase mb-3 text-center">Bản xem trước mã QR</p>
                                                        <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-100 w-full aspect-square flex items-center justify-center">
                                                            <img src={generateVietQRUrl()} alt="Mã QR thanh toán" className="max-w-full max-h-full object-contain" />
                                                        </div>
                                                        <div className="mt-4 text-center w-full">
                                                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Số tiền cần thanh toán</p>
                                                            <p className="text-lg text-blue-700 font-black">
                                                                {formatCurrency(Number(newTxAmount || 0))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* NÚT ACTION (Làm to và nổi bật hơn) */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-slate-100">
                                                <button 
                                                    onClick={() => setAddingStep(0)} 
                                                    disabled={isProcessing} 
                                                    className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                                                >
                                                    Hủy bỏ
                                                </button>
                                                
                                                <button 
                                                    onClick={handleCreateAndSendZalo} 
                                                    disabled={isProcessing}
                                                    className={`flex-1 py-3.5 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2.5 transition-all disabled:opacity-70 text-base ${newTxMethod === 'TIEN_MAT' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-[#0068FF] hover:bg-[#0054cc] shadow-blue-500/30'}`}
                                                >
                                                    {isProcessing ? (
                                                        <Loader2 className="animate-spin" size={20} />
                                                    ) : (
                                                        <Send size={20} />
                                                    )}
                                                    {newTxMethod === 'TIEN_MAT' ? 'Lưu Phiếu Thu Tiền Mặt' : 'Tạo Phiếu & Tự Động Gửi Zalo'}
                                                </button>
                                            </div>
                                        </div>
                                    )}


                                    {addingStep === 0 && (
                                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-[250px]">
                                            {(selectedContract.total_fee - (selectedContract.paid_amount || 0)) <= 0 ? (
                                                <>
                                                    <CheckCircle size={48} className="text-emerald-400 mb-3" />
                                                    <p className="font-black text-slate-700">Hợp đồng đã hoàn tất</p>
                                                    <p className="text-sm text-slate-500 mt-1">Đã thu đủ số tiền, không phát sinh công nợ.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Wallet size={48} className="text-slate-300 mb-3" />
                                                    <p className="font-bold text-slate-600">Sẵn sàng ghi nhận phiếu thu</p>
                                                    <button onClick={handleStartAddingTx} className="mt-4 bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/30">+ Lập phiếu mới</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }`}</style>
        </div>
    );
};

export default FinanceContractManagement;