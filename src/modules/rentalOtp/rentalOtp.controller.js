const rentalOtpService = require("./rentalOtp.service");

/**
 * POST /api/rental-otp/send
 * Body: { userId }
 *
 * Bước 10: Hệ thống gửi mã OTP xác thực đặt thuê
 */
async function sendOtp(req, res, next) {
  try {
    const { userId, termsAcceptanceId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId là bắt buộc",
      });
    }

    const result = await rentalOtpService.sendOtp(userId, termsAcceptanceId);

    return res.status(201).json({
      success: true,
      message: "Đã gửi mã OTP xác thực",
      data: {
        otpId: result.otpId,
        expiresAt: result.expiresAt,
        sentTo: result.sentTo,
        // Demo only: trả OTP code để test trên Postman
        otpCode: result.otpCode,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/rental-otp/verify
 * Body: { otpId, otpCode, userId }
 *
 * Bước 11-12-13: Khách nhập OTP → Kiểm tra → Nếu hợp lệ → chuyển thanh toán
 */
async function verifyOtp(req, res, next) {
  try {
    const { otpId, otpCode, userId, termsAcceptanceId } = req.body;

    if (!otpId || !otpCode || !userId) {
      return res.status(400).json({
        success: false,
        message: "otpId, otpCode và userId là bắt buộc",
      });
    }

    if (!termsAcceptanceId) {
      return res.status(400).json({
        success: false,
        message: "termsAcceptanceId là bắt buộc",
      });
    }

    const result = await rentalOtpService.verifyOtp(otpId, otpCode, userId, termsAcceptanceId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          attemptsLeft: result.attemptsLeft,
        },
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: {
        otpId: result.otpId,
        verifiedAt: result.verifiedAt,
        otpVerificationToken: result.otpVerificationToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
};
