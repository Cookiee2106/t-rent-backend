const express = require("express");

const {
  layDanhSachNhanVien,
  layChiTietNhanVien,
  themNhanVien,
  capNhatNhanVien,
  capNhatTrangThaiNhanVien,
  xoaMemNhanVien,
} = require("./employeeController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroQuanTri = ["QUAN_TRI", "QUAN_TRI_VIEN"];

router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layDanhSachNhanVien
);

router.get(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layChiTietNhanVien
);

router.post(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  themNhanVien
);

router.put(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatNhanVien
);

router.put(
  "/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatTrangThaiNhanVien
);

router.delete(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  xoaMemNhanVien
);

module.exports = router;