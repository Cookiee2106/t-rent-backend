const express = require("express");

const {
  layDanhSachViTriKho,
  layDanhSachViTriKhoDangHienThi,
  taoViTriKho,
  capNhatViTriKho,
  capNhatTrangThaiViTriKho,
  xoaMemViTriKho,
} = require("./warehouseLocationController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroQuanTri = ["QUAN_TRI", "QUAN_TRI_VIEN"];
const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.get(
  "/options",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachViTriKhoDangHienThi
);

router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layDanhSachViTriKho
);

router.post(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  taoViTriKho
);

router.put(
  "/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatTrangThaiViTriKho
);

router.put(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatViTriKho
);

router.delete(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  xoaMemViTriKho
);

module.exports = router;