const prisma = require("../../utils/prisma");
const bcrypt = require("bcryptjs");
const { sendOtpEmail } = require("./rentalOtp.email");

const OTP_LENGTH = 6;
const OTP_EXPIRES_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 5;

function generateOtpCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code.padStart(OTP_LENGTH, "0");
}

async function sendOtp(nguoi_dung_id, xac_nhan_dieu_khoan_id, purpose = "DAT_THUE") {
  if (!xac_nhan_dieu_khoan_id) {
    throw Object.assign(new Error("Vui lòng chấp nhận điều khoản thuê trước"), { statusCode: 400 });
  }

  const [profile] = await prisma.$queryRaw`
    SELECT id, nguoi_dung_id, trang_thai_xac_minh
    FROM ho_so_khach_hang
    WHERE nguoi_dung_id = ${nguoi_dung_id}
  `;

  if (!profile) {
    throw Object.assign(new Error("Không tìm thấy hồ sơ khách hàng"), { statusCode: 404 });
  }

  const [termsAcceptance] = await prisma.$queryRaw`
    SELECT id, don_thue_id
    FROM xac_nhan_dieu_khoan
    WHERE id = ${xac_nhan_dieu_khoan_id}
      AND khach_hang_id = ${profile.id}
  `;

  if (!termsAcceptance) {
    throw Object.assign(new Error("Xác nhận điều khoản không hợp lệ"), { statusCode: 400 });
  }

  if (termsAcceptance.don_thue_id) {
    throw Object.assign(new Error("Điều khoản này đã được sử dụng cho đơn thuê khác"), { statusCode: 400 });
  }

  const [user] = await prisma.$queryRaw`
    SELECT email, ho_ten
    FROM nguoi_dung
    WHERE id = ${nguoi_dung_id}
  `;

  if (!user) {
    throw Object.assign(new Error("Không tìm thấy người dùng"), { statusCode: 404 });
  }

  await prisma.$executeRaw`
    UPDATE xac_thuc_otp
    SET trang_thai = 'THAT_BAI'
    WHERE nguoi_dung_id = ${nguoi_dung_id}
      AND muc_dich = ${purpose}
      AND trang_thai = 'CHO_XAC_THUC'
  `;

  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  const [otpRecord] = await prisma.$queryRaw`
    INSERT INTO xac_thuc_otp (id, nguoi_dung_id, xac_nhan_dieu_khoan_id, otp_hash, muc_dich, trang_thai, het_han_luc, so_lan_sai, created_at)
    VALUES (gen_random_uuid(), ${nguoi_dung_id}, ${xac_nhan_dieu_khoan_id}, ${otpHash}, ${purpose}, 'CHO_XAC_THUC', ${expiresAt}, 0, NOW())
    RETURNING id
  `;

  console.log("========================================");
  console.log(`[OTP] Mã OTP cho user ${nguoi_dung_id}: ${otpCode}`);
  console.log(`[OTP] Hết hạn lúc: ${expiresAt.toISOString()}`);
  console.log(`[OTP] TermsAcceptanceId: ${xac_nhan_dieu_khoan_id}`);
  console.log("========================================");

  try {
    await sendOtpEmail(user.email, otpCode, OTP_EXPIRES_MINUTES);
    console.log(`[OTP]  Đã gửi email OTP đến ${user.email}`);
  } catch (emailError) {
    console.error(`[OTP]  Gửi email thất bại:`, emailError.message);
  }

  return {
    otp_id: otpRecord.id,
    het_han_luc: expiresAt,
    gui_den: user.email,
    ma_otp: otpCode,
  };
}

async function verifyOtp(otpId, otpCode, nguoi_dung_id, xac_nhan_dieu_khoan_id) {
  const [otpRecord] = await prisma.$queryRaw`
    SELECT id, nguoi_dung_id, otp_hash, trang_thai, het_han_luc, so_lan_sai
    FROM xac_thuc_otp
    WHERE id = ${otpId}
  `;

  if (!otpRecord) {
    return { success: false, message: "Mã OTP không tồn tại" };
  }

  if (otpRecord.nguoi_dung_id !== nguoi_dung_id) {
    return { success: false, message: "Mã OTP không hợp lệ" };
  }

  if (otpRecord.trang_thai !== "CHO_XAC_THUC") {
    return {
      success: false,
      message: `Mã OTP đã ${otpRecord.trang_thai === "DA_XAC_THUC" ? "được sử dụng" : "hết hiệu lực"}`,
    };
  }

  if (new Date() > new Date(otpRecord.het_han_luc)) {
    await prisma.$executeRaw`
      UPDATE xac_thuc_otp SET trang_thai = 'HET_HAN' WHERE id = ${otpId}
    `;
    return { success: false, message: "Mã OTP đã hết hạn" };
  }

  if (otpRecord.so_lan_sai >= MAX_FAILED_ATTEMPTS) {
    await prisma.$executeRaw`
      UPDATE xac_thuc_otp SET trang_thai = 'THAT_BAI' WHERE id = ${otpId}
    `;
    return {
      success: false,
      message: "Mã OTP đã bị khóa do nhập sai quá nhiều lần",
    };
  }

  const isMatch = await bcrypt.compare(otpCode, otpRecord.otp_hash);

  if (!isMatch) {
    const [updated] = await prisma.$queryRaw`
      UPDATE xac_thuc_otp SET so_lan_sai = so_lan_sai + 1 WHERE id = ${otpId}
      RETURNING so_lan_sai
    `;

    const so_lan_con_lai = MAX_FAILED_ATTEMPTS - updated.so_lan_sai;
    return {
      success: false,
      message: `Mã OTP không đúng. Còn ${so_lan_con_lai} lần thử`,
      so_lan_con_lai,
    };
  }

  await prisma.$executeRaw`
    UPDATE xac_thuc_otp
    SET trang_thai = 'DA_XAC_THUC', xac_thuc_luc = NOW()
    WHERE id = ${otpId}
  `;

  console.log("========================================");
  console.log(`[OTP]  XÁC THỰC THÀNH CÔNG cho user ${nguoi_dung_id}`);
  console.log(`[OTP] OTP ID: ${otpId}`);
  console.log(`[OTP] Chuyển sang bước thanh toán cọc giữ chỗ...`);
  console.log("========================================");

  return {
    success: true,
    message: "Xác thực OTP thành công. Chuyển sang bước thanh toán cọc.",
    otp_id: otpId,
    ma_xac_thuc: otpCode,
    xac_thuc_luc: new Date(),
  };
}

async function verifyOtpToken(otpId) {
  const [otpRecord] = await prisma.$queryRaw`
    SELECT id, xac_thuc_luc, trang_thai
    FROM xac_thuc_otp
    WHERE id = ${otpId}
  `;

  if (!otpRecord) {
    return { valid: false, message: "OTP không tồn tại" };
  }

  if (otpRecord.trang_thai !== "DA_XAC_THUC") {
    return { valid: false, message: "OTP chưa được xác thực" };
  }

  const tokenExpiry = new Date(otpRecord.xac_thuc_luc.getTime() + 5 * 60 * 1000);
  if (new Date() > tokenExpiry) {
    return { valid: false, message: "OTP đã hết hạn" };
  }

  return { valid: true, otpId: otpRecord.id };
}

module.exports = {
  sendOtp,
  verifyOtp,
  verifyOtpToken,
};
