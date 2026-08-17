const express = require("express");
const {
  layDanhSachDonCuaToi,
  layChiTietDonCuaToi,
  xemHopDongCuaToi,
  guiYeuCauHuyDonCuaToi,
} = require("./customerOrderController");
const xacThucDangNhap = require("../../middlewares/authMiddleware");

const router = express.Router();

router.get("/", xacThucDangNhap, layDanhSachDonCuaToi);

// Xem/in hợp đồng PDF của chính khách hàng đang đăng nhập.
router.get("/:id/contract", xacThucDangNhap, xemHopDongCuaToi);

router.post("/:id/cancel-request", xacThucDangNhap, guiYeuCauHuyDonCuaToi);
router.get("/:id", xacThucDangNhap, layChiTietDonCuaToi);

module.exports = router;
