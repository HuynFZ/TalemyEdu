import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, Lock, Loader2, ArrowLeft, Send, ShieldAlert } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // --- TRẠNG THÁI MỚI ---
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const { login } = useAuth();

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

    // --- HÀM GỬI YÊU CẦU CHO ADMIN ---
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Kiểm tra xem email có tồn tại trong hệ thống không
            const q = query(collection(db, "users"), where("username", "==", forgotEmail.toLowerCase().trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Email này không tồn tại trên hệ thống Talemy!");
                setLoading(false);
                return;
            }

            const userId = querySnapshot.docs[0].id;

            // 2. Gửi yêu cầu vào passwordRequests
            await addDoc(collection(db, "passwordRequests"), {
                userId: userId,
                userName: "Yêu cầu khôi phục mật khẩu",
                userEmail: forgotEmail.toLowerCase().trim(),
                newPassword: "YÊU CẦU RESET (QUÊN MẬT KHẨU)",
                status: 'pending',
                type: 'FORGOT_PASSWORD',
                createdAt: serverTimestamp()
            });

            alert("Đã gửi yêu cầu thành công! Vui lòng chờ Admin phê duyệt và cấp mật khẩu mới.");
            setIsForgotMode(false);
            setForgotEmail('');
        } catch (error) {
            alert("Có lỗi xảy ra khi gửi yêu cầu!");
        } finally {
            setLoading(false);
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
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        {isForgotMode ? "Khôi phục Pass" : "Talemy Login"}
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium italic">
                        {isForgotMode ? "Gửi yêu cầu cấp lại tới Admin" : "Hệ thống quản lý giáo dục nội bộ"}
                    </p>
                </div>

                {!isForgotMode ? (
                    // --- GIAO DIỆN ĐĂNG NHẬP ---
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Doanh Nghiệp</label>
                            <div className="relative mt-2">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                <input
                                    type="email" required value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ten@talemy.edu"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mật khẩu</label>
                            <div className="relative mt-2">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                <input
                                    type="password" required value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading} type="submit"
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-[0.95] flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : "ĐĂNG NHẬP HỆ THỐNG"}
                        </button>

                        <div className="text-center pt-4">
                            <button
                                type="button"
                                onClick={() => setIsForgotMode(true)}
                                className="text-[10px] font-black text-slate-400 uppercase hover:text-orange-500 transition-colors"
                            >
                                QUÊN MẬT KHẨU? <span className="text-orange-500 underline ml-1"></span>
                            </button>
                        </div>
                    </form>
                ) : (
                    // --- GIAO DIỆN GỬI YÊU CẦU QUÊN MẬT KHẨU ---
                    <form onSubmit={handleForgotPassword} className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="bg-orange-50 p-5 rounded-2xl flex gap-3 items-start border border-orange-100">
                            <ShieldAlert className="text-orange-500 shrink-0" size={24} />
                            <p className="text-[11px] text-orange-700 font-bold leading-relaxed uppercase">
                                Nhập Email công ty của bạn. Admin sẽ nhận được yêu cầu và cấp mật khẩu mới trong thời gian sớm nhất.
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email cần khôi phục</label>
                            <div className="relative mt-2">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                <input
                                    type="email" required value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="ten.nhanvien@talemy.edu"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-orange-500/20 rounded-2xl outline-none transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading || !forgotEmail} type="submit"
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18}/> <span>GỬI YÊU CẦU ĐẾN ADMIN</span></>}
                        </button>

                        <button
                            type="button" onClick={() => setIsForgotMode(false)}
                            className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-slate-600 transition-colors"
                        >
                            <ArrowLeft size={14}/> Quay lại đăng nhập
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-slate-50 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                    Talemy Education © 2026
                </div>
            </div>
        </div>
    );
};

export default Login;