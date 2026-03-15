import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const { login } = useAuth();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(email);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl shadow-lg shadow-orange-200 mb-4 text-white">
                        <GraduationCap size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">Talemy Login</h2>
                    <p className="text-slate-500 mt-2 font-medium">Hệ thống quản lý giáo dục nội bộ</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email nội bộ</label>
                        <div className="relative mt-2">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="email" required
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@talemy.edu"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
                        <div className="relative mt-2">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="password" required
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98]">
                        Đăng nhập hệ thống
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                    <p className="text-xs text-slate-400 font-bold leading-relaxed">
                        Gợi ý: Dùng <span className="text-orange-500">admin@talemy.edu</span> để vào quyền Admin<br/>
                        Hoặc <span className="text-orange-500">finance@talemy.edu</span> để vào quyền Tài chính
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;