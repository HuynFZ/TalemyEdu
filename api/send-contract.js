import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

// ==========================================
// IMPORT CHUẨN ESM THUẦN TÚY 
// ==========================================
import payosModule from '@payos/node';

// Tự động tìm đúng Class PayOS (Bao xài cho mọi phiên bản)
const PayOS = payosModule.PayOS || payosModule.default || payosModule;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

// ==========================================
// 1. CẤU HÌNH PAYOS
// ==========================================
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// ==========================================
// 2. CẤU HÌNH GỬI MAIL (OAUTH2)
// ==========================================
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

// ==========================================
// API 1: GỬI EMAIL HỢP ĐỒNG
// ==========================================
app.post('/api/send-contract', async (req, res) => {
    const { studentEmail, studentName, contractCode, fileBase64 } = req.body;
    try {
        const mailOptions = {
            from: '"Trung tâm anh ngữ Talemy" <' + process.env.EMAIL_USER + '>',
            to: studentEmail,
            subject: `[Quan Trọng] Hợp Đồng Nhập Học - Học viên ${studentName}`,
            html: `
                <h3>Kính gửi bạn ${studentName},</h3>
                <p>Trung tâm xin gửi bạn bản mềm Hợp đồng nhập học (Mã HĐ: <b>${contractCode}</b>).</p>
                <p>Vui lòng xem file Hợp đồng đính kèm (File Word) bên dưới.</p>
            `,
            attachments: [{
                filename: `Hop_Dong_${studentName}_${contractCode}.docx`,
                content: fileBase64.split("base64,")[1], 
                encoding: 'base64'
            }]
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Gửi email thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// API 2: TẠO LINK THANH TOÁN & MÃ QR TỪ PAYOS
// ==========================================
app.post('/api/create-payment-link', async (req, res) => {
    try {
        const { amount, description, orderCode } = req.body;
        console.log("🚀 Gọi PayOS tạo đơn hàng với data:", { amount, description, orderCode });

        const body = {
            orderCode: Number(orderCode), 
            amount: Number(amount), 
            description: description || "Thanh toan hoc phi", 
            cancelUrl: "http://localhost:5173", 
            returnUrl: "http://localhost:5173"  
        };

        // Gọi trực tiếp, không vòng vèo nữa
        const paymentLink = await payos.createPaymentLink(body);
        
        console.log("✅ Tạo link PayOS thành công!");
        res.status(200).json({ success: true, data: paymentLink });

    } catch (error) {
        console.error('❌ PAYOS TỪ CHỐI TẠO LINK. CHI TIẾT LỖI:', error);
        res.status(500).json({ success: false, error: error.message || "Lỗi tạo link thanh toán" });
    }
});

// ==========================================
// API 3: HỨNG WEBHOOK KHI CÓ NGƯỜI CHUYỂN TIỀN
// ==========================================
app.post('/api/webhook/payos', async (req, res) => {
    try {
        const webhookData = req.body;
        const verifiedData = payos.verifyWebhookData(webhookData);

        if (verifiedData.success) {
            console.log(`[TING TING] Đã nhận ${verifiedData.data.amount} VNĐ cho mã đơn: ${verifiedData.data.orderCode}`);
            return res.status(200).json({ success: true, message: "OK" });
        }
    } catch (error) {
        return res.status(200).json({ success: false, message: "Lỗi nội bộ server" }); 
    }
});

// ==========================================
// KHỞI ĐỘNG SERVER
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server Backend đang chạy ở port ${PORT}`));