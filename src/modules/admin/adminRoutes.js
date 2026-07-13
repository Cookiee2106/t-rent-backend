const express = require("express");
const {
  layDanhSachHoSoXacMinh,
  layChiTietHoSoXacMinh,
  duyetHoSoXacMinh,
  tuChoiHoSoXacMinh,
  layDanhSachKhachHang,
  layChiTietKhachHang,

  // KHÓA / MỞ KHÓA TÀI KHOẢN
  // capNhatTrangThaiKhachHang,

  // XEM LỊCH SỬ HỒ SƠ XÁC MINH
  // layLichSuHoSoXacMinh,
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

router.get(
  "/verifications",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachHoSoXacMinh
);

router.get(
  "/verifications/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layChiTietHoSoXacMinh
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

/*
  XEM LỊCH SỬ HỒ SƠ XÁC MINH
*/

/*
router.get(
  "/customers/:id/verification-history",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layLichSuHoSoXacMinh
);
*/

/*
  KHÓA / MỞ KHÓA TÀI KHOẢN KHÁCH HÀNG
*/

/*
router.put(
  "/customers/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  capNhatTrangThaiKhachHang
);
*/

module.exports = router;