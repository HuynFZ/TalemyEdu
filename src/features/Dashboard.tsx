import React from 'react';
import {
    DollarSign,
    Users,
    TrendingUp,
    AlertCircle,
    ArrowUpRight,
    MoreVertical
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

// Data mẫu cho biểu đồ
const incomeData = [
    { name: 'T2', value: 4000 },
    { name: 'T3', value: 3000 },
    { name: 'T4', value: 2000 },
    { name: 'T5', value: 2780 },
    { name: 'T6', value: 1890 },
    { name: 'T7', value: 2390 },
    { name: 'CN', value: 3490 },
];

const sourceData = [
    { name: 'Facebook', value: 400 },
    { name: 'Zalo', value: 300 },
    { name: 'Hotline', value: 300 },
    { name: 'Website', value: 200 },
];

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa']; // Các tông màu Cam

const StatCard = ({ title, value, icon: Icon, colorClass, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-hover hover:shadow-md">
        <div className="flex justify-between items-start">
            <div className={`p-3 rounded-xl ${colorClass}`}>
                <Icon size={24} className="text-white" />
            </div>
            <span className="flex items-center text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
        {trend} <ArrowUpRight size={14} />
      </span>
        </div>
        <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Dashboard Tổng Quan</h2>
                    <p className="text-slate-500 text-sm">Chào mừng quay trở lại, Huy Nguyễn!</p>
                </div>
                <div className="flex gap-3">
                    <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-50">
                        Xuất báo cáo
                    </button>
                    <button className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all">
                        + Thêm dữ liệu
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Doanh thu (VND)"
                    value="45,000,000"
                    icon={DollarSign}
                    colorClass="bg-orange-500"
                    trend="+12%"
                />
                <StatCard
                    title="Học viên mới"
                    value="128"
                    icon={Users}
                    colorClass="bg-orange-400"
                    trend="+5%"
                />
                <StatCard
                    title="Lead đang xử lý"
                    value="15"
                    icon={TrendingUp}
                    colorClass="bg-amber-500"
                    trend="+18%"
                />
                <StatCard
                    title="Chi phí tháng"
                    value="12,500,000"
                    icon={AlertCircle}
                    colorClass="bg-slate-800"
                    trend="0%"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Doanh thu Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800">Biểu đồ thu nhập tuần</h3>
                        <MoreVertical size={20} className="text-slate-400 cursor-pointer" />
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={incomeData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <Tooltip
                                    cursor={{fill: '#fff7ed'}}
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                />
                                <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lead Source Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6">Nguồn học viên</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sourceData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {sourceData.map((item, index) => (
                            <div key={item.name} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                                    <span className="text-slate-600">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-800">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;