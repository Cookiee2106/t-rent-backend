const express = require("express");

const {
  layDanhSachHoSoXacMinh,
  layChiTietHoSoXacMinh,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
} = require("./adminController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

router.get(
  "/verifications",
  xacThucDangNhap,
  kiemTraVaiTro(["NHAN_VIEN", "QUAN_TRI_VIEN"]),
  layDanhSachHoSoXacMinh
);

router.get(
  "/verifications/:id",
  xacThucDangNhap,
  kiemTraVaiTro(["NHAN_VIEN", "QUAN_TRI_VIEN"]),
  layChiTietHoSoXacMinh
);

router.put(
  "/verifications/:id/approve",
  xacThucDangNhap,
  kiemTraVaiTro(["NHAN_VIEN", "QUAN_TRI_VIEN"]),
  duyetHoSoXacMinh
);

router.put(
  "/verifications/:id/reject",
  xacThucDangNhap,
  kiemTraVaiTro(["NHAN_VIEN", "QUAN_TRI_VIEN"]),
  tuChoiHoSoXacMinh
);

module.exports = router;