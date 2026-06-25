const asyncHandler = require("../../utils/asyncHandler");
const { successResponse, errorResponse } = require("../../utils/response");
const rentalOtpService = require("./rentalOtp.service");

/**
 * POST /api/rental-otp/send
 * Body: { nguoi_dung_id, xac_nhan_dieu_khoan_id }
 *
 * Bước 10: Hệ thống gửi mã OTP xác thực đặt thuê
 * Yêu cầu: customer đã accept terms
 */
const sendOtp = asyncHandler(async (req, res) => {
  const { nguoi_dung_id, xac_nhan_dieu_khoan_id } = req.body;

  if (!nguoi_dung_id) {
    return errorResponse(res, 400, "nguoi_dung_id là bắt buộc");
  }

  if (!xac_nhan_dieu_khoan_id) {
    return errorResponse(res, 400, "Vui lòng chấp nhận điều khoản thuê trước");
  }

  const result = await rentalOtpService.sendOtp(nguoi_dung_id, xac_nhan_dieu_khoan_id);

  return successResponse(res, 201, "Đã gửi mã OTP xác thực", {
    otp_id: result.otp_id,
    het_han_luc: result.het_han_luc,
    gui_den: result.gui_den,
    // Demo only: trả OTP code để test trên Postman
    ma_otp: result.ma_otp,
  });
});

/**
 * POST /api/rental-otp/verify
 * Body: { otp_id, ma_otp, nguoi_dung_id, xac_nhan_dieu_khoan_id }
 *
 * Bước 11-12-13: Khách nhập OTP → Kiểm tra → Nếu hợp lệ → trả ma_xac_thuc
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { otp_id, ma_otp, nguoi_dung_id, xac_nhan_dieu_khoan_id } = req.body;

  if (!otp_id || !ma_otp || !nguoi_dung_id) {
    return errorResponse(res, 400, "otp_id, ma_otp và nguoi_dung_id là bắt buộc");
  }

  const result = await rentalOtpService.verifyOtp(otp_id, ma_otp, nguoi_dung_id, xac_nhan_dieu_khoan_id);

  if (!result.success) {
    return errorResponse(res, 400, result.message, {
      so_lan_con_lai: result.so_lan_con_lai,
    });
  }

  return successResponse(res, 200, result.message, {
    otp_id: result.otp_id,
    ma_xac_thuc: result.ma_xac_thuc,
    xac_thuc_luc: result.xac_thuc_luc,
  });
});

module.exports = {
  sendOtp,
  verifyOtp,
};
