import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

// CẤU HÌNH GỬI MAIL CHUẨN DOANH NGHIỆP (OAUTH2)
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
            from: '"Trung tâm anh ngữ Talemy" <' + process.env.EMAIL_USER + '>',
            to: studentEmail,
            subject: `[Quan Trọng] Hợp Đồng Nhập Học - Học viên ${studentName}`,
            html: `
                <h3>Kính gửi bạn ${studentName},</h3>
                <p>Trung tâm xin gửi bạn bản mềm Hợp đồng nhập học (Mã HĐ: <b>${contractCode}</b>).</p>
                <p>Vui lòng xem file Hợp đồng đính kèm (File Word) bên dưới. Nếu có bất kỳ thắc mắc nào, hãy phản hồi lại email này.</p>
                <br/>
                <p>Trân trọng,</p>
                <p><b>Phòng Đào Tạo</b></p>
            `,
            attachments: [
                {
                    filename: `Hop_Dong_${studentName}_${contractCode}.docx`,
                    content: fileBase64.split("base64,")[1], 
                    encoding: 'base64'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Gửi email thành công!' });
    } catch (error) {
        console.error('Lỗi gửi email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server Backend đang chạy ở port ${PORT}`));