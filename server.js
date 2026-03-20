import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
// Tăng giới hạn dung lượng để nhận file Word Base64
app.use(express.json({ limit: '10mb' })); 

// CẤU HÌNH SMTP GMAIL DOANH NGHIỆP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // dùng SSL
    auth: {
        user: '23521417@gm.uit.edu.vn', 
        pass: 'lnkg xdpf euav qhdb'     
    }
});

app.post('/api/send-contract', async (req, res) => {
    const { studentEmail, studentName, contractCode, fileBase64 } = req.body;

    try {
        const mailOptions = {
            from: '"Trung tâm anh ngữ Talemy" <23521417@gm.uit.edu.vn>',
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

app.listen(3001, () => console.log('Server Backend đang chạy ở port 3001'));