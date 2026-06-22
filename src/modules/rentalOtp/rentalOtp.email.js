/**
 * Gửi email OTP cho khách hàng bằng Brevo API (tránh bị chặn port trên Render)
 * @param {string} toEmail - Email người nhận
 * @param {string} otpCode - Mã OTP 6 chữ số
 * @param {number} expiresMinutes - Số phút hết hạn
 */
async function sendOtpEmail(toEmail, otpCode, expiresMinutes = 5) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_EMAIL; // Email gửi (phải là email đã Verify trên Brevo)

  if (!brevoApiKey) {
    throw new Error("Thiếu BREVO_API_KEY trong file .env");
  }

  if (!senderEmail) {
    throw new Error("Thiếu SMTP_EMAIL trong file .env");
  }

  const htmlContent = `
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
  `;

  const payload = {
    sender: {
      name: "T-Rent",
      email: senderEmail,
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject: "Mã xác thực OTP đặt thuê thiết bị - T-Rent",
    htmlContent: htmlContent,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(`Lỗi gửi mail Brevo: ${response.status} - ${JSON.stringify(responseData)}`);
  }

  console.log(`[EMAIL] ✅ Đã gửi OTP bằng Brevo API đến ${toEmail}`);
  return responseData;
}

module.exports = { sendOtpEmail };

