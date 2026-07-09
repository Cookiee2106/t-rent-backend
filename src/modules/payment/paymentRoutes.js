const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const { layPhienThanhToan, xuLyWebhookThanhToan } = require("./paymentController");

const router = express.Router();

// GET /api/payment-sessions/:id — Khách hàng xem trạng thái phiên thanh toán
router.get("/payment-sessions/:id", xacThucDangNhap, layPhienThanhToan);

// POST /api/payment-webhooks — Cổng thanh toán gửi webhook (public)
router.post("/payment-webhooks", xuLyWebhookThanhToan);

module.exports = router;
