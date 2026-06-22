const router = require("express").Router();
const rentalOtpController = require("./rentalOtp.controller");

// Bước 10: Gửi mã OTP xác thực đặt thuê
router.post("/send", rentalOtpController.sendOtp);

// Bước 11-12-13: Khách nhập OTP → Kiểm tra → Chuyển thanh toán
router.post("/verify", rentalOtpController.verifyOtp);

module.exports = router;
