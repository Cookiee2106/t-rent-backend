const express = require("express");

const {
  layDanhSachHangThietBi,
  layDanhSachHangDangHienThi,
  taoHangThietBi,
  capNhatHangThietBi,
  capNhatTrangThaiHangThietBi,
  xoaMemHangThietBi,
} = require("./equipmentBrandController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroQuanTri = ["QUAN_TRI", "QUAN_TRI_VIEN"];
const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

// Trang khác dùng API này để chọn hãng đang hiển thị
router.get(
  "/options",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachHangDangHienThi
);

// Quản lý hãng thiết bị: chỉ quản trị viên
router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layDanhSachHangThietBi
);

router.post(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  taoHangThietBi
);

router.put(
  "/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatTrangThaiHangThietBi
);

router.put(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatHangThietBi
);

router.delete(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  xoaMemHangThietBi
);

module.exports = router;