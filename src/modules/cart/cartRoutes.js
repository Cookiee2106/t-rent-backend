const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const {
  layGioHang,
  themVaoGioHang,
  capNhatSanPhamGioHang,
  xoaSanPhamGioHang,
} = require("./cartController");
const {
  layXacNhanThue,
  taoPhienThanhToanCoc,
} = require("../payments/paymentController");

const router = express.Router();

router.use(xacThucDangNhap);

router.get("/", layGioHang);
router.post("/items", themVaoGioHang);
router.put("/items/:id", capNhatSanPhamGioHang);
router.patch("/items/:id", capNhatSanPhamGioHang);
router.delete("/items/:id", xoaSanPhamGioHang);
router.post("/checkout/preview", layXacNhanThue);
router.post("/checkout", taoPhienThanhToanCoc);

module.exports = router;
