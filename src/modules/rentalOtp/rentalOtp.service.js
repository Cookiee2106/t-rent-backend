const prisma = require("../../utils/prisma");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendOtpEmail } = require("./rentalOtp.email");

// ============================================================
// Config
// ============================================================
const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 5;

// ============================================================
// Helpers
// ============================================================

/**
 * Tạo mã OTP ngẫu nhiên (6 chữ số)
 */
function generateOtpCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code.padStart(OTP_LENGTH, "0");
}

// ============================================================
// Service Functions
// ============================================================

/**
 * BƯỚC 10: Gửi mã OTP xác thực đặt thuê
 * - Tạo OTP, hash và lưu vào bảng otp_verifications
 * - Trả về OTP plain text (demo: show console)
 */
async function sendOtp(userId, purpose = "CREATE_ORDER") {
  // Lấy thông tin email của user
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true, full_name: true },
  });

  if (!user) {
    throw Object.assign(new Error("Không tìm thấy người dùng"), { statusCode: 404 });
  }

  // Hủy tất cả OTP cũ còn PENDING của user cho cùng purpose
  await prisma.otp_verifications.updateMany({
    where: {
      user_id: userId,
      purpose,
      status: "PENDING",
    },
    data: {
      status: "FAILED",
    },
  });

  // Tạo OTP mới
  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  const otpRecord = await prisma.otp_verifications.create({
    data: {
      user_id: userId,
      otp_hash: otpHash,
      purpose,
      status: "PENDING",
      expires_at: expiresAt,
      failed_attempts: 0,
    },
  });

  // ===== Log OTP ra console =====
  console.log("========================================");
  console.log(`[OTP] Mã OTP cho user ${userId}: ${otpCode}`);
  console.log(`[OTP] Hết hạn lúc: ${expiresAt.toISOString()}`);
  console.log("========================================");

  // ===== Gửi OTP qua email (Google SMTP) =====
  try {
    await sendOtpEmail(user.email, otpCode, OTP_EXPIRES_MINUTES);
    console.log(`[OTP] ✅ Đã gửi email OTP đến ${user.email}`);
  } catch (emailError) {
    console.error(`[OTP] ⚠️ Gửi email thất bại:`, emailError.message);
    // Không throw - OTP vẫn được tạo, user có thể xem trong response (demo)
  }

  return {
    otpId: otpRecord.id,
    expiresAt,
    sentTo: user.email,
    // Demo: trả otpCode để test Postman (production thì bỏ)
    otpCode,
  };
}

/**
 * BƯỚC 11-12-13: Khách nhập OTP → Hệ thống kiểm tra
 * - Tìm OTP record theo id
 * - Kiểm tra hết hạn, số lần thử
 * - So sánh hash
 * - Nếu hợp lệ → cập nhật status VERIFIED
 */
async function verifyOtp(otpId, otpCode, userId) {
  // Tìm OTP record
  const otpRecord = await prisma.otp_verifications.findUnique({
    where: { id: otpId },
  });

  if (!otpRecord) {
    return { success: false, message: "Mã OTP không tồn tại" };
  }

  // Kiểm tra OTP có thuộc về user này không
  if (otpRecord.user_id !== userId) {
    return { success: false, message: "Mã OTP không hợp lệ" };
  }

  // Kiểm tra OTP đã được sử dụng hoặc hủy chưa
  if (otpRecord.status !== "PENDING") {
    return {
      success: false,
      message: `Mã OTP đã ${otpRecord.status === "VERIFIED" ? "được sử dụng" : "hết hiệu lực"}`,
    };
  }

  // Kiểm tra hết hạn
  if (new Date() > new Date(otpRecord.expires_at)) {
    await prisma.otp_verifications.update({
      where: { id: otpId },
      data: { status: "EXPIRED" },
    });
    return { success: false, message: "Mã OTP đã hết hạn" };
  }

  // Kiểm tra số lần thử sai
  if (otpRecord.failed_attempts >= MAX_FAILED_ATTEMPTS) {
    await prisma.otp_verifications.update({
      where: { id: otpId },
      data: { status: "FAILED" },
    });
    return {
      success: false,
      message: "Mã OTP đã bị khóa do nhập sai quá nhiều lần",
    };
  }

  // So sánh OTP
  const isMatch = await bcrypt.compare(otpCode, otpRecord.otp_hash);

  if (!isMatch) {
    // Tăng số lần thử sai
    const updated = await prisma.otp_verifications.update({
      where: { id: otpId },
      data: { failed_attempts: { increment: 1 } },
    });

    const attemptsLeft = MAX_FAILED_ATTEMPTS - updated.failed_attempts;
    return {
      success: false,
      message: `Mã OTP không đúng. Còn ${attemptsLeft} lần thử`,
      attemptsLeft,
    };
  }

  // ===== OTP HỢP LỆ =====
  const verificationToken = crypto.randomUUID();

  await prisma.otp_verifications.update({
    where: { id: otpId },
    data: {
      status: "VERIFIED",
      verified_at: new Date(),
    },
  });

  // ===== DEMO: Log thành công ra console =====
  console.log("========================================");
  console.log(`[OTP] ✅ XÁC THỰC THÀNH CÔNG cho user ${userId}`);
  console.log(`[OTP] OTP ID: ${otpId}`);
  console.log(`[OTP] Verification Token: ${verificationToken}`);
  console.log(`[OTP] Chuyển sang bước thanh toán cọc giữ chỗ...`);
  console.log("========================================");

  return {
    success: true,
    message: "Xác thực OTP thành công. Chuyển sang bước thanh toán cọc.",
    otpId,
    verifiedAt: new Date(),
    verificationToken,
  };
}

module.exports = {
  sendOtp,
  verifyOtp,
};
