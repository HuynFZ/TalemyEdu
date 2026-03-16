import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); // Kích hoạt trạng thái đợi để ngăn bấm nhiều lần

        try {
            // Gọi hàm login đã được cập nhật để kiểm tra với Firebase
            await login(email, password);
        } catch (error) {
            console.error("Login error:", error);
        } finally {
            setLoading(false); // Hoàn tất xử lý
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-in fade-in zoom-in duration-300">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-3xl shadow-lg shadow-orange-200 mb-6 text-white rotate-3">
                        <GraduationCap size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Talemy Login</h2>
                    <p className="text-slate-500 mt-2 font-medium italic">Hệ thống quản lý giáo dục nội bộ</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email Input */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Doanh Nghiệp</label>
                        <div className="relative mt-2">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ten.chucvu@talemy.edu"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mật khẩu</label>
                        <div className="relative mt-2">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-2xl outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Submit Button với hiệu ứng Loading */}
                    <button
                        disabled={loading}
                        type="submit"
                        className={`w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-[0.95] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>ĐANG KIỂM TRA...</span>
                            </>
                        ) : (
                            "ĐĂNG NHẬP HỆ THỐNG"
                        )}
                    </button>
                </form>

                {/* Trợ giúp đăng nhập */}
                <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                        Quên mật khẩu? <br/> Vui lòng liên hệ <span className="text-orange-500 underline cursor-pointer">Quản trị viên hệ thống</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;