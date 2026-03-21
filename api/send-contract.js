import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const OAuth2 = google.auth.OAuth2;

export default async function handler(req, res) {
    // 1. Cấu hình CORS (Cho phép Frontend gọi vào)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Xử lý request OPTIONS (Preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Chỉ chấp nhận POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { studentEmail, studentName, contractCode, fileBase64 } = req.body;

    if (!studentEmail || !fileBase64) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin gửi mail' });
    }

    try {
        // 2. Thiết lập OAuth2 Client để lấy Access Token tự động
        const oauth2Client = new OAuth2(
            process.env.CLIENT_ID,
            process.env.CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.REFRESH_TOKEN
        });

        const accessToken = await new Promise((resolve, reject) => {
            oauth2Client.getAccessToken((err, token) => {
                if (err) reject("Lỗi lấy Access Token: " + err);
                resolve(token);
            });
        });

        // 3. Cấu hình Transporter với OAuth2
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        // 4. Nội dung Email
        const mailOptions = {
            from: `"Trung tâm Anh ngữ Talemy" <${process.env.EMAIL_USER}>`,
            to: studentEmail,
            subject: `[QUAN TRỌNG] Hợp Đồng Nhập Học - Học viên ${studentName}`,
            html: `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h3 style="color: #f97316;">Kính gửi bạn ${studentName},</h3>
                    <p>Trung tâm xin gửi bạn bản mềm Hợp đồng nhập học mã số: <b>${contractCode}</b>.</p>
                    <p>Vui lòng xem file đính kèm bên dưới. Nếu có bất kỳ thắc mắc nào, hãy phản hồi lại email này.</p>
                    <br/>
                    <p>Trân trọng,</p>
                    <p><b>Phòng Đào Tạo Talemy</b></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Hop_Dong_${studentName}_${contractCode}.docx`,
                    content: fileBase64.includes("base64,") ? fileBase64.split("base64,")[1] : fileBase64,
                    encoding: 'base64'
                }
            ]
        };

        // 5. Gửi Mail
        await transporter.sendMail(mailOptions);

        return res.status(200).json({ success: true, message: 'Gửi email thành công!' });

    } catch (error) {
        console.error('Lỗi API gửi email:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}