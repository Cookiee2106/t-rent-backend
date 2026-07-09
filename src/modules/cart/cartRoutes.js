const express = require("express");
const xacThucDangNhap = require("../../middlewares/authMiddleware");
const {
  layGioHang,
  themVaoGioHang,
  capNhatSanPhamGioHang,
  xoaSanPhamGioHang,
  datHang,
} = require("./cartController");

const router = express.Router();

router.use(xacThucDangNhap);

router.get("/", layGioHang);
router.post("/items", themVaoGioHang);
router.patch("/items/:id", capNhatSanPhamGioHang);
router.delete("/items/:id", xoaSanPhamGioHang);
router.post("/checkout", datHang);

module.exports = router;