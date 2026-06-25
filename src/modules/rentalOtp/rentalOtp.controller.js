const rentalOtpService = require("./rentalOtp.service");

/**
 * POST /api/rental-otp/send
 * Body: { nguoi_dung_id, xac_nhan_dieu_khoan_id }
 *
 * Bước 10: Hệ thống gửi mã OTP xác thực đặt thuê
 * Yêu cầu: customer đã accept terms
 */
async function sendOtp(req, res, next) {
  try {
    const { nguoi_dung_id, xac_nhan_dieu_khoan_id } = req.body;

    if (!nguoi_dung_id) {
      return res.status(400).json({
        success: false,
        message: "nguoi_dung_id là bắt buộc",
      });
    }

    if (!xac_nhan_dieu_khoan_id) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chấp nhận điều khoản thuê trước",
      });
    }

    const result = await rentalOtpService.sendOtp(nguoi_dung_id, xac_nhan_dieu_khoan_id);

    return res.status(201).json({
      success: true,
      message: "Đã gửi mã OTP xác thực",
      data: {
        otp_id: result.otp_id,
        het_han_luc: result.het_han_luc,
        gui_den: result.gui_den,
        // Demo only: trả OTP code để test trên Postman
        ma_otp: result.ma_otp,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/rental-otp/verify
 * Body: { otp_id, ma_otp, nguoi_dung_id, xac_nhan_dieu_khoan_id }
 *
 * Bước 11-12-13: Khách nhập OTP → Kiểm tra → Nếu hợp lệ → trả ma_xac_thuc
 */
async function verifyOtp(req, res, next) {
  try {
    const { otp_id, ma_otp, nguoi_dung_id, xac_nhan_dieu_khoan_id } = req.body;

    if (!otp_id || !ma_otp || !nguoi_dung_id) {
      return res.status(400).json({
        success: false,
        message: "otp_id, ma_otp và nguoi_dung_id là bắt buộc",
      });
    }

    const result = await rentalOtpService.verifyOtp(otp_id, ma_otp, nguoi_dung_id, xac_nhan_dieu_khoan_id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          so_lan_con_lai: result.so_lan_con_lai,
        },
      });
    }

    return res.json({
      success: true,
      message: result.message,
      data: {
        otp_id: result.otp_id,
        ma_xac_thuc: result.ma_xac_thuc,
        xac_thuc_luc: result.xac_thuc_luc,
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
