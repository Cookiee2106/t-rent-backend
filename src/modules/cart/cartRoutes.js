const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const {
  layGioHang,
  themVaoGioHang,
  capNhatSanPhamGioHang,
  xoaSanPhamGioHang,
} = require("./cartController");
// Dùng handler thanh toán VNPay từ develop (payments module)
const { taoPhienThanhToanCoc } = require("../payments/paymentController");

const router = express.Router();

router.use(xacThucDangNhap);

router.get("/", layGioHang);
router.post("/items", themVaoGioHang);
router.patch("/items/:id", capNhatSanPhamGioHang);
router.delete("/items/:id", xoaSanPhamGioHang);
// POST /api/cart/checkout → dùng VNPay từ develop, không dùng mock URL
router.post("/checkout", taoPhienThanhToanCoc);

module.exports = router;

