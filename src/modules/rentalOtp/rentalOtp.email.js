const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_APP_PASSWORD,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

/**
 * Gửi email OTP cho khách hàng
 * @param {string} toEmail - Email người nhận
 * @param {string} otpCode - Mã OTP 6 chữ số
 * @param {number} expiresMinutes - Số phút hết hạn
 */
async function sendOtpEmail(toEmail, otpCode, expiresMinutes = 5) {
  const mailOptions = {
    from: `"T-Rent" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: "Mã xác thực OTP đặt thuê thiết bị - T-Rent",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2563eb; text-align: center;">T-Rent</h2>
        <hr style="border: none; border-top: 2px solid #e5e7eb;" />
        <p>Xin chào,</p>
        <p>Bạn đang thực hiện xác thực đặt thuê thiết bị. Mã OTP của bạn là:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #1e40af;
            background: #eff6ff;
            padding: 12px 24px;
            border-radius: 8px;
            border: 2px dashed #93c5fd;
          ">${otpCode}</span>
        </div>
        <p style="color: #dc2626; font-size: 14px;">
          ⏰ Mã OTP có hiệu lực trong <strong>${expiresMinutes} phút</strong>.
        </p>
        <p style="font-size: 13px; color: #6b7280;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          © ${new Date().getFullYear()} T-Rent - Hệ thống cho thuê thiết bị
        </p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[EMAIL] Đã gửi OTP đến ${toEmail} - MessageID: ${info.messageId}`);
  return info;
}

module.exports = { sendOtpEmail };
