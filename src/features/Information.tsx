import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffProfile } from '../services/staffService';
import {
    User, Mail, Phone, MapPin,
    Calendar, DollarSign, Briefcase, Shield
} from 'lucide-react';

const Information = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.email) {
            getStaffProfile(user.email).then(data => {
                setProfile(data);
                setLoading(false);
            });
        }
    }, [user]);

    if (loading) return <div className="p-8 text-center font-bold text-slate-400">Đang tải hồ sơ...</div>;

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header Hồ Sơ */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="w-32 h-32 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-xl shadow-orange-200">
                        {user?.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-3xl font-black text-slate-800 mb-2">{profile?.name || user?.name}</h2>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-4 py-1.5 bg-orange-50 text-orange-600 font-black text-xs rounded-full border border-orange-100 uppercase tracking-widest">
                {user?.role}
              </span>
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 font-black text-xs rounded-full border border-emerald-100 uppercase tracking-widest">
                Đang hoạt động
              </span>
                        </div>
                    </div>
                </div>

                {/* Thông tin chi tiết - Grid đa nhiệm */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cột trái: Thông tin liên lạc */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <User size={18} className="text-orange-500" /> Thông tin cơ bản
                        </h3>
                        <div className="space-y-6">
                            <InfoItem icon={<Mail />} label="Email công việc" value={user?.email} />
                            <InfoItem icon={<Phone />} label="Số điện thoại" value={profile?.phone || "Chưa cập nhật"} />
                            <InfoItem icon={<MapPin />} label="Địa chỉ" value={profile?.address || "Chưa cập nhật"} />
                        </div>
                    </div>

                    {/* Cột phải: Thông tin công việc */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Briefcase size={18} className="text-orange-500" /> Công việc & Lương
                        </h3>
                        <div className="space-y-6">
                            <InfoItem icon={<Calendar />} label="Ngày gia nhập" value={profile?.hireDate || "2025-01-01"} />
                            <InfoItem icon={<DollarSign />} label="Lương cơ bản" value={`${profile?.salary?.toLocaleString() || 0} VND`} />
                            <InfoItem icon={<Shield />} label="Phân quyền hệ thống" value={user?.role.toUpperCase()} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component con để hiển thị từng dòng thông tin
const InfoItem = ({ icon, label, value }: any) => (
    <div className="flex items-start gap-4 p-2">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
            {React.cloneElement(icon, { size: 18 })}
        </div>
        <div className="overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="font-bold text-slate-700 truncate">{value}</p>
        </div>
    </div>
);

export default Information;