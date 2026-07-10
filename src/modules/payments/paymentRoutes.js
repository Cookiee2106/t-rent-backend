const express = require("express");

const {
  taoPhienThanhToanCoc,
  layTrangThaiPhienThanhToan,
  nhanReturnVnpay,
} = require("./paymentController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");

const router = express.Router();

// Tạo phiên thanh toán cọc.
// URL đầy đủ: POST /api/cart/checkout
router.post("/cart/checkout", xacThucDangNhap, taoPhienThanhToanCoc);

// Xem trạng thái phiên thanh toán.
// URL đầy đủ: GET /api/payment-sessions/:id
router.get(
  "/payment-sessions/:id",
  xacThucDangNhap,
  layTrangThaiPhienThanhToan
);

// Return URL VNPay.
// URL đầy đủ: GET /api/payment-return/vnpay
router.get("/payment-return/vnpay", nhanReturnVnpay);

module.exports = router;