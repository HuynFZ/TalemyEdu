// src/features/ContractManagement.tsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Download, MoreHorizontal } from 'lucide-react';
import { subscribeToContracts, ContractData } from '../services/contractService';

const ContractManagement = () => {
    const [contracts, setContracts] = useState<ContractData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Lắng nghe dữ liệu realtime từ Firebase
        const unsubscribe = subscribeToContracts((data) => {
            setContracts(data);
        });
        return () => unsubscribe();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Contract Management</h2>
                    <p className="text-slate-500 text-sm italic">Quản lý hồ sơ và hợp đồng học viên</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm tên, mã HĐ..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md hover:bg-blue-700 flex items-center gap-2 text-sm transition-all">
                        <Plus size={18} /> Tạo Hợp Đồng
                    </button>
                </div>
            </div>

            {/* TABLE HIỂN THỊ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-black">
                            <tr>
                                <th className="px-6 py-4">Mã HĐ</th>
                                <th className="px-6 py-4">Học viên</th>
                                <th className="px-6 py-4">Khóa học</th>
                                <th className="px-6 py-4">Thực thu</th>
                                <th className="px-6 py-4">Trạng thái HĐ</th>
                                <th className="px-6 py-4">Thanh toán</th>
                                <th className="px-6 py-4 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contracts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                        Chưa có hợp đồng nào trong hệ thống.
                                    </td>
                                </tr>
                            ) : (
                                contracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{contract.contractCode}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{contract.studentName}</p>
                                            <p className="text-xs text-slate-400">{contract.studentPhone}</p>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{contract.course}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(contract.actualFee)}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                                                {contract.contractStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                {contract.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ContractManagement;