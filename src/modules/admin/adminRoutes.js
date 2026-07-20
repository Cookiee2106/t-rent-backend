const express = require("express");

const {
  layDanhSachKhachHang,
  layChiTietKhachHang,
  capNhatTrangThaiKhachHang,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
} = require("./adminController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.get(
  "/customers",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachKhachHang
);

router.get(
  "/customers/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietKhachHang
);

router.put(
  "/customers/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  capNhatTrangThaiKhachHang
);

router.put(
  "/verifications/:id/approve",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  duyetHoSoXacMinh
);

router.put(
  "/verifications/:id/reject",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  tuChoiHoSoXacMinh
);

module.exports = router;