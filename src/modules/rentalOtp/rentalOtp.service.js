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

/**
 * Tạo OTP verification token ngẫu nhiên
 */
function generateOtpVerificationToken() {
  return crypto.randomUUID();
}

// ============================================================
// Service Functions
// ============================================================

/**
 * BƯỚC 10: Gửi mã OTP xác thực đặt thuê
 * - Yêu cầu: customer đã accept terms trước đó
 * - Kiểm tra termsAcceptanceId hợp lệ
 * - Tạo OTP, hash và lưu vào bảng otp_verifications
 * - Trả về OTP plain text (demo: show console)
 */
async function sendOtp(userId, termsAcceptanceId, purpose = "CREATE_ORDER") {
  // ===== BẮT BUỘC: Kiểm tra termsAcceptanceId =====
  if (!termsAcceptanceId) {
    throw Object.assign(new Error("Vui lòng chấp nhận điều khoản thuê trước"), { statusCode: 400 });
  }

  // Lấy customer profile từ userId
  const profile = await prisma.customer_profiles.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    throw Object.assign(new Error("Không tìm thấy hồ sơ khách hàng"), { statusCode: 404 });
  }

  // Kiểm tra termsAcceptance tồn tại và thuộc về customer này
  const termsAcceptance = await prisma.term_acceptances.findFirst({
    where: {
      id: termsAcceptanceId,
      customer_id: profile.id,
    },
  });

  if (!termsAcceptance) {
    throw Object.assign(new Error("Xác nhận điều khoản không hợp lệ"), { statusCode: 400 });
  }

  // Kiểm tra termsAcceptance chưa được gắn với rental_order nào
  if (termsAcceptance.rental_order_id) {
    throw Object.assign(new Error("Điều khoản này đã được sử dụng cho đơn thuê khác"), { statusCode: 400 });
  }

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
  console.log(`[OTP] TermsAcceptanceId: ${termsAcceptanceId}`);
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
 * - Nếu hợp lệ → cập nhật status VERIFIED và trả về otpVerificationToken
 */
async function verifyOtp(otpId, otpCode, userId, termsAcceptanceId) {
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

  // Tạo otpVerificationToken để dùng cho checkout session
  const otpVerificationToken = generateOtpVerificationToken();

  // ===== DEMO: Log thành công ra console =====
  console.log("========================================");
  console.log(`[OTP] ✅ XÁC THỰC THÀNH CÔNG cho user ${userId}`);
  console.log(`[OTP] OTP ID: ${otpId}`);
  console.log(`[OTP] Verification Token: ${otpVerificationToken}`);
  console.log(`[OTP] Chuyển sang bước thanh toán cọc giữ chỗ...`);
  console.log("========================================");

  return {
    success: true,
    message: "Xác thực OTP thành công. Chuyển sang bước thanh toán cọc.",
    otpId,
    otpVerificationToken,
    verifiedAt: new Date(),
    otpVerificationToken: verificationToken,
  };
}

/**
 * Verify otpVerificationToken (dùng trong checkout session)
 * Kiểm tra token có hợp lệ không
 */
async function verifyOtpToken(otpVerificationToken) {
  // Tìm OTP record gần nhất với token này
  // (Token được lưu trong bộ nhớ tạm - cần cải thiện sau)
  // Hiện tại: verify bằng cách check OTP đã VERIFIED gần nhất

  const recentOtp = await prisma.otp_verifications.findFirst({
    where: {
      user_id: arguments[1], // userId
      status: "VERIFIED",
    },
    orderBy: {
      verified_at: "desc",
    },
  });

  if (!recentOtp) {
    return { valid: false, message: "OTP token không hợp lệ" };
  }

  // Kiểm tra OTP chưa quá hạn (5 phút kể từ lúc verify)
  const tokenExpiry = new Date(recentOtp.verified_at.getTime() + 5 * 60 * 1000);
  if (new Date() > tokenExpiry) {
    return { valid: false, message: "OTP token đã hết hạn" };
  }

  return { valid: true, otpId: recentOtp.id };
}

module.exports = {
  sendOtp,
  verifyOtp,
  verifyOtpToken,
};
