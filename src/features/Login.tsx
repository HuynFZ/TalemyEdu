import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Loader2, ArrowLeft, Send, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- TRẠNG THÁI QUÊN MẬT KHẨU ---
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    const { login } = useAuth();

    // 1. Xử lý Đăng nhập
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
        } catch (error) {
            console.error("Login error:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Xử lý Gửi yêu cầu Khôi phục mật khẩu (Supabase)
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanEmail = forgotEmail.toLowerCase().trim();
        if (!cleanEmail) return;

        setLoading(true);
        try {
            // Bước A: Kiểm tra xem email có tồn tại trong bảng users không
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', cleanEmail)
                .maybeSingle();

            if (userError) throw userError;

            if (!user) {
                alert("Email này không tồn tại trên hệ thống Talemy!");
                setLoading(false);
                return;
            }

            // Bước B: Gửi yêu cầu vào bảng password_requests
            const { error: reqError } = await supabase
                .from('password_requests')
                .insert([
                    {
                        user_id: user.id,
                        user_name: "Yêu cầu khôi phục",
                        user_email: cleanEmail,
                        new_password: "YÊU CẦU CẤP LẠI (QUÊN PASS)",
                        status: 'pending',
                        type: 'FORGOT_PASSWORD'
                    }
                ]);

            if (reqError) throw reqError;

            alert("✅ Đã gửi yêu cầu thành công! Admin sẽ kiểm tra và cấp lại mật khẩu cho bạn sớm nhất.");
            setIsForgotMode(false);
            setForgotEmail('');
        } catch (error: any) {
            console.error("Forgot Pwd Error:", error);
            alert("❌ Có lỗi xảy ra: " + (error.message || "Không thể kết nối Server"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100 animate-in fade-in zoom-in duration-500">

                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-3xl shadow-lg shadow-orange-200 mb-6 text-white rotate-3">
                        <GraduationCap size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">
                        {isForgotMode ? "Khôi phục Pass" : "Talemy Login"}
                    </h2>
                    <p className="text-slate-400 mt-2 font-bold text-xs uppercase tracking-widest italic">
                        {isForgotMode ? "Gửi yêu cầu tới Ban quản trị" : "Hệ thống quản lý giáo dục nội bộ"}
                    </p>
                </div>

                {!isForgotMode ? (
                    // --- GIAO DIỆN ĐĂNG NHẬP ---
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Công Việc</label>
                            <div className="relative mt-2 group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type="email" required value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ten@talemy.edu"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mật khẩu</label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotMode(true)}
                                    className="text-[10px] font-black text-orange-500 uppercase hover:underline"
                                >
                                    Quên mật khẩu?
                                </button>
                            </div>
                            <div className="relative mt-2 group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"} required value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            disabled={loading} type="submit"
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-[0.95] flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "ĐĂNG NHẬP HỆ THỐNG"}
                        </button>
                    </form>
                ) : (
                    // --- GIAO DIỆN GỬI YÊU CẦU QUÊN MẬT KHẨU ---
                    <form onSubmit={handleForgotPassword} className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="bg-orange-50 p-5 rounded-2xl flex gap-4 items-start border border-orange-100 shadow-inner">
                            <ShieldAlert className="text-orange-500 shrink-0" size={24} />
                            <p className="text-[11px] text-orange-800 font-bold leading-relaxed uppercase tracking-tight">
                                Vui lòng nhập Email công ty. Quản trị viên sẽ nhận được thông báo khôi phục và phản hồi sớm nhất.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email cần khôi phục</label>
                            <div className="relative mt-2">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                <input
                                    type="email" required value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="ten.nhanvien@talemy.edu"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/10 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading || !forgotEmail} type="submit"
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18}/> <span>GỬI YÊU CẦU KHÔI PHỤC</span></>}
                        </button>

                        <button
                            type="button" onClick={() => setIsForgotMode(false)}
                            className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-orange-500 transition-colors"
                        >
                            <ArrowLeft size={14}/> Quay lại đăng nhập
                        </button>
                    </form>
                )}

                <div className="mt-10 pt-6 border-t border-slate-50 text-center text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">
                    Talemy Education © 2026
                </div>
            </div>
        </div>
    );
};

export default Login;