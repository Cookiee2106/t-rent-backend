const express = require("express");
const {
  taoPhienThanhToanCoc,
  layTrangThaiPhienThanhToan,
  nhanReturnVnpay,
} = require("./paymentController");
const xacThucDangNhap = require("../../middlewares/authMiddleware");

const router = express.Router();

// Tạo phiên thanh toán cọc từ giỏ hàng.
// URL đầy đủ nếu paymentRoutes mount ở /api: POST /api/cart/checkout
router.post("/cart/checkout", xacThucDangNhap, taoPhienThanhToanCoc);

// Xem trạng thái phiên thanh toán.
// URL đầy đủ nếu paymentRoutes mount ở /api: GET /api/payment-sessions/:id
router.get(
  "/payment-sessions/:id",
  xacThucDangNhap,
  layTrangThaiPhienThanhToan
);

// VNPay redirect về đây sau khi thanh toán.
// URL đầy đủ nếu paymentRoutes mount ở /api: GET /api/payment-return/vnpay
router.get("/payment-return/vnpay", nhanReturnVnpay);

module.exports = router;
