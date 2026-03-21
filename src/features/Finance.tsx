import React, { useState } from 'react';
import {
    Plus,
    Search,
    Filter,
    ArrowUpCircle,
    ArrowDownCircle,
    Download,
    MoreHorizontal
} from 'lucide-react';

// Định nghĩa kiểu dữ liệu cho giao dịch
interface Transaction {
    id: string;
    studentName: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: string;
    date: string;
    status: 'Completed' | 'Pending';
}

const Finance = () => {
    // Data mẫu để Ngọc dễ hình dung
    const [transactions] = useState<Transaction[]>([
        { id: '1', studentName: 'Nguyễn Văn A', amount: 5000000, type: 'Income', category: 'Học phí IELTS', date: '2026-03-15', status: 'Completed' },
        { id: '2', studentName: 'Mua văn phòng phẩm', amount: 1200000, type: 'Expense', category: 'Vận hành', date: '2026-03-14', status: 'Completed' },
        { id: '3', studentName: 'Lê Thị B', amount: 3500000, type: 'Income', category: 'Học phí TOEIC', date: '2026-03-14', status: 'Pending' },
    ]);

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Quản lý tài chính</h2>
                    <p className="text-slate-500 text-sm italic">Theo dõi doanh thu và chi phí hệ thống</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                        <Download size={18} /> Xuất Excel
                    </button>
                    <button className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
                        <Plus size={18} /> Thêm giao dịch
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                            <ArrowUpCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Thu</p>
                            <h3 className="text-2xl font-black text-slate-800">8,500,000đ</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                            <ArrowDownCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Chi</p>
                            <h3 className="text-2xl font-black text-slate-800">1,200,000đ</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số dư hiện tại</p>
                    <h3 className="text-2xl font-black text-white">7,300,000đ</h3>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm giao dịch..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm border border-slate-100">
                        <Filter size={18} /> Lọc
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50/50 text-[11px] uppercase tracking-widest text-slate-400 font-black">
                            <th className="px-6 py-4">Ngày</th>
                            <th className="px-6 py-4">Nội dung / Học viên</th>
                            <th className="px-6 py-4">Danh mục</th>
                            <th className="px-6 py-4">Số tiền</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-500">{t.date}</td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-slate-800">{t.studentName}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">ID: {t.id}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{t.category}</span>
                                </td>
                                <td className={`px-6 py-4 text-sm font-black ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'Income' ? '+' : '-'}{t.amount.toLocaleString()}đ
                                </td>
                                <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                        t.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {t.status === 'Completed' ? 'Thành công' : 'Chờ xử lý'}
                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={20} /></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Finance;