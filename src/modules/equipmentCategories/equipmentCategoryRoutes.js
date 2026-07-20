const express = require("express");

const {
  layDanhSachDanhMucThietBi,
  layDanhSachDanhMucHienThi,
  layDanhSachTinhChatDanhMucThietBi,
  taoDanhMucThietBi,
  capNhatDanhMucThietBi,
  capNhatTrangThaiDanhMucThietBi,
  xoaMemDanhMucThietBi,
} = require("./equipmentCategoryController");

const xacThucDangNhap = require("../../middlewares/authMiddleware");
const kiemTraVaiTro = require("../../middlewares/roleMiddleware");

const router = express.Router();

const vaiTroQuanTri = ["QUAN_TRI", "QUAN_TRI_VIEN"];
const vaiTroNoiBo = ["NHAN_VIEN", "QUAN_TRI", "QUAN_TRI_VIEN"];

router.get(
  "/options",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroNoiBo),
  layDanhSachDanhMucHienThi
);

router.get(
  "/type-options",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layDanhSachTinhChatDanhMucThietBi
);

router.get(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  layDanhSachDanhMucThietBi
);

router.post(
  "/",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  taoDanhMucThietBi
);

router.put(
  "/:id/status",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatTrangThaiDanhMucThietBi
);

router.put(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  capNhatDanhMucThietBi
);

router.delete(
  "/:id",
  xacThucDangNhap,
  kiemTraVaiTro(vaiTroQuanTri),
  xoaMemDanhMucThietBi
);

module.exports = router;