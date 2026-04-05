// --- FILE: server.js ---
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import crypto from 'crypto'; // Có sẵn trong Node.js để bảo mật
import axios from 'axios';   // Thư viện gọi API cực mạnh
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

// 1. CẤU HÌNH SUPABASE (Dùng cho Webhook)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 2. HÀM TỰ TÍNH CHỮ KÝ (Dùng đúng ID sếp đưa để bảo mật)
function createSignature(data, checksumKey) {
    const sortedData = Object.keys(data).sort().reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
    }, {});
    const queryString = Object.keys(sortedData).map(key => `${key}=${sortedData[key]}`).join('&');
    return crypto.createHmac('sha256', checksumKey).update(queryString).digest('hex');
}

// 3. API TẠO LINK THANH TOÁN (DÙNG ĐÚNG ID CỦA SẾP)
app.post('/api/create-payment-link', async (req, res) => {
    try {
        const { amount, orderCode } = req.body;
        console.log(`📡 Đang dùng ID của sếp để tạo đơn: ${orderCode}`);

        const paymentData = {
            orderCode: Number(orderCode),
            amount: Number(amount),
            description: "Thanh toan hoc phi",
            cancelUrl: "http://localhost:5173",
            returnUrl: "http://localhost:5173"
        };

        // Tính chữ ký bằng Checksum Key của sếp
        const signature = createSignature(paymentData, process.env.PAYOS_CHECKSUM_KEY);
        
        // Gửi yêu cầu trực tiếp đến server PayOS
        const response = await axios.post('https://api-merchant.payos.vn/v2/payment-requests', 
            { ...paymentData, signature },
            { headers: { 
                'x-client-id': process.env.PAYOS_CLIENT_ID, 
                'x-api-key': process.env.PAYOS_API_KEY,
                'Content-Type': 'application/json'
            }}
        );

        console.log("✅ PayOS đã trả về link thành công!");
        res.status(200).json({ success: true, data: response.data.data });

    } catch (error) {
        console.error('❌ LỖI PAYOS:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: "Lỗi kết nối hệ thống PayOS" });
    }
});

// 4. API WEBHOOK (Xử lý khi học viên đóng tiền xong)
app.all('/api/webhook/payos', async (req, res) => {
    if (req.method === 'GET') {
        return res.status(200).send("✅ Webhook Talemy đã sẵn sàng nhận tiền!");
    }
    try {
        const { data } = req.body; // PayOS bắn dữ liệu về qua body.data
        if (data) {
            const { orderCode, amount } = data;
            console.log(`💰 [TING TING] Đơn ${orderCode} đã thanh toán ${amount}đ`);

            // Tìm transaction và cộng tiền vào Supabase (Giữ nguyên logic cũ của bạn)
            const { data: tx } = await supabase.from('transactions').select('*').eq('order_code', orderCode).eq('status', 'PENDING').single();
            if (tx) {
                await supabase.from('transactions').update({ status: 'THANH_CONG' }).eq('id', tx.id);
                const { data: contract } = await supabase.from('contracts').select('paid_amount').eq('id', tx.contract_id).single();
                const newTotal = (contract?.paid_amount || 0) + amount;
                await supabase.from('contracts').update({ paid_amount: newTotal }).eq('id', tx.contract_id);
                console.log(`✅ Đã tự động cộng tiền vào Hợp đồng!`);
            }
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(200).json({ success: false }); 
    }
});

// 5. API GỬI MAIL HỢP ĐỒNG (OAUTH2)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN
    }
});

app.post('/api/send-contract', async (req, res) => {
    const { studentEmail, studentName, contractCode, fileBase64 } = req.body;
    try {
        const mailOptions = {
            from: `"Talemy English" <${process.env.EMAIL_USER}>`,
            to: studentEmail,
            subject: `Hợp Đồng Nhập Học - ${studentName}`,
            html: `<h3>Chào bạn ${studentName}, đây là hợp đồng của bạn.</h3>`,
            attachments: [{ filename: `HD_${contractCode}.docx`, content: fileBase64.split("base64,")[1], encoding: 'base64' }]
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server Talemy chạy mượt mà tại port ${PORT}`));