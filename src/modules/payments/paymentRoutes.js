const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const paymentController = require("./paymentController");

// ============================================================
// POST /api/payments/vnpay/create-payment-url
// Chỉ KHACH_HANG đã xác minh
// ============================================================
router.post(
  "/vnpay/create-payment-url",
  authMiddleware,
  roleMiddleware("KHACH_HANG"),
  paymentController.taoUrlThanhToan
);

// ============================================================
// GET /api/payments/vnpay/return
// Public - chỉ trả kết quả
// ============================================================
router.get("/vnpay/return", paymentController.xuLyTraVe);

// ============================================================
// GET /api/payments/vnpay/ipn
// Public - VNPAY gọi webhook
// ============================================================
router.get("/vnpay/ipn", paymentController.xuLyIpn);

// ============================================================
// GET /api/payments/vnpay/test-simulate-ipn
// Chỉ KHACH_HANG đã xác minh - test non-production
// ============================================================
router.get(
  "/vnpay/test-simulate-ipn",
  authMiddleware,
  roleMiddleware("KHACH_HANG"),
  paymentController.simulateIpnThanhCong
);

module.exports = router;
